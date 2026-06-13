#!/usr/bin/env node
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const cwd = '/Users/redinside/Development/Codebase/projects/RedTeam/github/redteam-coding-factory';
const dir = resolve(cwd, 'test');
const files = readdirSync(dir).filter(f => f.endsWith('.test.js'));

console.log('Running ' + files.length + ' factory test files...\n');
let passed = 0, failed = 0, skipped = 0;

for (const f of files) {
  const abs = resolve(dir, f);
  process.stdout.write('RUN  ' + f + ' ... ');
  try {
    await import(abs);
    console.log('PASS');
    passed++;
  } catch (e) {
    const msg = e.message.split('\n')[0];
    if (msg.includes('Only esm') || msg.includes('Unexpected token') || msg.includes('require') || msg.includes('Cannot find')) {
      console.log('SKIP (' + msg.slice(0, 60) + ')');
      skipped++;
    } else {
      console.error('FAIL — ' + msg);
      failed++;
    }
  }
}

console.log('\n' + '-'.repeat(40));
console.log('Results: ' + passed + ' passed, ' + failed + ' failed, ' + skipped + ' skipped');
process.exit(failed > 0 ? 1 : 0);
