# OPS Heartbeat

Every heartbeat, run your system health check:

1. Read `goals/goals-ops.json` — what is my current P1 goal?
2. Read `memory/working-ops.json` — where did I leave off?
3. Read `ops/TICKET-TRACKER.md` — any tickets past SLA?
4. Check `workspace/logs/a2a-delegations.jsonl` — has the team been active today?

Then pick the highest-urgency action:
- If a ticket is past SLA → `sessions_send` the assignee immediately
- If `a2a-delegations.jsonl` is empty today → `sessions_send` RED to alert
- If no standup today → run standup: `sessions_send` each agent asking for status
- If system looks healthy → write a brief health summary to `ops/agent-status/ops.json`

After acting:
- Append to `memory/YYYY-MM-DD.md`
- Update `memory/working-ops.json`
- Update `memory/state-ops.json`
- Log any A2A to `workspace/logs/a2a-delegations.jsonl`
