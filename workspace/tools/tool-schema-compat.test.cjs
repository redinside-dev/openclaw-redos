const assert = require('assert');

const {
  normalizeMessageArgs,
  validateMessageArgs,
  normalizeWriteArgs,
  validateWriteArgs,
} = require('./tool-schema-compat.cjs');

// message
{
  const a = normalizeMessageArgs({ action: 'sendMessage', to: 'channel:C0ABCDEF', channel: 'slack', message: 'hi' });
  assert.strictEqual(a.action, 'send');
  assert.strictEqual(a.target, 'channel:C0ABCDEF');
  assert.strictEqual(validateMessageArgs(a), null);
}

{
  const a = normalizeMessageArgs({ action: 'send', target: 'telegram:12345', message: 'hi' });
  assert.strictEqual(a.channel, 'telegram');
  assert.strictEqual(a.target, '12345');
  assert.strictEqual(validateMessageArgs(a), null);
}

{
  const a = normalizeMessageArgs({ action: 'send', channel: 'slack', target: 'C0ABCDEF', message: 'hi' });
  assert.strictEqual(a.target, 'channel:C0ABCDEF');
  assert.strictEqual(validateMessageArgs(a), null);
}

{
  const a = normalizeMessageArgs({ action: 'send', message: 'hi', target: 'channel:C0ABCDEF' });
  assert.ok(validateMessageArgs(a)); // missing channel
}

// write
{
  const a = normalizeWriteArgs({ filePath: '/tmp/x.txt', text: 'hello' });
  assert.strictEqual(a.path, '/tmp/x.txt');
  assert.strictEqual(a.content, 'hello');
  assert.strictEqual(validateWriteArgs(a), null);
}

console.log('tool-schema-compat tests passed');
