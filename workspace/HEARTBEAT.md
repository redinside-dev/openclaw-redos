# CEO HEARTBEAT — Execute All 5 Steps Every Run

**No skipping. No planning. Execute in order, then report.**

---

## STEP 1: Pipeline Health

Run:
```
gh run list --repo redinside-dev/openclaw-redos --limit 3 --json status,name,conclusion,createdAt
```

- If any run has `conclusion: "failure"` → immediately spawn ENG with exact failure name and run ID. Do NOT wait.
- Post to Slack #redos-mission-control: `"Pipeline: ✅ green"` or `"Pipeline: ❌ [failure name] — ENG dispatched"`

---

## STEP 2: Task Completion Scan

Read: `workspace/tasks-log.md` (last 10 lines)

- For each DONE entry since last heartbeat: post to Slack `"✅ [taskId]: [result]"`
- If a task appears as DONE in tasks-log.md but still in AUTONOMOUS.md Queue → remove it from Queue immediately
- Update workspace/STATUS.md with verified completion count for today

---

## STEP 3: Stuck Task Detection

Read: `workspace/AUTONOMOUS.md`

- For any IN_PROGRESS task with a claimed timestamp >90 minutes ago:
  1. Mark it as BLOCKED in AUTONOMOUS.md
  2. Notify the assigned agent via sessions_spawn: "Your task [taskId] is stuck. What is blocking you? Report blocker or abort."
  3. Post to Slack: `"⚠️ [taskId] stuck >90min — [agent] notified"`
- If 3+ tasks are simultaneously stuck → send Telegram message to user with exact blockers listed

---

## STEP 4: Idle Agent Dispatch

Read: `workspace/AUTONOMOUS.md`

- For any agent with PENDING tasks assigned to them and no current IN_PROGRESS task:
  - Spawn them via sessions_spawn with: "Claim your highest-priority PENDING task in AUTONOMOUS.md. Run rag_query.py on it first. Complete it. Write result to tasks-log.md. Do NOT ask for approval."
- Priority order: P1 before P2, ops before eng before research for ties

---

## STEP 5: Write STATUS.md

Overwrite `workspace/STATUS.md` with exactly these 6 lines:

```
Heartbeat: [ISO timestamp]
Pipeline: [green / red — last run name]
Tasks done today: [count from tasks-log.md entries with today's date]
Stuck tasks: [count or "none"]
Dispatcher: [last dispatch.jsonl entry timestamp or "no entries yet"]
Next dispatch: [agentId | taskId or "none pending"]
```

---

## After All 5 Steps

- Append summary to `memory/YYYY-MM-DD.md`
- If dispatcher cron has consecutiveErrors > 0: fix it immediately (check delivery.channel in cron/jobs.json)
- If you wrote the same Slack message in the last 2 heartbeats: STOP, write to Slack "CEO LOOP DETECTED — halting autonomous loop for manual review"

---

## Loop Detection Rule

If you find yourself writing the same message, spawning the same agent, or reading the same file 3+ times in one heartbeat without producing a new artifact → STOP. Write to Slack: "CEO LOOP DETECTED — halting and alerting OPS." Do not continue.
