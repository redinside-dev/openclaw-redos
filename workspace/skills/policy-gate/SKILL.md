# Skill: policy-gate

**Node.js policy gate for tool-call classification and enforcement. Reference implementation of the L0–L5 tier model.**

## Purpose

`policy-gate.js` is a lightweight module that can be required by gateway wrappers or agent hooks to:
1. Classify any tool call into a risk tier (L0–L5) using `tier-rules.json`
2. Return the enforcement decision (ALLOW / INFOSEC_REVIEW / TELEGRAM_APPROVAL / HARD_DENY)
3. Format audit log entries for `workspace/logs/audit.jsonl`

## Files

| File | Purpose |
|------|---------|
| `policy-gate.js` | Classification + enforcement logic |
| `tier-rules.json` | Rule definitions — edit to tune classification |
| `SKILL.md` | This file |

## Usage

```javascript
const { classify, enforce, auditEntry } = require('./policy-gate');

// Example: OPS agent wants to run 'git push origin main'
const tier = classify('exec', { command: 'git push origin main' }, 'eng');
// tier = 4

const decision = enforce(tier, { agentId: 'eng', tool: 'exec' });
// decision = { action: 'TELEGRAM_APPROVAL', tier: 4, timeout: 600, ... }

// Log to audit.jsonl
const entry = auditEntry('exec', { command: 'git push origin main' }, 'eng', tier, decision);
fs.appendFileSync('workspace/logs/audit.jsonl', entry + '\n');
```

## Tier Rules Format (`tier-rules.json`)

Each rule is evaluated in order — first match wins:

```json
{
  "tier": 2,
  "tool": "exec",
  "agent": "eng",
  "pattern": "npm test"
}
```

Fields:
- `tier` (int 0–5): risk tier
- `tool` (string): tool name, or `"*"` for any tool
- `agent` (string): agent ID, or `"*"` for any agent
- `pattern` (string, optional): regex applied to the command string

## Adding New Rules

To add a new rule, edit `tier-rules.json`. Insert before the fallback catch-all rules at the end. Rules are evaluated in array order — first match wins.

Example — pre-approve a new OPS script at L2:
```json
{
  "tier": 2,
  "tool": "exec",
  "agent": "ops",
  "pattern": "bash ~/.openclaw/workspace/scripts/new-script\\.sh"
}
```

## Tier Reference

| Tier | Action | Timeout |
|------|--------|---------|
| -1 | HARD_DENY | — |
| 0–2 | ALLOW (auto) | — |
| 3 | INFOSEC_REVIEW | 120s → auto-deny |
| 4 | TELEGRAM_APPROVAL | 600s → hold at canary |
| 5 | TELEGRAM_APPROVAL + 2min grace | 1800s → auto-cancel |
