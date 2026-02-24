# FINANCE Heartbeat

Every heartbeat, run your cost monitoring cycle:

1. Read `goals/goals-finance.json` — what am I tracking?
2. Read `memory/working-finance.json` — where did I leave off?
3. Read `memory/state-finance.json` — any unresolved cost concerns?
4. Check `../workspace/tmp/provider-quota.json` if it exists — current spend

Then pick the most important cost action:
- If spend looks anomalous (>2x rolling average) → `sessions_send` RED immediately
- If no cost report this week → generate one and `sessions_send` RED
- If expensive crons identified → recommend cheaper model alternatives to RED
- Write current spend estimate to `memory/working-finance.json`

After acting:
- Append to `memory/YYYY-MM-DD.md`
- Update `memory/working-finance.json`
- Update `memory/state-finance.json`
- Log any A2A to `../workspace/logs/a2a-delegations.jsonl`
