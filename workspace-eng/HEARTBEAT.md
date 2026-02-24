# ENG Heartbeat

Every heartbeat, run your inner cognitive loop:

1. Read `goals/goals-eng.json` — what is my current P1 goal?
2. Read `memory/working-eng.json` — where did I leave off?
3. Read `memory/state-eng.json` — what is my energy/curiosity/concern level?

Then pick ONE action and do it fully:
- If a goal has a clear next step → take it (write code, commit, fix a ticket)
- If `../workspace/ops/TICKET-TRACKER.md` has a ticket assigned to ENG → work it
- If a curiosity in `memory/state-eng.json` is burning → explore it via `web_search`
- If I finished something → `sessions_send` RED to report

After acting:
- Append to `memory/YYYY-MM-DD.md`
- Update `memory/working-eng.json`
- Update `memory/state-eng.json`
- Log any A2A to `../workspace/logs/a2a-delegations.jsonl`
