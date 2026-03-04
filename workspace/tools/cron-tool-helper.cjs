#!/usr/bin/env node
/**
 * Cron Helper: Tool Call Validator
 *
 * Source this in cron job payloads to validate tool calls before execution.
 *
 * Usage in cron job message:
 *   const toolHelper = require('/Users/redinside/.openclaw/workspace/tools/cron-tool-helper.cjs');
 *
 *   // Before calling message tool:
 *   const safeArgs = toolHelper.validateAndNormalize('message', {
 *     action: 'sendMessage',
 *     to: 'telegram:123',
 *     message: 'hello'
 *   });
 *
 *   // Now use safeArgs in your tool call
 */

const {
  normalizeMessageArgs,
  validateMessageArgs,
  normalizeWriteArgs,
  validateWriteArgs,
  validateToolPaths,
  getWorkspaceRoot,
} = require('./tool-schema-compat.cjs');

/**
 * Main entry point: validate and normalize a tool call
 * @param {string} toolName - tool name
 * @param {Object} args - tool arguments
 * @param {Object} options - { workspaceRoot }
 * @returns {Object} - validated/normalized args
 * @throws {Error} - if validation fails
 */
function validateAndNormalize(toolName, args = {}, options = {}) {
  const validatedOptions = {
    ...options,
    workspaceRoot: getWorkspaceRoot(options),
  };

  if (toolName === 'message') {
    const normalized = normalizeMessageArgs(args);
    const error = validateMessageArgs(normalized, validatedOptions);
    if (error) throw new Error(`message validation failed: ${error}`);
    return normalized;
  } else if (toolName === 'write') {
    const normalized = normalizeWriteArgs(args);
    const error = validateWriteArgs(normalized, validatedOptions);
    if (error) throw new Error(`write validation failed: ${error}`);
    return normalized;
  }

  const pathError = validateToolPaths(toolName, args, validatedOptions);
  if (pathError) throw new Error(`${toolName} validation failed: ${pathError}`);
  return args;
}

/**
 * Convenience: validate message tool call
 */
function message(args, options = {}) {
  return validateAndNormalize('message', args, options);
}

/**
 * Convenience: validate write tool call
 */
function write(args, options = {}) {
  return validateAndNormalize('write', args, options);
}

module.exports = {
  validateAndNormalize,
  message,
  write,
};
