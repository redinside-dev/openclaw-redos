/**
 * Tool schema compat/validator helpers.
 *
 * Goal: reduce recurring tool-call failures caused by prompt/template drift.
 *
 * This module does NOT intercept OpenClaw runtime tool calls automatically.
 * It is meant to be imported by gateway/cron scripts or agent-side wrappers
 * that construct tool call payloads.
 */

const KNOWN_CHANNELS = new Set(['telegram', 'slack', 'signal', 'whatsapp', 'discord', 'irc', 'googlechat', 'imessage']);

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
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

function validateMessageArgs(args = {}) {
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

function validateWriteArgs(args = {}) {
  if (!isNonEmptyString(args.path)) return 'write.path is required';
  if (typeof args.content !== 'string') return 'write.content is required and must be a string';
  return null;
}

module.exports = {
  normalizeMessageArgs,
  validateMessageArgs,
  normalizeWriteArgs,
  validateWriteArgs,
};
