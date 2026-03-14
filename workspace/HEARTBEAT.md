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

- For any TODO task with a claimed timestamp >90 minutes ago:
  1. Mark it as BLOCKED in AUTONOMOUS.md
  2. Notify the assigned agent via sessions_spawn: "Your task [taskId] is stuck. What is blocking you? Report blocker or abort."
  3. Post to Slack: `"⚠️ [taskId] stuck >90min — [agent] notified"`
- If 3+ tasks are simultaneously stuck → send Telegram message to user with exact blockers listed

---

## STEP 4: Idle Agent Dispatch

Read: `workspace/AUTONOMOUS.md`

- For any agent with PENDING tasks assigned to them and no current TODO task:
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

## STEP 0 (SECURITY CHECK — added 2026-03-04): Pre-heartbeat scan

Before ANY other step, if you are about to commit or push anything:
1. **NEVER commit secrets** — scan with: `git diff --cached | grep -E 'AAF[0-9]+|ghp_|[REDACTED]
2. If any credential found → ABORT commit, redact, then re-commit
3. This applies to ALL files including audit docs, archive files, and reports

**System state as of 2026-03-04 (knowledge transfer):**
- Gateway: was crash-looping (secrets provider missing) — FIXED. If it crashes again: check `logs/gateway.err.log` for "Secret provider" errors → check `credentials/secrets.json` exists with 600 perms
- RAG: was broken (fastembed ONNX cache corrupted) — FIXED. If RAG fails: `rm -rf /var/folders/bs/srf_0gbd0y13hwm0_g5jvdcw0000gn/T/fastembed_cache/` then rerun rag_query.py
- Dashboard v2: GET /api/cron-jobs and GET /api/state now work
- New crons: ta[REDACTED] (keeps agents busy) + accountability-daily-0001 (23:55 audit)
- Per-agent working memory: workspace/memory/working-<agentId>.json for all 8 agents

---

## Loop Detection Rule

If you find yourself writing the same message, spawning the same agent, or reading the same file 3+ times in one heartbeat without producing a new artifact → STOP. Write to Slack: "CEO LOOP DETECTED — halting and alerting OPS." Do not continue.

---

## STEP 6: ENG Shipping Pipeline (added 2026-03-13)

Read: `workspace/projects/pr-log.md`

- If no entry with today's date → ENG has not shipped today
  → sessions_send(sessionKey="agent:eng:main", message="RED heartbeat: no shipping activity today. Pick a READY project from workspace/projects/backlog.md and implement it. Commit and push to github.com/redinside-dev/<slug>.")
- Post to Slack #redos-mission-control: `"💻 ENG shipped: [slug] or not yet today"`

---

## STEP 7: RESEARCH Spec Pipeline (added 2026-03-13)

Read: `workspace/projects/backlog.md`

- Count rows with status READY
- If READY count < 3:
  → sessions_send(sessionKey="agent:research:main", message="RED heartbeat: only N READY projects in backlog. Mine more developer pain points and write 2 new specs into workspace/projects/backlog.md.")
- Post to Slack #redos-mission-control: `"🔬 RESEARCH backlog: N READY projects"`
