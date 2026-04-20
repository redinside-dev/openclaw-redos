/**
 * Tool schema compat/validator helpers.
 *
 * Goal: reduce recurring tool-call failures caused by prompt/template drift.
 *
 * This module does NOT intercept OpenClaw runtime tool calls automatically.
 * It is meant to be imported by gateway/cron scripts or agent-side wrappers
 * that construct tool call payloads.
 */

const path = require('path');

const KNOWN_CHANNELS = new Set(['telegram', 'slack', 'signal', 'whatsapp', 'discord', 'irc', 'googlechat', 'imessage']);

const TOOL_PATH_FIELDS = {
  // Core filesystem tools
  read: [{ key: 'path' }, { key: 'file_path' }],
  write: [{ key: 'path' }, { key: 'filePath' }, { key: 'file_path' }],
  edit: [{ key: 'path' }, { key: 'file_path' }],
  exec: [{ key: 'workdir' }],

  // Content/media tools (allow URLs; local paths must remain in-workspace)
  image: [{ key: 'image' }, { key: 'images', array: true }],
  pdf: [{ key: 'pdf' }, { key: 'pdfs', array: true }],

  // Messaging/file attachment paths
  message: [
    { key: 'path' },
    { key: 'filePath' },
    { key: 'file_path' },
    { key: 'media' },
  ],

  // Browser/canvas/node tools with local file args
  browser: [{ key: 'paths', array: true }],
  canvas: [{ key: 'jsonlPath' }],
  nodes: [{ key: 'cwd' }, { key: 'outPath' }],
};

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function getWorkspaceRoot(options = {}) {
  const configured = options.workspaceRoot
    || process.env.OPENCLAW_WORKSPACE_ROOT
    || process.env.OPENCLAW_WORKSPACE_DIR
    || process.env.OPENCLAW_WORKSPACE
    || path.join(process.env.HOME || '', '.openclaw', 'workspace');

  return path.resolve(configured);
}

function isPathLike(v) {
  if (!isNonEmptyString(v)) return false;
  const s = v.trim();

  // URLs / data payloads are not local filesystem paths.
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(s) && !s.startsWith('file://')) return false;
  if (s.startsWith('data:')) return false;

  return true;
}

function normalizePathInput(v) {
  const s = String(v).trim();
  if (s.startsWith('file://')) {
    try {
      return decodeURIComponent(new URL(s).pathname || '');
    } catch {
      return s.replace(/^file:\/\//, '');
    }
  }
  return s;
}

function isPathInside(rootDir, candidatePath) {
  const root = path.resolve(rootDir);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function checkPathViolation(toolName, field, rawValue, workspaceRoot) {
  if (!isPathLike(rawValue)) return null;

  const normalized = normalizePathInput(rawValue);

  if (normalized.includes('\u0000')) {
    return {
      tool: toolName,
      field,
      attempted: rawValue,
      workspaceRoot,
      reason: 'path contains NUL byte',
    };
  }

  const resolved = path.isAbsolute(normalized)
    ? path.resolve(normalized)
    : path.resolve(workspaceRoot, normalized);

  if (!isPathInside(workspaceRoot, resolved)) {
    return {
      tool: toolName,
      field,
      attempted: rawValue,
      resolved,
      workspaceRoot,
      reason: 'Path escapes workspace root',
    };
  }

  return null;
}

function findToolPathViolations(toolName, args = {}, options = {}) {
  const fields = TOOL_PATH_FIELDS[toolName] || [];
  if (!fields.length) return [];

  const workspaceRoot = getWorkspaceRoot(options);
  const violations = [];

  for (const f of fields) {
    const value = args?.[f.key];

    if (f.array) {
      if (!Array.isArray(value)) continue;
      value.forEach((entry, idx) => {
        const violation = checkPathViolation(toolName, `${f.key}[${idx}]`, entry, workspaceRoot);
        if (violation) violations.push(violation);
      });
      continue;
    }

    const violation = checkPathViolation(toolName, f.key, value, workspaceRoot);
    if (violation) violations.push(violation);
  }

  return violations;
}

function logPathViolations(toolName, violations = [], options = {}) {
  const context = {
    agentId: options.agentId,
    source: options.source,
    jobId: options.jobId,
    sessionId: options.sessionId,
  };

  for (const v of violations) {
    console.warn('[Tool Validation] Path violation blocked:', JSON.stringify({
      tool: toolName,
      field: v.field,
      attempted: v.attempted,
      resolved: v.resolved,
      workspaceRoot: v.workspaceRoot,
      reason: v.reason,
      ...context,
    }));
  }
}

function validateToolPaths(toolName, args = {}, options = {}) {
  const violations = findToolPathViolations(toolName, args, options);
  if (violations.length === 0) return null;

  logPathViolations(toolName, violations, options);
  const first = violations[0];
  return `${first.reason}: ${first.attempted}`;
}

function normalizeMessageArgs(args = {}) {
  const out = { ...args };

  if (out.action === 'sendMessage') out.action = 'send';

  if (!out.target && out.to) {
    out.target = out.to;
    delete out.to;
  }

  if (!out.channel && isNonEmptyString(out.target)) {
    const m = out.target.match(/^([a-zA-Z]+):(.*)$/);
    if (m && KNOWN_CHANNELS.has(m[1].toLowerCase())) {
      out.channel = m[1].toLowerCase();
      out.target = m[2];
    }
  }

  if (out.channel === 'slack' && isNonEmptyString(out.target)) {
    if (/^C[0-9A-Z]{6,}$/.test(out.target)) {
      out.target = `channel:${out.target}`;
    }
  }

  return out;
}

function validateMessageArgs(args = {}, options = {}) {
  if (!isNonEmptyString(args.action)) return 'message.action is required';
  if (args.action !== 'send') return `message.action must be 'send' (got ${args.action})`;

  if (!isNonEmptyString(args.channel)) {
    return 'message.channel is required when multiple channels are configured';
  }
  if (!KNOWN_CHANNELS.has(args.channel)) {
    return `message.channel must be one of: ${Array.from(KNOWN_CHANNELS).join(', ')} (got ${args.channel})`;
  }

  if (!isNonEmptyString(args.target)) return 'message.target is required';
  if (!isNonEmptyString(args.message)) return 'message.message is required';

  if (args.channel === 'slack') {
    const ok = /^(channel:|user:)/.test(args.target) || /^C[0-9A-Z]{6,}$/.test(args.target);
    if (!ok) return `slack target must look like channel:<id> or user:<id> (got ${args.target})`;
  }

  const pathError = validateToolPaths('message', args, options);
  if (pathError) return pathError;

  return null;
}

function normalizeWriteArgs(args = {}) {
  const out = { ...args };

  if (!out.path && out.filePath) {
    out.path = out.filePath;
    delete out.filePath;
  }

  if (!out.content && out.text) {
    out.content = out.text;
    delete out.text;
  }

  return out;
}

function validateWriteArgs(args = {}, options = {}) {
  if (!isNonEmptyString(args.path)) return 'write.path is required';
  if (typeof args.content !== 'string') return 'write.content is required and must be a string';

  const pathError = validateToolPaths('write', args, options);
  if (pathError) return pathError;

  return null;
}

module.exports = {
  normalizeMessageArgs,
  validateMessageArgs,
  normalizeWriteArgs,
  validateWriteArgs,
  validateToolPaths,
  findToolPathViolations,
  getWorkspaceRoot,
};
