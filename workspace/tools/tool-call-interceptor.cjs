/**
 * Tool Call Interceptor — wraps message/write tool calls with validation + normalization
 * 
 * Usage in agent prompts/cron jobs:
 *   const toolInterceptor = require('./tool-call-interceptor.cjs');
 *   const safeArgs = toolInterceptor.interceptMessage({ action: 'sendMessage', to: 'telegram:123', message: 'hi' });
 *   // Now call message tool with safeArgs
 */

const {
  normalizeMessageArgs,
  validateMessageArgs,
  normalizeWriteArgs,
  validateWriteArgs,
} = require('./tool-schema-compat.cjs');

const { classify, enforce, auditEntry } = require('../skills/policy-gate/policy-gate.cjs');
const fs = require('fs');
const path = require('path');

const AUDIT_LOG = path.join(process.env.HOME || '~', '.openclaw/workspace/logs/audit.jsonl');

function appendAudit(entry) {
  try {
    fs.mkdirSync(path.dirname(AUDIT_LOG), { recursive: true });
    fs.appendFileSync(AUDIT_LOG, entry + '\n');
  } catch {}
}

/**
 * Intercept and validate message tool call
 * Throws if validation fails; returns normalized args if valid
 */
function interceptMessage(args) {
  const normalized = normalizeMessageArgs(args);
  const error = validateMessageArgs(normalized);
  
  if (error) {
    throw new Error(`[Tool Validation] message: ${error}`);
  }
  
  console.log(`[Tool Interceptor] message validated: action=${normalized.action}, channel=${normalized.channel}, target=${normalized.target}`);
  return normalized;
}

/**
 * Intercept and validate write tool call
 * Throws if validation fails; returns normalized args if valid
 */
function interceptWrite(args) {
  const normalized = normalizeWriteArgs(args);
  const error = validateWriteArgs(normalized);
  
  if (error) {
    throw new Error(`[Tool Validation] write: ${error}`);
  }
  
  console.log(`[Tool Interceptor] write validated: path=${normalized.path}, content_length=${normalized.content.length}`);
  return normalized;
}

/**
 * Intercept exec tool call — classify into L0-L5 tier and enforce.
 * Returns { tier, action, decision } for the caller to act on.
 * Throws on HARD_DENY.
 */
function interceptExec(command, agentId) {
  if (!command || !agentId) {
    throw new Error('[Tool Validation] exec: command and agentId are required');
  }

  const params = { command };
  const tier = classify('exec', params, agentId);
  const decision = enforce(tier, { agentId, tool: 'exec' });
  const entry = auditEntry('exec', params, agentId, tier, decision);
  appendAudit(entry);

  console.log(`[Tool Interceptor] exec tier=L${tier} action=${decision.action} agent=${agentId} cmd="${command}"`);

  if (decision.action === 'HARD_DENY') {
    throw new Error(`[Policy Gate] HARD_DENY: ${decision.reason} — command blocked: ${command}`);
  }

  return { tier, action: decision.action, decision };
}

/**
 * Batch intercept multiple tool calls (for agent responses with multiple tools)
 */
function interceptToolCalls(toolCalls = [], agentId = 'unknown') {
  return toolCalls.map(call => {
    if (call.tool === 'message') {
      return { ...call, args: interceptMessage(call.args) };
    } else if (call.tool === 'write') {
      return { ...call, args: interceptWrite(call.args) };
    } else if (call.tool === 'exec') {
      const cmd = call.args?.command || call.args?.cmd || '';
      const result = interceptExec(cmd, agentId);
      return { ...call, _policyGate: result };
    }
    return call;
  });
}

module.exports = {
  interceptMessage,
  interceptWrite,
  interceptExec,
  interceptToolCalls,
};
