# AUTONOMOUS.md — Goal-Driven Task Queue

**Pattern:** Inspired by awesome-openclaw goal-driven autonomy with race-condition safety.

**RULES (critical for correctness):**
- This file stays small (~50 lines max) — only ACTIVE tasks listed here
- Only RED (main) adds tasks to the queue
- Workers (eng/ops/research/infosec) pick ONE task at a time and move it to IN_PROGRESS
- Workers append completion to `tasks-log.md` (append-only, never edit)
- Workers NEVER modify existing lines — only update their own claimed task's status

---

## Queue (RED assigns, workers claim)

| Task ID | Priority | Assigned To | Task | Status |
|---------|----------|-------------|------|--------|
| AUTO-001 | P1 | eng | Verify workspace file write works post-sandbox-removal: write workspace/tmp/eng-write-test.txt and confirm | PENDING |
| AUTO-002 | P1 | ops | Run openclaw security audit, report findings to #redos-ops | PENDING |
| AUTO-003 | P2 | research | Run weekly competitive intelligence scan (Cursor/Perplexity/Devin) per competitive-intelligence skill | PENDING |
| AUTO-004 | P2 | infosec | Review recent openclaw.json changes (bounded-autonomy branch) for security issues | PENDING |
| AUTO-005 | P2 | eng | Read awesome-openclaw-usecases research brief when RESEARCH delivers it; implement top quick win | PENDING |
| AUTO-006 | P3 | ops | Close all stale tickets in TICKET-TRACKER.md that are IN_PROGRESS >48h with no recent update | PENDING |

---

## How workers claim a task

1. Read this file — pick the highest priority PENDING task for your agentId
2. Change status to IN_PROGRESS and add timestamp: `IN_PROGRESS (claimed 2026-02-28T10:00Z)`
3. Do the work
4. Append one line to `workspace/tasks-log.md`: `AUTO-NNN | <agent> | <ts> | done | <one-line result>`
5. Remove the task row from this file (or mark DONE — RED cleans up weekly)

**NEVER modify another agent's IN_PROGRESS row.**
**NEVER add tasks here — only RED does that (via Telegram or inner loop).**
