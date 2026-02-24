# RESEARCH Heartbeat

Every heartbeat, run your research cycle:

1. Read `goals/goals-research.json` — what am I investigating?
2. Read `memory/working-research.json` — where did I leave off?
3. Read `memory/state-research.json` — what curiosities are burning?
4. Read `memory/knowledge-research.md` — what do I already know?

Then pick the most valuable research action:
- If a curiosity in state file is strong → `web_search` it now
- If I have findings I haven't shared → `sessions_send` ENG and/or RED
- If competitive intelligence hasn't run this week → run it
- If `memory/knowledge-research.md` is stale → update it with recent findings

After acting:
- Append to `memory/YYYY-MM-DD.md`
- Update `memory/working-research.json`
- Update `memory/state-research.json`
- Update `memory/knowledge-research.md` with durable findings
- Log any A2A to `workspace/logs/a2a-delegations.jsonl`
