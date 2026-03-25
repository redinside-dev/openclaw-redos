# MEMORY.md - Long-term Memory

## System Architecture
- RED (CEO) → ZEN(allrounder), ENG, OPS, FINANCE, RESEARCH, INFOSEC
- Mac mini host: redinside's Mac mini
- Gateway port 18789, loopback-only (security hardening)
- exec security: allowlist mode (P0 DEADLOCK as of 2026-03-24 — human restart needed)
- All cron sessions via minimax fallback (openrouter hitting 403s)

## Critical Current Issues
- **TICKET-20260324-OPS-002 (P1, SLA BREACHED):** exec allowlist blocks ALL exec incl `openclaw` binary → gateway deadlock → Gmail/automation down. Human must run `openclaw gateway stop && start` on Mac mini. Escalated to Anurag 2026-03-24 ~13:06 ET.
- **TICKET-20260324-ENG-001 (P1, SLA BREACHED):** Provider health gating + fallback circuit breaker — ENG ownership
- **TICKET-20260324-ENG-003 (P0):** Telemetry pipelines dark (routing-decisions, health, cost logs)
- **TICKET-20260324-ENG-004 (P1):** Agent-session liveness gate before spawn/retry loops

## Recent Decisions
- 2026-03-22: L3-001 APPROVED — per-agent allowExec scoping (security: full→allowlist)
- 2026-03-24: Competitive intel findings from RESEARCH — GPT-5.4, Cursor Composer 2, Snyk Evo, Devin 2.0
- exec allowlist caused deadlock (ironic — security hardening caused automation outage)

## Anurag Saxena
- Telegram: 1012034994
- Timezone: America/Toronto
- Building: RedOS (multi-agent org), website agency automation, 10 OSS repos pipeline
- Prefers direct answers, dislikes silent failures and ticket clutter
- OK with late-night automation

## Coding Factory — 3 Pipelines (as of 2026-03-25)

**Pipeline 1 — RESEARCH → ENG (new OSS projects):**
RESEARCH writes SPEC.md to workspace/projects/<slug>/ + adds ENG task to AUTONOMOUS.md.
ENG implements, creates anuragg-saxenaa/<slug> repo, opens PR.
Cron: inner-loop-eng-0001 (every 4h) + inner-loop-research-0001 (every 3h).

**Pipeline 2 — Daily OSS Contributor:**
Cron: oss-contributor-0001 (daily 11am ET). ENG picks today's repo by day-of-week, fixes one issue, opens PR.
Repos: decolua/9router (Mon/Sun), affaan-m/everything-claude-code (Tue), FellouAI/eko (Wed), sigoden/llm-functions (Thu), PathOnAIOrg/LiteMultiAgent (Fri), coasty-ai/open-computer-use (Sat).

**Pipeline 3 — On-Demand PR requests (RED → ENG):**
Anurag tells RED (Telegram) to fix issues on a repo. RED writes ENG task to AUTONOMOUS.md.
ENG picks it up next inner-loop run. Opens individual PRs per issue. Logs to pr-log.md.
Current pending: ENG-2026-0325-001..005 for affaan-m/everything-claude-code issues #843,#842,#807,#832,#829.

## Pipeline Status
- RESEARCH → ENG: Weekly competitive intel + project specs
- HATAKE → leads.json (blocked: workspace-website-agency/ missing)
- ENG backlog: 17/17 shipped, pipeline dry as of 2026-03-22
- n8n webhooks: Slack inbound, GitHub events, tunnel sync
- 84 cron jobs total; ENG has 10 active crons

## CONSULTANT Noise Issue
- CONSULTANT-OPS entries are injected into AUTONOMOUS.md by an unknown source (not in cron/jobs.json — likely a runtime/plugin trigger)
- OPS task OPS-2026-0325-001: find and disable the source
- Workaround: manually clean file when noise accumulates
