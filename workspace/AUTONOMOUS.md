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
| AUTO-005 | P2 | eng | Research brief ready at workspace/tmp/research-brief-latest.md — implement episodes.jsonl seeder quick win (already done by RED 2026-02-28; verify it runs clean and seed is growing) | PENDING |
| AUTO-006 | P3 | ops | DONE BY RED 2026-02-28: 14 stale tickets resolved, 3 escalated (TICKET-20260228-001/002/003). Verify TICKET-20260228-001 (parser fix) is assigned and tracked | DONE |
| AUTO-007 | P2 | ops | Fix health-snapshot parser: implement dedup logic per TICKET-20260228-001 and TICKET-20260228-003 — no more 386x "unknown" spam | PENDING |
| AUTO-008 | P2 | eng | Fix wrong relative path in ENG SOUL.md: gateway.err.log shows workspace-eng/ops/TICKET-TRACKER.md not found — verify ../workspace/ paths resolve correctly from sandbox | PENDING |
| AUTO-009 | P1 | ops | Verify 3 new watchdog LaunchAgents are running: 9router-watchdog, model-outage-monitor, session-overflow-monitor. Run each script manually once and confirm no errors. Post result to #redos-ops | PENDING |
| AUTO-010 | P1 | eng | Implement 9router token refresh cron (every 6h) for kiro/claude tokens — post-incident iflow and codex tokens lost. Verify all provider connections in db.json are valid after refresh | PENDING |
| AUTO-011 | P1 | infosec | Security audit of new watchdog scripts: verify Telegram token is not exposed in logs, verify db.json backup permissions (600), verify session archive does not leak session content. Post findings to #redos-infosec | PENDING |
| AUTO-012 | P2 | ops | Add 9router process health to the morning autonomy-scorecard check. Score should include: 9router uptime, db.json size, session overflow count | PENDING |
| AUTO-013 | P2 | eng | Validate all fallback model chains in openclaw.json are live — test each model in each agent's fallback array and remove/replace any that return errors | PENDING |
| AUTO-014 | P1 | finance | Implement weekly cost report cron (GOAL-004): analyze workspace/costs/*.json, compute daily avg, cache hit rate, top 3 expensive agents. Post to #redos-finance | PENDING |
| AUTO-015 | P2 | allrounder | Verify research-to-eng pipeline delivered first brief to ENG (GOAL-003): check AUTO-005 completion in tasks-log.md, confirm ENG acknowledged. Report status to #redos-mission-control | PENDING |

---

## How workers claim a task

1. Read this file — pick the highest priority PENDING task for your agentId
2. Change status to IN_PROGRESS and add timestamp: `IN_PROGRESS (claimed 2026-02-28T10:00Z)`
3. Do the work
4. Append one line to `workspace/tasks-log.md`: `AUTO-NNN | <agent> | <ts> | done | <one-line result>`
5. Remove the task row from this file (or mark DONE — RED cleans up weekly)

**NEVER modify another agent's IN_PROGRESS row.**
**NEVER add tasks here — only RED does that (via Telegram or inner loop).**
