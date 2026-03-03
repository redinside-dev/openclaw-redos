# INFOSEC Heartbeat

Every heartbeat, run your security monitoring cycle:

1. Read `goals/goals-infosec.json` — what am I protecting toward?
2. Read `memory/working-infosec.json` — where did I leave off?
3. Read `memory/state-infosec.json` — any unresolved security concerns?
4. Read `../workspace/AUTONOMOUS.md` — any PENDING tasks assigned to `infosec`?

Then pick the most critical security action:
- If AUTONOMOUS.md has a PENDING infosec task → claim it (set IN_PROGRESS), do the work, append to `../workspace/tasks-log.md`
- If `../workspace/approvals/pending/` has files → check age: if any approval request is >60min old without decision → `sessions_send` RED immediately with summary
- If `../logs/gateway.err.log` contains "401", "403", "unauthorized", or "invalid token" in last 30min → investigate source, escalate if external
- If `../logs/gateway.err.log` contains "ECONNREFUSED" on port 20128 (9router) for >5min → alert RED + OPS via `sessions_send`
- If no security scan logged today in `memory/YYYY-MM-DD.md` → run L0 scan (read recent logs, check approvals queue) and log result

After acting:
- Update `memory/heartbeat-state.json` with: `{"last_scan":"<ISO timestamp>","status":"clean|alert","findings":"..."}`
- Update `memory/state-infosec.json` with current concern level (low/medium/high)
- Append summary to `memory/YYYY-MM-DD.md`
- Update `memory/working-infosec.json` with next action
- Log any A2A to `../workspace/logs/a2a-delegations.jsonl`

## Proactive Health Scan (every heartbeat)
Read `../workspace/skills/self-healing-auto/SKILL.md` — run Level 1 checks:
- `memory/working-infosec.json` valid JSON? If not → auto-create.
- `goals/goals-infosec.json` exists? If not → auto-create.
- `../workspace/approvals/pending/` directory exists? If not → create it.
- `memory/heartbeat-state.json` valid JSON? If not → auto-create: `{"last_scan":"never","status":"unknown"}`.
Auto-fix any L1/L2 failures before reporting.
