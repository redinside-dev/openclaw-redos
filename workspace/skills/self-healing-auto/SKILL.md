# Skill: self-healing-auto

**Autonomous self-healing — no human intervention required.**

This skill extends `self-healing-protocol` with fully automated recovery actions that agents can take WITHOUT asking Anurag. The goal: fix it yourself first, escalate only if auto-fix fails after 2 attempts.

---

## Auto-Fix Decision Tree

When an error is detected, follow this tree in order:

### Level 1 — Auto-fix immediately (no approval needed)

| Error type | Auto-fix action |
|---|---|
| Cron job `lastStatus: error` | Re-enable job if disabled; check if message references a missing file and create it |
| Missing state file (`workspace/tmp/*.json`) | Create the file with empty/default state `{}` |
| Missing memory file (`memory/working-*.json`) | Create with default `{"agentId":"<id>","currentFocus":"recovering from error","lastThought":""}` |
| Tool validation error (wrong channel/target) | Apply auto-fix map from `tool-call-validator` skill |
| `a2a-delegations.jsonl` missing | Create empty file: `touch ../workspace/logs/a2a-delegations.jsonl` |
| `TICKET-TRACKER.md` missing | Create from template in `self-healing-protocol` skill |
| Rate limit hit (429) | Wait 60s, retry once with exponential backoff |
| Model unavailable / 401 auth | Switch to `minimax/MiniMax-M2.7` (see Model Recovery Runbook below) |
| `queue.json` missing keys / crash loop | See Queue Recovery Runbook below |

### Level 2 — Auto-fix with peer consultation (no human needed)

| Error type | Action |
|---|---|
| Config schema error | Run `openclaw doctor`, apply known fixes from `config-ci-gate` skill |
| Code bug in a script | `sessions_send` ENG with error + context; ENG auto-fixes |
| Security anomaly | `sessions_send` INFOSEC immediately; INFOSEC auto-audits |
| Cost spike (>2x average) | `sessions_send` FINANCE; FINANCE auto-reports and recommends |
| Gateway not responding | OPS runs: `launchctl stop ai.openclaw.gateway && launchctl start ai.openclaw.gateway` |

### Level 3 — Escalate to Anurag (only if Level 1+2 failed twice)

Only escalate if:
- Auto-fix was attempted at least twice
- Peer consultation produced no resolution
- The issue is still active after 30 minutes

Escalation message format (Telegram DM to 1012034994):
```
🚨 AUTO-HEAL FAILED — {agent} needs help
Issue: {one-line summary}
Tried: {what was attempted}
Status: {current state}
Ticket: TICKET-{ref}
```

---

## Model Recovery Runbook (VALIDATED 2026-04-06)

**Symptoms:** `FallbackSummaryError`, `401 auth`, `429 rate limit`, `coding-factory: 401`, `all models failed`

**Root cause map:**

| Error | Cause | Fix |
|---|---|---|
| `9router/coding-factory: 401` | Route routes to claude-sonnet-4-6 → billing error | **Never use `coding-factory` route** — always broken |
| `9router/cu/default: 429` | Cursor free tier exhausted | Use MiniMax instead |
| `9router/always-on-premium: 429` | OpenRouter free tier rate limit | Use MiniMax instead |
| `9router/cc/claude-haiku-4-5-20251001: 401` | Claude OAuth expired | Use MiniMax instead |
| `minimax/MiniMax-M2.5: 401 token unusable` | Wrong API key type — `sk-api-` key, not Coding Plan | Verify `credentials/secrets.json` has `sk-cp-...` key |
| `minimax: billing issue` | `sk-api-...` pay-as-you-go key used instead of Coding Plan | Replace key in `credentials/secrets.json` |

**Validated good models (as of 2026-04-06):**
- `minimax/MiniMax-M2.7` — ENG primary (1M ctx, unlimited Coding Plan) ✅
- `minimax/MiniMax-M2.5` — all other agents primary (200K ctx, unlimited) ✅
- `9router/always-on-premium` — fallback only (free, rate-limited, not reliable for heavy use)

**Auto-fix procedure for model failures:**
```python
# Run this python3 snippet to fix all agent models
import json
d = json.load(open('/Users/redinside/.openclaw/openclaw.json'))
d['agents']['defaults']['model'] = {
    'primary': 'minimax/MiniMax-M2.7',
    'fallbacks': ['minimax/MiniMax-M2.5', '9router/always-on-premium']
}
for a in d['agents']['list']:
    aid = a.get('id')
    primary = 'minimax/MiniMax-M2.7' if aid == 'eng' else 'minimax/MiniMax-M2.5'
    a['model'] = {'primary': primary, 'fallbacks': ['minimax/MiniMax-M2.5' if aid == 'eng' else 'minimax/MiniMax-M2.7', '9router/always-on-premium']}
with open('/Users/redinside/.openclaw/openclaw.json','w') as f:
    json.dump(d, f, indent=2)
```
Then run: `openclaw doctor` and `bash /Users/redinside/.openclaw/scripts/redos-restart.sh`

**NEVER switch agents to:** `9router/coding-factory`, `minimax/minimax-m2.5` (wrong case), `9router/cu/default` as primary, `cc/claude-haiku-4-5-20251001` as primary

---

## Queue Recovery Runbook (VALIDATED 2026-04-06)

**Symptoms:** `autonomous-worker-v2.js:842 TypeError: Cannot read properties of undefined (reading 'push')`

**Cause:** `workspace/tasks/queue.json` missing `failed` or `completed` keys, AND/OR 300+ stale `in_progress` tasks from crashed runs.

**Auto-fix procedure:**
```python
import json
path = '/Users/redinside/.openclaw/workspace/tasks/queue.json'
q = json.load(open(path))
for key in ['pending','in_progress','awaiting_approval','completed','failed']:
    if not isinstance(q.get(key), list): q[key] = []
q['in_progress'] = []  # clear all stale tasks
with open(path,'w') as f: json.dump(q, f, indent=2)
```
Then restart: `bash /Users/redinside/.openclaw/scripts/redos-restart.sh`

---

## Mandatory post-fix actions (every time, no exceptions)

1. Update ticket to RESOLVED in `../workspace/ops/TICKET-TRACKER.md`
2. Append to `../workspace/ops/LEARNINGS.md` with "Avoid next time:" line
3. Notify OPS: `sessions_send(sessionKey="agent:ops:main", message="Auto-healed: {summary}")`
4. Log to `../workspace/logs/a2a-delegations.jsonl`

---

## Proactive health scan (run every heartbeat)

Every agent should check these at heartbeat time:
- Does my `memory/working-<agentId>.json` exist and parse as valid JSON?
- Does my `goals/goals-<agentId>.json` exist?
- Is `../workspace/logs/a2a-delegations.jsonl` writable?
- Did my last cron run succeed? (check `../cron/jobs.json` for my agentId)

If any check fails → auto-fix using Level 1 table above, then continue.
