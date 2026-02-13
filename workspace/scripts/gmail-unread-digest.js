#!/usr/bin/env node
/**
 * Gmail Unread Digest - Sends Telegram summary of new unread emails
 * State: /Users/redinside/.openclaw/workspace/tmp/gmail-unread-digest.json
 */

const fs = require('fs');
const { execSync } = require('child_process');

const STATE_FILE = '/Users/redinside/.openclaw/workspace/tmp/gmail-unread-digest.json';
const ACCOUNT = 'anorag.saxena@gmail.com';
const TELEGRAM_USER_ID = '1012034994';

// Load state
let state = { seenThreadIds: [] };
try {
  if (fs.existsSync(STATE_FILE)) {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
} catch (e) {
  console.error('Error loading state:', e.message);
}

// Fetch unread threads
let threads = [];
try {
  const result = execSync(
    `gog gmail search "in:inbox is:unread" --account ${ACCOUNT} --json --max 15`,
    { encoding: 'utf8', maxBuffer: 1024 * 1024 }
  );
  threads = JSON.parse(result);
} catch (e) {
  console.error('Error fetching Gmail:', e.message);
  process.exit(1);
}

if (!Array.isArray(threads) || threads.length === 0) {
  console.log('No unread threads found.');
  process.exit(0);
}

// Find new threads (not in seenThreadIds)
const currentIds = threads.map(t => t.id);
const newThreads = threads.filter(t => !state.seenThreadIds.includes(t.id));

console.log(`Found ${threads.length} unread threads, ${newThreads.length} new.`);

// If no new threads, just update state and exit
if (newThreads.length === 0) {
  // Still update state to track current threads
  state.seenThreadIds = [...new Set([...state.seenThreadIds, ...currentIds])];
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log('No new threads to report.');
  process.exit(0);
}

// Build message
const now = new Date().toLocaleString('en-US', { 
  weekday: 'short', 
  month: 'short', 
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

let message = `📧 **Unread Gmail** (since last check)\n_${now}_\n\n`;

const displayThreads = newThreads.slice(0, 8);
displayThreads.forEach((t, i) => {
  const date = t.lastMessageDate 
    ? new Date(t.lastMessageDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'unknown date';
  const from = t.lastMessageFrom || 'Unknown';
  const subject = t.subject || '(no subject)';
  
  // Clean up sender (remove email if present)
  const cleanFrom = from.replace(/<[^>]+>/g, '').trim() || from;
  
  message += `${i + 1}. **${cleanFrom}**\n   _${subject}_\n   ${date}\n\n`;
});

if (newThreads.length > 8) {
  message += `_(+${newThreads.length - 8} more)_\n\n`;
}

// Send via Telegram using OpenClaw messaging
const sendCmd = `message action=send target="${TELEGRAM_USER_ID}" message="${message.replace(/"/g, '\\"')}" channel=telegram`;
console.log('Sending Telegram message...');

// We'll use the OpenClaw internal message system via a different approach
// Since we're in a script, we need to output the message for the cron handler
console.log('---TELEGRAM_MESSAGE---');
console.log(message);
console.log('---END_MESSAGE---');

// Update state with all current thread IDs
state.seenThreadIds = [...new Set([...state.seenThreadIds, ...currentIds])];
fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

console.log(`State updated. Tracked ${state.seenThreadIds.length} thread IDs.`);
