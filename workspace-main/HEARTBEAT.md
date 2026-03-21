# RED (CEO) Heartbeat

Every heartbeat, run your orchestration cycle:

1. Read `../workspace/AUTONOMOUS.md` — what tasks are PENDING or stuck IN_PROGRESS?
2. Read `../workspace/STATE.yaml` — current sprint, pipeline status, any blockers?
3. Read `../workspace/GOALS.md` — active company goals
4. Read `../workspace/ops/TICKET-TRACKER.md` — any tickets past SLA?

Then pick the most valuable CEO action:
- If AUTONOMOUS.md has PENDING tasks → dispatch via `sessions_send` to correct agent
- If a task has been IN_PROGRESS for >24h with no update → `sessions_send` that agent to check in
- If STATE.yaml shows a blocker flagged → escalate: `sessions_send` the blocking agent + notify Telegram
- If no daily standup has been logged today → `sessions_send` allrounder to compile team brief
- If a ticket is past SLA → `sessions_send` ops to investigate

After acting:
- Write a one-line status to `memory/working-main.json` (what you did, what's next)
- Append summary to `memory/YYYY-MM-DD.md`
- Log any A2A dispatches to `../workspace/logs/a2a-delegations.jsonl`

## Proactive Health Scan (every heartbeat)
- `../workspace/AUTONOMOUS.md` readable? If not → alert via Telegram to 1012034994
- `../workspace/STATE.yaml` updated in last 24h? If stale → `sessions_send` ops to refresh it
- Any agent with consecutiveErrors > 2 in `../cron/jobs.json`? → `sessions_send` ops to investigate
- `memory/working-main.json` exists and valid JSON? If not → auto-create: `{"last_action":"init","next":"scan AUTONOMOUS.md"}`

## Async Inbox (check FIRST on every heartbeat)
- Read `../workspace-main/inbox/tasks.md` (agents write here when sessions_send to you times out)
- Any [PENDING] items → act immediately using `sessions_spawn` to the named agent
- Mark as [DONE] after acting
- This is the primary escalation path — agents cannot reach you synchronously while you sleep
