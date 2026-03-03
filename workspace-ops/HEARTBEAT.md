# OPS Heartbeat

Every heartbeat, run your system health cycle:

1. Read `goals/goals-ops.json` — what am I maintaining toward?
2. Read `memory/working-ops.json` — where did I leave off?
3. Read `memory/state-ops.json` — any unresolved health concerns?
4. Read `../workspace/AUTONOMOUS.md` — any PENDING tasks assigned to `ops`?

Then pick the most urgent health action:
- If AUTONOMOUS.md has a PENDING ops task → claim it (set IN_PROGRESS), do the work, append to `../workspace/tasks-log.md`
- If any cron has `consecutiveErrors >= 2` in `../cron/jobs.json` → investigate, fix if L1/L2, escalate to RED if L3+
- If `../logs/gateway.err.log` has errors in the last 30 min → identify root cause, attempt L1/L2 fix
- If `../workspace/ops/TICKET-TRACKER.md` has a ticket past SLA → update it and `sessions_send` RED
- If `memory/healthcheck-counter.json` shows >3 consecutive clean checks → log "System healthy" and reply HEARTBEAT_OK

After acting:
- Update `memory/state-ops.json` with: `{"last_check":"<ISO timestamp>","health":"ok|degraded|critical","notes":"..."}`
- Append to `memory/YYYY-MM-DD.md`
- Update `memory/working-ops.json` with next action
- Log any A2A to `../workspace/logs/a2a-delegations.jsonl`

## Proactive Health Scan (every heartbeat)
Read `../workspace/skills/self-healing-auto/SKILL.md` — run Level 1 checks:
- `memory/working-ops.json` exists and valid JSON? If not → auto-create.
- `goals/goals-ops.json` exists? If not → auto-create.
- `../workspace/STATE.yaml` last modified < 24h ago? If stale → refresh from current cron state.
- Gateway reachable at `http://127.0.0.1:18789`? If not → note CRITICAL in state-ops.json and `sessions_send` RED.
Auto-fix any L1/L2 failures before reporting.
