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


| AUTO-013 | P2 | eng | Validate all fallback model chains in openclaw.json are live — test each model in each agent's fallback array and remove/replace any that return errors | IN_PROGRESS (claimed 2026-03-04T04:04Z) |

| AUTO-022 | P2 | ops | GOAL-006 Self-Healing Infrastructure (DUE: 2026-03-05 23:59 EST): Auto-rotate credentials (Perplexity/GitHub tokens), auto-provision missing files/paths (fix INFOSEC blockers), create health monitors with remediation loops. Deliverable: Credential rotation cron, file provisioning script, 2+ health monitors with auto-fix | IN_PROGRESS (claimed 2026-03-04T04:04Z) |

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
| AUTO-017 | eng | 2026-03-03 | RAG/memsearch wired into all agent SOUL files, tested successfully |
| AUTO-018 | ops | 2026-03-03 | Autonomy score tracking live with nightly cron |
| AUTO-019 | eng | 2026-03-03 | Context Engineering complete: A2A handoff protocol + knowledge bases for 3 agents |
| AUTO-020 | ops | 2026-03-03 | Force Resolution Pattern complete: 3 watchdog scripts upgraded, SLA handler, dependency blocker |
| AUTO-021 | eng | 2026-03-03 | Coordination Protocol complete: sessions_send retry wrapper, conflict resolution protocol |

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