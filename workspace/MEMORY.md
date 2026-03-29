# MEMORY.md - Long-term Memory

## System Architecture
- RED (CEO) → ZEN(allrounder), ENG, OPS, FINANCE, RESEARCH, INFOSEC
- Mac mini host: redinside's Mac mini
- Gateway port 18789, loopback-only (security hardening)
- exec security: allowlist mode, `ask: off` (immediate deny on miss — no 120s hangs)
- Models: primary `9router/free-unlimited` → fallback `9router/cc/claude-sonnet-4-6` → `9router/always-on-premium`
- OpenRouter key exhausted (403) — do NOT use `openrouter/auto` or any openrouter route

## System Status (as of 2026-03-29)
- **ALL SERVICES OPERATIONAL** — gateway, dashboard, n8n, 9router, cloudflared all running
- exec-approvals fixed: `ask: off` for all 8 agents + defaults (was `on-miss` causing 120s hangs)
- Telegram @RedinsideBot: confirmed OK
- iFlow Gmail connections expired (5 accounts) — re-auth needed at http://localhost:20128 → Providers

## Exec Approvals — Critical Config
- `ask: off` = immediate approve if allowlisted, immediate deny if not (no human wait)
- `ask: on-miss` = 120s human wait on unknown command → causes all agent timeouts → DO NOT USE
- File: `~/.openclaw/exec-approvals.json` (gitignored)

## Recent Decisions
- 2026-03-29: exec-approvals fixed ask→off for all agents (root cause of Telegram/factory/A2A outage)
- 2026-03-22: L3-001 APPROVED — per-agent allowExec scoping (security: full→allowlist)
- 2026-03-24: Competitive intel — GPT-5.4, Cursor Composer 2, Snyk Evo, Devin 2.0

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

## Pipeline Status
- RESEARCH → ENG: Weekly competitive intel + project specs
- ENG: active, OSS contributor cron running
- n8n webhooks: Slack inbound, GitHub events, tunnel sync
- 82 cron jobs in cron/jobs.json

## CONSULTANT Noise Issue
- CONSULTANT-OPS entries injected into AUTONOMOUS.md every ~17min by runtime/plugin trigger
- Root cause: known, low priority — manually clean when accumulates above 50KB
- health-monitor.sh auto-strips CONSULTANT blocks if AUTONOMOUS.md >50KB
