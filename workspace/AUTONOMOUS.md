# AUTONOMOUS.md — Goal-Driven Task Queue

**Pattern:** Inspired by awesome-openclaw goal-driven autonomy with race-condition safety.

**RULES (critical for correctness):**
- This file stays small (~50 lines max) — only ACTIVE tasks listed here
- Only RED (main) adds tasks to the queue
- Workers (eng/ops/research/infosec) pick ONE task at a time and move it to IN_PROGRESS
- Workers append completion to `tasks-log.md` (append-only, never edit)
- Workers NEVER modify existing lines — only update their own claimed task's status
- **If a task appears in tasks-log.md as done → remove it from Queue immediately. Do NOT re-add it.**

---

## Queue (RED assigns, workers claim)

| Task ID | Priority | Assigned To | Task | Status |
|---------|----------|-------------|------|--------|
| AUTO-009 | P1 | ops | Verify 3 new watchdog LaunchAgents are running: 9router-watchdog, model-outage-monitor, session-overflow-monitor. Run each script manually once and confirm no errors. Post result to #redos-ops | PENDING |
| AUTO-010 | P1 | eng | Implement 9router token refresh cron (every 6h) for kiro/claude tokens — post-incident iflow and codex tokens lost. Verify all provider connections in db.json are valid after refresh | PENDING |
| AUTO-011 | P1 | infosec | Security audit of new watchdog scripts: verify Telegram token is not exposed in logs, verify db.json backup permissions (600), verify session archive does not leak session content. Post findings to #redos-infosec | IN_PROGRESS (claimed 2026-03-02T23:01Z by dispatcher) |
| AUTO-012 | P2 | ops | Add 9router process health to the morning autonomy-scorecard check. Score should include: 9router uptime, db.json size, session overflow count | PENDING |
| AUTO-013 | P2 | eng | Validate all fallback model chains in openclaw.json are live — test each model in each agent's fallback array and remove/replace any that return errors | PENDING |
| AUTO-014 | P1 | finance | Implement weekly cost report cron (GOAL-004): analyze workspace/costs/*.json, compute daily avg, cache hit rate, top 3 expensive agents. Post to #redos-finance | IN_PROGRESS (claimed 2026-03-02T23:01Z by dispatcher) |
| AUTO-016 | P1 | ops | Verify autonomous-task-dispatcher-0001 is running cleanly (no consecutiveErrors). Check workspace/logs/dispatch.jsonl for last 3 entries. Post result to #redos-ops | PENDING |
| AUTO-017 | P2 | eng | Wire rag_query.py into pre-task retrieval: ensure memsearch and rag_query are callable from any agent session. Test with: python3 ~/.openclaw/workspace/scripts/rag_query.py "9router token refresh fix" and confirm results return | PENDING |
| AUTO-018 | P2 | ops | Add real_autonomy_score to STATE.yaml nightly: compute (verified_completions / dispatched_tasks) * 100 from tasks-log.md. Add nightly cron for OPS to calculate and write to STATE.yaml | PENDING |

---

## Completed (removed from Queue — verified in tasks-log.md)

| Task ID | Completed By | When | Notes |
|---------|-------------|------|-------|
| AUTO-001 | — | — | Superseded — sandbox removed, file writes confirmed working |
| AUTO-002 | — | — | Merged into AUTO-011 (infosec scope) |
| AUTO-003 | — | — | Deferred to next sprint (research capacity unavailable) |
| AUTO-004 | — | — | Merged into AUTO-011 |
| AUTO-005 | eng | 2026-03-01 | Idempotent episodes seeder state tracking implemented |
| AUTO-006 | RED | 2026-02-28 | 14 stale tickets resolved, 3 escalated |
| AUTO-008 | — | — | Path verified correct; ENG sandbox has ../workspace/ access |
| AUTO-015 | RED | 2026-03-02 | Research-to-eng pipeline verified via AUTO-005 in tasks-log.md |

---

## How workers claim a task

1. Read this file — pick the highest priority PENDING task for your agentId
2. Change status to IN_PROGRESS and add timestamp: `IN_PROGRESS (claimed 2026-03-02T10:00Z)`
3. **MANDATORY before starting:** run `python3 ~/.openclaw/workspace/scripts/rag_query.py "[task description]" --top 5` and read returned context
4. Do the work. Do NOT ask for approval. Act first, report results.
5. Append one line to `workspace/tasks-log.md`: `AUTO-NNN | <agent> | <ISO-ts> | done | <one-line result>`
6. Remove the task row from Queue section above (or add to Completed table)

**NEVER modify another agent's IN_PROGRESS row.**
**NEVER add tasks here — only RED does that (via Telegram or dispatcher cron).**
