#!/usr/bin/env node
// magnus-helper — prototype echo MCP server
//
// Single tool: magnus_helper_ping. Returns environment diagnostics
// (hostname, working directory, plugin root, platform, node version)
// so we can confirm a plugin-shipped stdio MCP is reachable from a
// Claude Cowork session and runs on the user's Mac (not the sandbox VM).
//
// Implements the minimum MCP protocol over stdio: initialize, tools/list,
// tools/call. No external dependencies — uses Node built-ins only.

const os = require('os');
const readline = require('readline');

const SERVER_INFO = { name: 'magnus-helper', version: '0.1.0-prototype' };
const FALLBACK_PROTOCOL_VERSION = '2025-06-18';

const TOOLS = [
  {
    name: 'magnus_helper_ping',
    description:
      'Echo from the magnus-helper local MCP. Returns environment diagnostics ' +
      '(hostname, working directory, plugin root, platform, node version). ' +
      'Use this to confirm the helper is reachable from the current Claude ' +
      'session — including from Cowork — and that it runs on the user\'s ' +
      'machine, not in a remote sandbox.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

function send(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

function reply(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function errorReply(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

function handlePing() {
  const diagnostics = {
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
  };
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(diagnostics, null, 2),
      },
    ],
  };
}

const rl = readline.createInterface({ input: process.stdin });

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let request;
  try {
    request = JSON.parse(trimmed);
  } catch {
    return;
  }

  const { id, method, params } = request;

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

    case 'tools/call':
      try {
        if (params?.name === 'magnus_helper_ping') {
          reply(id, handlePing());
        } else {
          errorReply(id, -32602, `Unknown tool: ${params?.name}`);
        }
      } catch (err) {
        errorReply(id, -32603, `Tool execution failed: ${err.message}`);
      }
      break;

    case 'ping':
      reply(id, {});
      break;

    default:
      if (id !== undefined) {
        errorReply(id, -32601, `Method not found: ${method}`);
      }
  }
});

rl.on('close', () => {
  process.exit(0);
});
