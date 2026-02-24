/**
 * Gateway Tool Call Middleware
 * 
 * Hooks into the gateway's tool-call execution path to validate/normalize
 * message and write tool calls before they reach the actual tool handlers.
 * 
 * This middleware covers:
 * - Cron job tool calls
 * - Embedded agent tool calls
 * - Interactive session tool calls
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const { interceptMessage, interceptWrite, interceptToolCalls } = require(join(__dirname, '../workspace/tools/tool-call-interceptor.cjs'));

export class ToolCallMiddleware {
  /**
   * Process a tool call before execution
   * @param {Object} toolCall - { tool, args, ... }
   * @returns {Object} - validated/normalized toolCall
   */
  static processToolCall(toolCall) {
    if (!toolCall || !toolCall.tool) {
      return toolCall;
    }

    try {
      if (toolCall.tool === 'message') {
        const normalized = interceptMessage(toolCall.args || {});
        return { ...toolCall, args: normalized };
      } else if (toolCall.tool === 'write') {
        const normalized = interceptWrite(toolCall.args || {});
        return { ...toolCall, args: normalized };
      }
    } catch (error) {
      console.error(`[ToolCallMiddleware] Validation failed for ${toolCall.tool}:`, error.message);
      // Re-throw so the error is visible in logs and can be tracked
      throw error;
    }

    return toolCall;
  }

  /**
   * Process multiple tool calls (batch)
   * @param {Array} toolCalls - array of tool calls
   * @returns {Array} - validated/normalized tool calls
   */
  static processToolCalls(toolCalls = []) {
    return toolCalls.map(call => this.processToolCall(call));
  }

  /**
   * Middleware wrapper for agent response processing
   * Call this right before the gateway executes tool calls from an agent response
   */
  static wrapAgentResponse(response) {
    if (!response || !response.toolCalls || !Array.isArray(response.toolCalls)) {
      return response;
    }

    try {
      const validatedToolCalls = this.processToolCalls(response.toolCalls);
      return { ...response, toolCalls: validatedToolCalls };
    } catch (error) {
      console.error('[ToolCallMiddleware] Failed to validate agent response tool calls:', error.message);
      // Return response with error annotation so it's visible
      return {
        ...response,
        validationError: error.message,
        toolCalls: [] // Clear tool calls to prevent execution of invalid calls
      };
    }
  }
}

export default ToolCallMiddleware;
