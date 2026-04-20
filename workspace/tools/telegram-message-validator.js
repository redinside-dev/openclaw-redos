/**
 * Telegram Message Validator
 * Validates and chunks messages to comply with Telegram API limits
 * - Text message limit: 4096 characters
 * - Edit message limit: 4096 characters
 */

const TELEGRAM_TEXT_LIMIT = 4096;
const TRUNCATION_SUFFIX = '…';

/**
 * Validate a message for Telegram
 * @param {string} message - The message text
 * @param {string} action - 'send' or 'edit' (both have same limit)
 * @returns {object} { valid: boolean, message: string, truncated: boolean, originalLength: number }
 */
function validateMessage(message, action = 'send') {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Message must be a non-empty string', originalLength: 0 };
  }

  const originalLength = message.length;
  const valid = originalLength <= TELEGRAM_TEXT_LIMIT;

  if (valid) {
    return { valid: true, message, truncated: false, originalLength };
  }

  // Message exceeds limit — truncate
  const maxLength = TELEGRAM_TEXT_LIMIT - TRUNCATION_SUFFIX.length;
  const truncated = message.substring(0, maxLength) + TRUNCATION_SUFFIX;

  return {
    valid: true,
    message: truncated,
    truncated: true,
    originalLength,
    truncatedLength: truncated.length,
    charsRemoved: originalLength - truncated.length
  };
}

/**
 * Chunk a large message into multiple Telegram-safe messages
 * @param {string} message - The message text
 * @param {number} chunkSize - Characters per chunk (default: 4000 to leave room for context)
 * @returns {array} Array of message chunks
 */
function chunkMessage(message, chunkSize = 4000) {
  if (!message || typeof message !== 'string') {
    return [];
  }

  if (message.length <= TELEGRAM_TEXT_LIMIT) {
    return [message];
  }

  const chunks = [];
  let remaining = message;

  while (remaining.length > 0) {
    const chunk = remaining.substring(0, chunkSize);
    chunks.push(chunk);
    remaining = remaining.substring(chunkSize);
  }

  return chunks;
}

/**
 * Format a message for Telegram edit with size warning
 * @param {string} message - The message text
 * @returns {object} { message: string, warning: string|null, action: 'send'|'truncate'|'chunk' }
 */
function formatForEdit(message) {
  const validation = validateMessage(message, 'edit');

  if (!validation.valid) {
    return { message: null, warning: validation.error, action: 'error' };
  }

  if (!validation.truncated) {
    return { message: validation.message, warning: null, action: 'send' };
  }

  // Message was truncated
  return {
    message: validation.message,
    warning: `Message truncated from ${validation.originalLength} to ${validation.truncatedLength} chars (Telegram limit: ${TELEGRAM_TEXT_LIMIT})`,
    action: 'truncate',
    originalLength: validation.originalLength
  };
}

export {
  TELEGRAM_TEXT_LIMIT,
  validateMessage,
  chunkMessage,
  formatForEdit
};
