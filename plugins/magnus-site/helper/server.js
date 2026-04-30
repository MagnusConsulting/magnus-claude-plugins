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
//
// Implements the minimum MCP protocol (initialize, tools/list,
// tools/call) over stdio. No external dependencies.

const os = require('os');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, exec, execSync } = require('child_process');
const readline = require('readline');

const SERVER_INFO = { name: 'magnus-helper', version: '0.7.0' };
const FALLBACK_PROTOCOL_VERSION = '2025-06-18';
const PORT = 4321;
const CONFIG_DIR = path.join(os.homedir(), '.config', 'magnus-helper');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const SCAN_ROOTS = ['dev', 'Documents', 'Sites', 'Projects', 'Code', 'Developer']
  .map((d) => path.join(os.homedir(), d));
const MAX_SCAN_DEPTH = 2;
const READY_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 500;

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
  const candidates = scanForRepos();
  if (candidates.length === 1) {
    saveConfig({ ...cfg, repoPath: candidates[0] });
    return { path: candidates[0] };
  }
  if (candidates.length === 0) {
    return {
      error: 'REPO_NOT_FOUND',
      message:
        'No magnus repo found in ~/dev, ~/Documents, ~/Sites, ~/Projects, ~/Code, ~/Developer (2 levels deep). ' +
        'Ask the user for the absolute path and call magnus_set_repo_path with it.',
    };
  }
  return {
    error: 'AMBIGUOUS_REPO',
    candidates,
    message:
      `Multiple magnus repos found (${candidates.length}). ` +
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
