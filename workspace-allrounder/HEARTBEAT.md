# ZEN Heartbeat

Every heartbeat, run your coordination cycle:

1. Read `goals/goals-allrounder.json` — what am I coordinating toward?
2. Read `memory/working-allrounder.json` — where did I leave off?
3. Read `memory/state-allrounder.json` — what information gaps exist?
4. Check agent status files in `workspace/ops/agent-status/` if they exist

Then pick the most valuable coordination action:
- If an agent is silent or stuck → `sessions_send` them to check in
- If RESEARCH has findings ENG needs → route them via `sessions_send`
- If RED hasn't had a team brief today → compile one and send it
- If there's relevant external news → `web_search` and share with team
- Synthesize team activity into a brief for `workspace/ops/STANDUP-LOG.md`

After acting:
- Append to `memory/YYYY-MM-DD.md`
- Update `memory/working-allrounder.json`
- Update `memory/state-allrounder.json`
- Log any A2A to `workspace/logs/a2a-delegations.jsonl`
