# AUTONOMOUS.md - Automated Task Dispatcher

**RULES (read before doing anything):**
- Dispatcher only picks up PENDING tasks. If nothing is PENDING, it stops.
- Each agent claims ONE task at a time. Mark IN_PROGRESS with timestamp when claiming.
- When done: append result to `workspace/tasks-log.md` and remove from this file (or mark DONE).
- Never re-add completed tasks. Never leave a task IN_PROGRESS for >90 minutes.

---

## P0 — BLOCKED (needs human, do not touch)

- AUTO-031 | ops | **BLOCKED — needs user**: Rotate Slack credentials (xoxb-/xapp- in backups). Waiting on user to rotate via Slack dashboard. | blocked:2026-03-05
- AUTO-032 | eng | **BLOCKED — needs user**: Purge Slack tokens from git history. Risky — needs user approval before git filter-repo. | blocked:2026-03-05

---

## P1 — PENDING (ready to claim)

- AUTO-033 | infosec | **Fix access-control observability**: Create `workspace/security/trust_scores.json`, `access_control/active_grants.json`, `access_control/pending_requests.json` (chmod 600). Write at least 1 entry to `workspace/security/audit_log/` to verify logging works. Report path and file sizes to tasks-log.md. | 2026-03-05T01:30:00Z
- PRJ-001 | research | **Project Backlog: Research 10 OSS project ideas** — see GOAL-007 in GOALS.md. Run web_search for developer pain points (LLM tooling, agent infra, devtools). Score each on: feasibility (1-5), market need (1-5), buildable in 2 weeks (Y/N). Write ranked list to `workspace/projects/backlog.md`. Min 10 ideas, top 3 must be buildable with current stack (Node/Python/GitHub). | 2026-03-05T01:30:00Z
- PRJ-002 | eng | **Project template**: Create `workspace/projects/_template/` with: README.md, SPEC.md, PM-LOG.md, and a GitHub repo creation script (`scripts/create-project-repo.sh`). Use `gh repo create` with `--public --clone`. This template will be used for all 10 projects. | 2026-03-05T01:30:00Z

## P2 — PENDING

- AUTO-027 | eng | Path validation fix: Implement workspace path validation to prevent path escapes (TICKET-20260301-037). Add check at top of any file-write tool call. Log violations to `workspace/logs/security.log`. | 2026-03-04T16:36:00Z
- AUTO-033b | ops | Credential monitoring: Script to detect "no credentials for provider: openai" errors in gateway.err.log and Slack-alert when found (TICKET-20260301-038). Write to `scripts/credential-error-monitor.sh`, wire into cron. | 2026-03-04T16:36:00Z

---

## Task Status Legend
- **PENDING**: Ready to be claimed by the assigned agent
- **IN_PROGRESS [timestamp]**: Being worked on now
- **DONE**: Completed — remove from this file, log to tasks-log.md
- **BLOCKED**: Cannot proceed — reason stated, waiting on dependency

## Agent Assignment Rules
- P1 before P2. Security before product. But BLOCKED tasks → skip entirely.
- If your assigned task is BLOCKED, pick the next PENDING task in your domain.
- Dispatcher spawns agents every 15min. Heartbeat runs every 30min.
