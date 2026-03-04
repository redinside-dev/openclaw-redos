/**
 * Tool Call Interceptor — wraps message/write tool calls with validation + normalization
 *
 * OpenClaw-native only. Schema validation for message and write tools.
 * Exec enforcement is handled by OpenClaw sandbox (sandbox.mode) and
 * tools.deny in openclaw.json — not by custom middleware.
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
  validateToolPaths,
  getWorkspaceRoot,
} = require('./tool-schema-compat.cjs');

const PATH_VALIDATED_TOOLS = [
  'read',
  'write',
  'edit',
  'exec',
  'image',
  'pdf',
  'message',
  'browser',
  'canvas',
  'nodes',
];

function resolveValidationOptions(options = {}) {
  return {
    ...options,
    workspaceRoot: getWorkspaceRoot(options),
  };
}

/**
 * Intercept and validate message tool call
 * Throws if validation fails; returns normalized args if valid
 */
function interceptMessage(args, options = {}) {
  const validatedOpts = resolveValidationOptions(options);
  const normalized = normalizeMessageArgs(args);
  const error = validateMessageArgs(normalized, validatedOpts);

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
function interceptWrite(args, options = {}) {
  const validatedOpts = resolveValidationOptions(options);
  const normalized = normalizeWriteArgs(args);
  const error = validateWriteArgs(normalized, validatedOpts);

  if (error) {
    throw new Error(`[Tool Validation] write: ${error}`);
  }

  console.log(`[Tool Interceptor] write validated: path=${normalized.path}, content_length=${normalized.content.length}`);
  return normalized;
}

/**
 * Intercept generic tool path fields where applicable.
 */
function interceptGenericToolPath(toolName, args = {}, options = {}) {
  const validatedOpts = resolveValidationOptions(options);
  const pathError = validateToolPaths(toolName, args, validatedOpts);
  if (pathError) {
    throw new Error(`[Tool Validation] ${toolName}: ${pathError}`);
  }
  return args;
}

/**
 * Batch intercept multiple tool calls (for agent responses with multiple tools)
 * Now includes workspace path validation for all path-bearing tools.
 */
function interceptToolCalls(toolCalls = [], agentId = 'unknown', options = {}) {
  return toolCalls.map(call => {
    if (!call || !call.tool) return call;

    if (call.tool === 'message') {
      return { ...call, args: interceptMessage(call.args, options) };
    }

    if (call.tool === 'write') {
      return { ...call, args: interceptWrite(call.args, options) };
    }

    if (PATH_VALIDATED_TOOLS.includes(call.tool)) {
      return { ...call, args: interceptGenericToolPath(call.tool, call.args || {}, options) };
    }

    return call;
  });
}

module.exports = {
  interceptMessage,
  interceptWrite,
  interceptGenericToolPath,
  interceptToolCalls,
};
