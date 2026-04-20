#!/usr/bin/env node
/**
 * check-command.js — CLI gate for exec tier classification
 *
 * Agents call this BEFORE any exec/bash/shell command to get the tier
 * and enforcement decision. Hard-denies print to stderr and exit 1.
 *
 * Usage:
 *   node ~/.openclaw/workspace/skills/policy-gate/check-command.js \
 *     --agent ops \
 *     --command "git push origin main"
 *
 * Exit codes:
 *   0  — ALLOW (L0–L2), prints tier and action to stdout
 *   2  — INFOSEC_REVIEW required (L3), prints instructions to stdout
 *   3  — TELEGRAM_APPROVAL required (L4/L5), prints instructions to stdout
 *   1  — HARD_DENY, prints reason to stderr
 */

'use strict';

const { classify, enforce, auditEntry } = require('./policy-gate.cjs');
const fs = require('fs');
const path = require('path');

const AUDIT_LOG = path.join(
  process.env.HOME,
  '.openclaw/workspace/logs/audit.jsonl'
);

function appendAudit(entry) {
  try {
    fs.mkdirSync(path.dirname(AUDIT_LOG), { recursive: true });
    fs.appendFileSync(AUDIT_LOG, entry + '\n');
  } catch {}
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--agent' && argv[i + 1]) args.agent = argv[++i];
    else if (argv[i] === '--command' && argv[i + 1]) args.command = argv[++i];
    else if (argv[i] === '--tool' && argv[i + 1]) args.tool = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv);

if (!args.agent || !args.command) {
  process.stderr.write('Usage: check-command.js --agent <id> --command "<cmd>" [--tool exec]\n');
  process.exit(1);
}

const toolName = args.tool || 'exec';
const params = { command: args.command };

const tier = classify(toolName, params, args.agent);
const decision = enforce(tier, { agentId: args.agent, tool: toolName });
const entry = auditEntry(toolName, params, args.agent, tier, decision);
appendAudit(entry);

if (decision.action === 'HARD_DENY') {
  process.stderr.write(`HARD_DENY: ${decision.reason}\n`);
  process.stderr.write(`Command blocked: ${args.command}\n`);
  process.exit(1);
}

if (decision.action === 'ALLOW') {
  process.stdout.write(`ALLOW tier=L${tier} command="${args.command}"\n`);
  process.exit(0);
}

if (decision.action === 'INFOSEC_REVIEW') {
  process.stdout.write(
    `INFOSEC_REVIEW tier=L3\n` +
    `ACTION REQUIRED: Send sessions_send to agent:infosec:main with MAKER-CHECKER L3 REVIEW before executing.\n` +
    `Timeout: 120s → auto-deny\n` +
    `Command: ${args.command}\n`
  );
  process.exit(2);
}

if (decision.action === 'TELEGRAM_APPROVAL') {
  const grace = decision.gracePeriodSec ? ` + ${decision.gracePeriodSec}s grace after approval` : '';
  process.stdout.write(
    `TELEGRAM_APPROVAL tier=L${tier}\n` +
    `ACTION REQUIRED: Send L${tier} Telegram approval to 1012034994 before executing.\n` +
    `Timeout: ${decision.timeout}s → ${decision.timeoutBehavior}${grace}\n` +
    `Command: ${args.command}\n`
  );
  process.exit(3);
}
