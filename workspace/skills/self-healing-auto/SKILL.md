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
| Model unavailable | Switch to fallback model from agent's fallback chain |

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
