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
} = require('./tool-schema-compat.cjs');

/**
 * Main entry point: validate and normalize a tool call
 * @param {string} toolName - 'message' or 'write'
 * @param {Object} args - tool arguments
 * @returns {Object} - validated/normalized args
 * @throws {Error} - if validation fails
 */
function validateAndNormalize(toolName, args = {}) {
  if (toolName === 'message') {
    const normalized = normalizeMessageArgs(args);
    const error = validateMessageArgs(normalized);
    if (error) throw new Error(`message validation failed: ${error}`);
    return normalized;
  } else if (toolName === 'write') {
    const normalized = normalizeWriteArgs(args);
    const error = validateWriteArgs(normalized);
    if (error) throw new Error(`write validation failed: ${error}`);
    return normalized;
  } else {
    throw new Error(`unknown tool: ${toolName}`);
  }
}

/**
 * Convenience: validate message tool call
 */
function message(args) {
  return validateAndNormalize('message', args);
}

/**
 * Convenience: validate write tool call
 */
function write(args) {
  return validateAndNormalize('write', args);
}

module.exports = {
  validateAndNormalize,
  message,
  write,
};
