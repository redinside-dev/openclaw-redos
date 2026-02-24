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
 * Batch intercept multiple tool calls (for agent responses with multiple tools)
 */
function interceptToolCalls(toolCalls = []) {
  return toolCalls.map(call => {
    if (call.tool === 'message') {
      return { ...call, args: interceptMessage(call.args) };
    } else if (call.tool === 'write') {
      return { ...call, args: interceptWrite(call.args) };
    }
    return call; // pass through other tools
  });
}

module.exports = {
  interceptMessage,
  interceptWrite,
  interceptToolCalls,
};
