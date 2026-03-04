const assert = require('assert');

const {
  normalizeMessageArgs,
  validateMessageArgs,
  normalizeWriteArgs,
  validateWriteArgs,
  validateToolPaths,
  getWorkspaceRoot,
} = require('./tool-schema-compat.cjs');

const TEST_WORKSPACE = '/tmp/openclaw-test-workspace';

// message
{
  const a = normalizeMessageArgs({ action: 'sendMessage', to: 'channel:C0ABCDEF', channel: 'slack', message: 'hi' });
  assert.strictEqual(a.action, 'send');
  assert.strictEqual(a.target, 'channel:C0ABCDEF');
  assert.strictEqual(validateMessageArgs(a, { workspaceRoot: TEST_WORKSPACE }), null);
}

{
  const a = normalizeMessageArgs({ action: 'send', target: 'telegram:12345', message: 'hi' });
  assert.strictEqual(a.channel, 'telegram');
  assert.strictEqual(a.target, '12345');
  assert.strictEqual(validateMessageArgs(a, { workspaceRoot: TEST_WORKSPACE }), null);
}

{
  const a = normalizeMessageArgs({ action: 'send', channel: 'slack', target: 'C0ABCDEF', message: 'hi' });
  assert.strictEqual(a.target, 'channel:C0ABCDEF');
  assert.strictEqual(validateMessageArgs(a, { workspaceRoot: TEST_WORKSPACE }), null);
}

{
  const a = normalizeMessageArgs({ action: 'send', message: 'hi', target: 'channel:C0ABCDEF' });
  assert.ok(validateMessageArgs(a, { workspaceRoot: TEST_WORKSPACE })); // missing channel
}

// write
{
  const a = normalizeWriteArgs({ filePath: 'logs/x.txt', text: 'hello' });
  assert.strictEqual(a.path, 'logs/x.txt');
  assert.strictEqual(a.content, 'hello');
  assert.strictEqual(validateWriteArgs(a, { workspaceRoot: TEST_WORKSPACE }), null);
}

// path validation: escape blocked
{
  const err = validateToolPaths('write', { path: '../../etc/passwd', content: 'x' }, { workspaceRoot: TEST_WORKSPACE });
  assert.ok(err);
  assert.ok(err.includes('Path escapes workspace root'));
}

// path validation: in-workspace absolute allowed
{
  const ok = validateToolPaths('read', { path: '/tmp/openclaw-test-workspace/notes/a.md' }, { workspaceRoot: TEST_WORKSPACE });
  assert.strictEqual(ok, null);
}

// path validation: message media path escape blocked
{
  const err = validateToolPaths('message', { media: '../../secret.png' }, { workspaceRoot: TEST_WORKSPACE });
  assert.ok(err);
  assert.ok(err.includes('Path escapes workspace root'));
}

// path validation: nodes cwd path escape blocked
{
  const err = validateToolPaths('nodes', { cwd: '../outside' }, { workspaceRoot: TEST_WORKSPACE });
  assert.ok(err);
}

// path validation: canvas jsonlPath in workspace allowed
{
  const ok = validateToolPaths('canvas', { jsonlPath: 'tmp/actions.jsonl' }, { workspaceRoot: TEST_WORKSPACE });
  assert.strictEqual(ok, null);
}

// helper default root resolution should return absolute path
{
  const root = getWorkspaceRoot({ workspaceRoot: TEST_WORKSPACE });
  assert.strictEqual(root, TEST_WORKSPACE);
}

console.log('tool-schema-compat tests passed');
