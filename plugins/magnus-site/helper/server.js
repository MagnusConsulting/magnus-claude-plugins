#!/usr/bin/env node
// magnus-helper — local MCP server bridging Claude (incl. Cowork) to
// the user's Mac. Exposes tools to start/stop the magnus Astro dev
// server and open URLs in the user's default browser.
//
// Tools:
//   magnus_helper_ping     — diagnostics (host, platform, plugin root)
//   magnus_dev_status      — { running, port, pid, repoPath }
//   magnus_dev_start       — spawn npm run dev, poll until ready
//   magnus_dev_stop        — kill whatever owns port 4321
//   magnus_open_url        — open localhost:4321 URL in default browser
//   magnus_set_repo_path   — persist absolute path to magnus repo
//   magnus_save_asset      — write a base64-encoded file into public/<category>/
//
// Implements the minimum MCP protocol (initialize, tools/list,
// tools/call) over stdio. No external dependencies.

const os = require('os');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, exec, execSync } = require('child_process');
const readline = require('readline');

const SERVER_INFO = { name: 'magnus-helper', version: '0.8.0' };
const FALLBACK_PROTOCOL_VERSION = '2025-06-18';
const PORT = 4321;
const CONFIG_DIR = path.join(os.homedir(), '.config', 'magnus-helper');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const SCAN_ROOTS = ['dev', 'Documents', 'Sites', 'Projects', 'Code', 'Developer']
  .map((d) => path.join(os.homedir(), d));
const CANONICAL_REPO_PATH = path.join(os.homedir(), 'Projects', 'Claude', 'magnus-website');
const MAX_SCAN_DEPTH = 2;
const READY_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 500;

// Allowed asset categories — maps to public/<category>/ directories.
// Each entry: { allowed: [extensions], maxBytes: size cap }.
const ASSET_CATEGORIES = {
  team:    { allowed: ['jpg', 'jpeg', 'png', 'webp'], maxBytes:  5 * 1024 * 1024 },
  logos:   { allowed: ['svg', 'png', 'webp'],          maxBytes:  1 * 1024 * 1024 },
  reports: { allowed: ['pdf'],                          maxBytes: 25 * 1024 * 1024 },
  images:  { allowed: ['jpg', 'jpeg', 'png', 'webp'],  maxBytes:  5 * 1024 * 1024 },
  icons:   { allowed: ['svg'],                          maxBytes: 500 * 1024 },
  og:      { allowed: ['jpg', 'jpeg', 'png'],           maxBytes:  5 * 1024 * 1024 },
};

// ─── config persistence ────────────────────────────────────────────

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveConfig(cfg) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

// ─── repo discovery ────────────────────────────────────────────────

function isMagnusRepo(p) {
  try {
    if (!fs.statSync(path.join(p, 'docs', 'llm-context.md')).isFile()) return false;
    if (!fs.statSync(path.join(p, 'src', 'pages')).isDirectory()) return false;
    const pkg = JSON.parse(fs.readFileSync(path.join(p, 'package.json'), 'utf8'));
    return !!(pkg.dependencies?.astro || pkg.devDependencies?.astro);
  } catch {
    return false;
  }
}

function walk(dir, depth, found) {
  if (depth > MAX_SCAN_DEPTH || found.length >= 10) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const sub = path.join(dir, e.name);
    if (isMagnusRepo(sub)) {
      found.push(sub);
    } else {
      walk(sub, depth + 1, found);
    }
  }
}

function scanForRepos() {
  const found = [];
  for (const root of SCAN_ROOTS) {
    if (!fs.existsSync(root)) continue;
    walk(root, 0, found);
  }
  return found;
}

function resolveRepoPath() {
  const cfg = loadConfig();
  if (cfg.repoPath && isMagnusRepo(cfg.repoPath)) {
    return { path: cfg.repoPath };
  }
  // Prefer the canonical install path if it's a valid magnus repo, even if
  // older clones exist elsewhere. The quick-start docs ask every user to
  // install here, so it's the right default when nothing is configured.
  if (isMagnusRepo(CANONICAL_REPO_PATH)) {
    saveConfig({ ...cfg, repoPath: CANONICAL_REPO_PATH });
    return { path: CANONICAL_REPO_PATH };
  }
  const candidates = scanForRepos();
  if (candidates.length === 1) {
    saveConfig({ ...cfg, repoPath: candidates[0] });
    return { path: candidates[0] };
  }
  if (candidates.length === 0) {
    return {
      error: 'REPO_NOT_FOUND',
      message:
        `No magnus repo found at ${CANONICAL_REPO_PATH} or in ~/dev, ~/Documents, ~/Sites, ~/Projects, ~/Code, ~/Developer (2 levels deep). ` +
        'Ask the user for the absolute path and call magnus_set_repo_path with it.',
    };
  }
  return {
    error: 'AMBIGUOUS_REPO',
    candidates,
    message:
      `Multiple magnus repos found (${candidates.length}) and none at the canonical path ${CANONICAL_REPO_PATH}. ` +
      'Ask the user which one to use and call magnus_set_repo_path with the chosen path.',
  };
}

// ─── port / process helpers ────────────────────────────────────────

function isPortInUse(port) {
  return new Promise((resolve) => {
    const req = http.request(
      { host: 'localhost', port, method: 'HEAD', timeout: 500 },
      (res) => {
        res.destroy();
        resolve(true);
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

function getPidOnPort(port) {
  try {
    const out = execSync(`lsof -ti:${port}`, { encoding: 'utf8' }).trim();
    return out ? parseInt(out.split('\n')[0], 10) : null;
  } catch {
    return null;
  }
}

function killPort(port) {
  try {
    execSync(`lsof -ti:${port} | xargs kill 2>/dev/null`);
    return true;
  } catch {
    return false;
  }
}

async function waitForServer(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortInUse(port)) return true;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return false;
}

// ─── dev server lifecycle ──────────────────────────────────────────

let trackedPid = null;

function spawnDevServer(repoPath) {
  const proc = spawn('npm', ['run', 'dev'], {
    cwd: repoPath,
    detached: true,
    stdio: 'ignore',
  });
  proc.unref();
  trackedPid = proc.pid;
  return proc;
}

// ─── url opening ───────────────────────────────────────────────────

function openUrl(url) {
  let cmd;
  switch (process.platform) {
    case 'darwin':
      cmd = `open "${url}"`;
      break;
    case 'win32':
      cmd = `start "" "${url}"`;
      break;
    default:
      cmd = `xdg-open "${url}"`;
      break;
  }
  return new Promise((resolve, reject) => {
    exec(cmd, (err) => (err ? reject(err) : resolve()));
  });
}

// ─── tool definitions ──────────────────────────────────────────────

const TOOLS = [
  {
    name: 'magnus_helper_ping',
    description:
      'Diagnostics from the magnus-helper local MCP — hostname, platform, ' +
      'plugin root, working directory, node version. Use to confirm the helper ' +
      'is reachable from the current Claude session and runs on the user\'s machine.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'magnus_dev_status',
    description:
      'Check whether the magnus Astro dev server is running on localhost:4321. ' +
      'Returns { running, port, pid, repoPath }. Cheap, idempotent — call before ' +
      'magnus_dev_start to avoid redundant work, or to decide whether to navigate ' +
      'an existing server with magnus_open_url.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'magnus_dev_start',
    description:
      'Start the magnus Astro dev server (npm run dev) in the background on the ' +
      'user\'s Mac. Idempotent — returns alreadyRunning:true if a server is already ' +
      'on port 4321. Polls until the server responds (up to 30s) before returning. ' +
      'On first run resolves the magnus repo path by scanning common locations and ' +
      'persisting the result; if zero or multiple matches, returns REPO_NOT_FOUND ' +
      'or AMBIGUOUS_REPO so the caller can ask the user and call magnus_set_repo_path.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'magnus_dev_stop',
    description:
      'Stop whatever is listening on localhost:4321 (sends TERM via lsof + kill). ' +
      'No-op if nothing is running. Returns { stopped, message }.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'magnus_open_url',
    description:
      'Open a localhost:4321 URL in the user\'s default browser via the OS open ' +
      'command (open / xdg-open / start). Refuses URLs that don\'t start with ' +
      'http://localhost:4321 — this MCP is not a general-purpose browser opener.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Full URL — must start with http://localhost:4321',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'magnus_set_repo_path',
    description:
      'Persist the absolute path to the magnus repo on the user\'s machine. Use ' +
      'when magnus_dev_start returns AMBIGUOUS_REPO (pick one of the candidates) ' +
      'or REPO_NOT_FOUND (ask the user). Path must contain docs/llm-context.md, ' +
      'src/pages/, and a package.json with astro.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute filesystem path' },
      },
      required: ['path'],
    },
  },
  {
    name: 'magnus_validate',
    description:
      'Run the magnus repo\'s production build (and astro check if available) on ' +
      'the user\'s Mac, where the native binaries actually work. Use as the pre-flight ' +
      'gate before magnus-publish commits. Required for Cowork — Cowork\'s sandbox is ' +
      'Linux ARM64 and can\'t execute Mac-installed node_modules native binaries ' +
      '(rollup, sharp, etc.), so `npm run build` from inside Cowork always fails. This ' +
      'tool runs the same commands on the Mac via the local helper. Returns ' +
      '{ build: { status, output }, astroCheck: { status, output } }. status is "ok" / ' +
      '"failed" / "skipped" (astroCheck skipped if @astrojs/check isn\'t installed). ' +
      'Build timeout 180s; check timeout 120s.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'magnus_save_asset',
    description:
      'Write a base64-encoded file into public/<category>/<filename> on the magnus ' +
      'repo, on the user\'s Mac. Use when an admin attaches a file in chat (image, ' +
      'logo, PDF) — Claude reads the attachment as base64 and passes it here. ' +
      'Validates filename format (kebab-case + extension), category (team / logos / ' +
      'reports / images / icons / og), file extension against the category\'s allowed ' +
      'list, and size against per-category caps. Refuses to overwrite existing files ' +
      'unless replace:true. Creates the public/<category>/ directory if missing. ' +
      'Returns { saved, path, publicPath, bytes, replaced } on success or a typed ' +
      'error code (INVALID_FILENAME / INVALID_CATEGORY / TYPE_MISMATCH / TOO_LARGE / ' +
      'INVALID_BASE64 / ALREADY_EXISTS / WRITE_FAILED / REPO_NOT_FOUND / AMBIGUOUS_REPO).',
    inputSchema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'Kebab-case filename with extension (e.g. "teresa-allan.jpg").',
        },
        contentBase64: {
          type: 'string',
          description: 'File contents, base64-encoded. Don\'t include data: prefixes.',
        },
        category: {
          type: 'string',
          enum: ['team', 'logos', 'reports', 'images', 'icons', 'og'],
          description: 'Maps to public/<category>/. team for headshots, logos for ' +
            'client logos, reports for PDFs, images for hero/feature images, ' +
            'icons for inline SVGs, og for social cards.',
        },
        replace: {
          type: 'boolean',
          description: 'If true, overwrite an existing file at the same path. Default false.',
        },
      },
      required: ['filename', 'contentBase64', 'category'],
    },
  },
];

// ─── tool handlers ─────────────────────────────────────────────────

function textResult(obj) {
  return {
    content: [
      {
        type: 'text',
        text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2),
      },
    ],
  };
}

function handlePing() {
  return textResult({
    message: 'hello from magnus-helper',
    hostname: os.hostname(),
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    cwd: process.cwd(),
    pluginRoot: process.env.CLAUDE_PLUGIN_ROOT || '(CLAUDE_PLUGIN_ROOT not set)',
    user: os.userInfo().username,
    homedir: os.homedir(),
    timestamp: new Date().toISOString(),
  });
}

async function handleStatus() {
  const cfg = loadConfig();
  const running = await isPortInUse(PORT);
  const pid = running ? getPidOnPort(PORT) : null;
  return textResult({
    running,
    port: PORT,
    pid,
    repoPath: cfg.repoPath || null,
  });
}

async function handleStart() {
  if (await isPortInUse(PORT)) {
    return textResult({
      alreadyRunning: true,
      port: PORT,
      pid: getPidOnPort(PORT),
      message: 'Dev server already running on port 4321',
    });
  }

  const resolved = resolveRepoPath();
  if (resolved.error) {
    return textResult(resolved);
  }

  spawnDevServer(resolved.path);
  const ready = await waitForServer(PORT, READY_TIMEOUT_MS);

  if (!ready) {
    return textResult({
      error: 'STARTUP_TIMEOUT',
      message:
        `Dev server did not respond on port ${PORT} within ${READY_TIMEOUT_MS / 1000}s. ` +
        'Common causes: missing dependencies (run npm install in the magnus repo), ' +
        'port collision, or a build error in astro.config.mjs.',
      repoPath: resolved.path,
    });
  }

  return textResult({
    started: true,
    port: PORT,
    pid: getPidOnPort(PORT),
    repoPath: resolved.path,
    message: `Dev server started in ${resolved.path}`,
  });
}

async function handleStop() {
  if (!(await isPortInUse(PORT))) {
    return textResult({
      stopped: false,
      message: 'No server running on port 4321',
    });
  }
  const killed = killPort(PORT);
  trackedPid = null;
  return textResult({
    stopped: killed,
    message: killed ? 'Killed dev server on port 4321' : 'Failed to kill dev server',
  });
}

async function handleOpenUrl(args) {
  const { url } = args || {};
  if (typeof url !== 'string' || !/^http:\/\/localhost:4321(\/|$)/.test(url)) {
    return textResult({
      error: 'INVALID_URL',
      message: `URL must start with http://localhost:4321 — got ${JSON.stringify(url)}`,
    });
  }
  try {
    await openUrl(url);
    return textResult({ opened: true, url });
  } catch (err) {
    return textResult({ error: 'OPEN_FAILED', message: err.message });
  }
}

function handleSetRepoPath(args) {
  const { path: p } = args || {};
  if (typeof p !== 'string' || !path.isAbsolute(p)) {
    return textResult({
      error: 'INVALID_PATH',
      message: `Path must be an absolute filesystem path — got ${JSON.stringify(p)}`,
    });
  }
  if (!isMagnusRepo(p)) {
    return textResult({
      error: 'NOT_MAGNUS_REPO',
      message:
        `Path ${p} doesn't contain the expected magnus markers ` +
        '(docs/llm-context.md, src/pages/, package.json with astro).',
    });
  }
  const cfg = loadConfig();
  saveConfig({ ...cfg, repoPath: p });
  return textResult({ saved: true, repoPath: p });
}

function handleValidate() {
  const resolved = resolveRepoPath();
  if (resolved.error) return textResult(resolved);

  const tail = (s, n) => (s || '').toString().split('\n').slice(-n).join('\n');
  const result = { repoPath: resolved.path, build: null, astroCheck: null };

  // astro check — skip cleanly if @astrojs/check isn't installed
  const hasAstroCheck = fs.existsSync(
    path.join(resolved.path, 'node_modules', '@astrojs', 'check'),
  );
  if (!hasAstroCheck) {
    result.astroCheck = {
      status: 'skipped',
      message:
        '@astrojs/check not installed. Run `npm install -D @astrojs/check typescript` ' +
        'in the magnus repo to enable type-checking in this gate.',
    };
  } else {
    try {
      const out = execSync('npx astro check 2>&1', {
        cwd: resolved.path,
        encoding: 'utf8',
        timeout: 120000,
      });
      result.astroCheck = { status: 'ok', output: tail(out, 15) };
    } catch (err) {
      result.astroCheck = {
        status: 'failed',
        output: tail(err.stdout, 25) || err.message,
      };
    }
  }

  // npm run build — always required
  try {
    const out = execSync('npm run build 2>&1', {
      cwd: resolved.path,
      encoding: 'utf8',
      timeout: 180000,
    });
    result.build = { status: 'ok', output: tail(out, 10) };
  } catch (err) {
    result.build = {
      status: 'failed',
      output: tail(err.stdout, 25) || err.message,
    };
  }

  const allOk =
    result.build.status === 'ok' &&
    (result.astroCheck.status === 'ok' || result.astroCheck.status === 'skipped');

  return textResult({ ...result, passed: allOk });
}

function handleSaveAsset(args) {
  const { filename, contentBase64, category, replace = false } = args || {};

  // Validate filename
  if (typeof filename !== 'string' || !filename) {
    return textResult({
      error: 'INVALID_FILENAME',
      message: 'filename must be a non-empty string.',
    });
  }
  if (!/^[a-z0-9][a-z0-9-]*\.[a-z0-9]+$/i.test(filename)) {
    return textResult({
      error: 'INVALID_FILENAME',
      message:
        'filename must be kebab-case with a single extension ' +
        `(e.g. "teresa-allan.jpg") — got ${JSON.stringify(filename)}.`,
    });
  }

  // Validate category
  const cat = ASSET_CATEGORIES[category];
  if (!cat) {
    return textResult({
      error: 'INVALID_CATEGORY',
      message:
        `category must be one of: ${Object.keys(ASSET_CATEGORIES).join(', ')}. ` +
        `Got ${JSON.stringify(category)}.`,
    });
  }

  // Validate extension matches category
  const ext = filename.split('.').pop().toLowerCase();
  if (!cat.allowed.includes(ext)) {
    return textResult({
      error: 'TYPE_MISMATCH',
      message:
        `Files in '${category}' must be one of: ${cat.allowed.join(', ')}. ` +
        `Got .${ext}.`,
    });
  }

  // Decode base64
  if (typeof contentBase64 !== 'string' || !contentBase64.length) {
    return textResult({
      error: 'INVALID_BASE64',
      message: 'contentBase64 must be a non-empty base64 string.',
    });
  }
  let buffer;
  try {
    buffer = Buffer.from(contentBase64, 'base64');
  } catch (err) {
    return textResult({
      error: 'INVALID_BASE64',
      message: `Failed to decode base64 content: ${err.message}`,
    });
  }
  if (!buffer.length) {
    return textResult({
      error: 'INVALID_BASE64',
      message: 'Decoded content is empty — base64 string was likely malformed.',
    });
  }

  // Size check
  if (buffer.length > cat.maxBytes) {
    return textResult({
      error: 'TOO_LARGE',
      message:
        `File is ${(buffer.length / 1024 / 1024).toFixed(2)}MB — limit for ` +
        `'${category}' is ${(cat.maxBytes / 1024 / 1024).toFixed(0)}MB. ` +
        'Compress (Squoosh, ImageOptim) and retry.',
      bytes: buffer.length,
      maxBytes: cat.maxBytes,
    });
  }

  // Resolve repo path
  const resolved = resolveRepoPath();
  if (resolved.error) {
    return textResult(resolved);
  }

  // Build target path
  const targetDir = path.join(resolved.path, 'public', category);
  const targetPath = path.join(targetDir, filename);
  const fileExisted = fs.existsSync(targetPath);

  if (fileExisted && !replace) {
    return textResult({
      error: 'ALREADY_EXISTS',
      message:
        `${targetPath} already exists. Pass replace:true to overwrite, or pick ` +
        'a different filename.',
      path: targetPath,
    });
  }

  // Ensure directory exists
  try {
    fs.mkdirSync(targetDir, { recursive: true });
  } catch (err) {
    return textResult({
      error: 'WRITE_FAILED',
      message: `Failed to create directory ${targetDir}: ${err.message}`,
    });
  }

  // Write the file
  try {
    fs.writeFileSync(targetPath, buffer);
  } catch (err) {
    return textResult({
      error: 'WRITE_FAILED',
      message: `Failed to write file: ${err.message}`,
    });
  }

  // Verify
  const stat = fs.statSync(targetPath);

  return textResult({
    saved: true,
    path: targetPath,
    publicPath: `/${category}/${filename}`,
    bytes: stat.size,
    category,
    replaced: fileExisted,
  });
}

// ─── protocol ──────────────────────────────────────────────────────

function send(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

function reply(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function errorReply(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

const rl = readline.createInterface({ input: process.stdin });

let pendingOps = 0;
let closing = false;

function maybeExit() {
  if (closing && pendingOps === 0) process.exit(0);
}

rl.on('line', async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let request;
  try {
    request = JSON.parse(trimmed);
  } catch {
    return;
  }

  const { id, method, params } = request;
  pendingOps++;

  try {
    switch (method) {
      case 'initialize':
        reply(id, {
          protocolVersion: params?.protocolVersion || FALLBACK_PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        });
        break;

      case 'notifications/initialized':
        break;

      case 'tools/list':
        reply(id, { tools: TOOLS });
        break;

      case 'tools/call': {
        const name = params?.name;
        const args = params?.arguments || {};
        let result;
        switch (name) {
          case 'magnus_helper_ping': result = handlePing(); break;
          case 'magnus_dev_status': result = await handleStatus(); break;
          case 'magnus_dev_start': result = await handleStart(); break;
          case 'magnus_dev_stop': result = await handleStop(); break;
          case 'magnus_open_url': result = await handleOpenUrl(args); break;
          case 'magnus_set_repo_path': result = handleSetRepoPath(args); break;
          case 'magnus_save_asset': result = handleSaveAsset(args); break;
          case 'magnus_validate': result = handleValidate(); break;
          default:
            errorReply(id, -32602, `Unknown tool: ${name}`);
            return;
        }
        reply(id, result);
        break;
      }

      case 'ping':
        reply(id, {});
        break;

      default:
        if (id !== undefined) {
          errorReply(id, -32601, `Method not found: ${method}`);
        }
    }
  } catch (err) {
    if (id !== undefined) {
      errorReply(id, -32603, `Server error: ${err.message}`);
    }
  } finally {
    pendingOps--;
    maybeExit();
  }
});

rl.on('close', () => {
  closing = true;
  maybeExit();
});
