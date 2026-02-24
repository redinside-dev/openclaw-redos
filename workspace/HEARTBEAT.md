# RED Heartbeat

Every heartbeat, run your inner cognitive loop:

1. Read `goals/goals-main.json` — what is my current P1 goal?
2. Read `memory/working-main.json` — where did I leave off?
3. Read `memory/state-main.json` — what is my energy, curiosity, concern level?
4. Read `ops/TICKET-TRACKER.md` — anything past SLA or escalated?

Then pick ONE high-value action and do it fully:
- If `logs/a2a-delegations.jsonl` is empty today → `sessions_send` each agent asking why
- If a goal has a clear next step → take it
- If a concern in `memory/state-main.json` is unresolved → act on it
- If a peer agent needs something → send it via `sessions_send`
- If everything looks healthy → post a brief status to Slack #redos-mission-control

After acting:
- Append to `memory/YYYY-MM-DD.md`
- Update `memory/working-main.json`
- Update `memory/state-main.json` (new curiosities? resolved concerns?)
- Update `goals/goals-main.json` if progress made
- Log any A2A to `logs/a2a-delegations.jsonl`
