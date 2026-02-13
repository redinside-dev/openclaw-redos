# RedTeam OS — Organization Structure (Draft)

This document defines how RED and ZEN operate as a coordinated “two-agent org” inside OpenClaw, plus how we handle research/finance/app deliverables, rollbacks, and change control.

## Goals

- Keep **all existing chains and deliverables stable** (no breaking changes).
- Add new work in **new, isolated departments/modules** unless explicitly approved.
- Maintain a **rollback point** before every config/code change.
- Produce **structured, repeatable reports** (Trade Pot + daily briefs + cron summaries).

## Roles & Responsibilities

### RED (CEO / Main Coordinator) — @RedinsideBot (agentId: `main`)
**Owns:**
- Architecture decisions, change control, security posture, release management
- Final review for patches that touch shared config/routing/cron
- “Morning package” assembly (what’s ready, what’s blocked, what changed)

**Delivers:**
- System health + security audit summary
- Cron jobs status + run history highlights
- Consolidated tracker updates

### ZEN (CSO/CTO / All‑rounder) — @ZenRedBot (agentId: `allrounder`)
**Owns:**
- Fast research, drafts, first-pass analyses
- Finance/portfolio report generation and improvements
- Proposing new features/skills (with risk notes)

**Delivers:**
- Daily market/AI/OpenClaw trends brief
- Holdings/trade analysis reports (inputs → outputs, with artifacts)
- Recommendations + “what to do next” options

### Shared Department Lanes

- **RESEARCH:** web_search driven work, competitive scans, “what’s new” monitoring
- **FINANCE:** holdings/trade analysis, Trade Pot, risk flags, daily market lead notes
- **APPS/ENG:** code repos, PRs, CI, automation scripts/skills
- **OPS:** cron, dashboards, health/security, backups/rollback

## Change Control (Do-Not-Break Policy)

Rules:
1) No modifications to existing chains (routing, cron schedules, dashboards) without:
   - a clear reason
   - an explicit rollback plan
   - a quick verification step
2) Prefer additive changes: new file / new skill / new cron job rather than edits.
3) Any config change must have:
   - pre-change backup
   - post-change verification command

## Rollback Mechanism (Standard)

### OpenClaw config changes
Before patching `~/.openclaw/openclaw.json`:
- Create a timestamped backup:
  - `cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak.YYYYMMDD-HHMMSS`

Rollback:
- `cp ~/.openclaw/openclaw.json.bak.<ts> ~/.openclaw/openclaw.json`
- `openclaw gateway restart`

### Repo/code changes
- Always commit on a feature branch.
- Ensure `origin` is configured.
- Push after tests pass.

Rollback options:
- `git revert <commit>` (preferred for shared branches)
- or reset (only if safe/private)

## Operational Artifacts (System of Record)

- **Tracker:** `COMBINED_TASK_TRACKER.md`
- **Daily tasks:** `DAILY_TASKS.md` (RED) and `ZEN_DAILY_TASKS.md` (ZEN)
- **Knowledgebase:** `KNOWLEDGEBASE.md`
- **Weekly rollup:** `WEEKLY_SUMMARY.md`
- **Reports:** `portfolio/reports/` + `portfolio/last-*.json`

## Reporting Expectations (Morning Package)

Minimum:
- Trade Pot / trade analyzer output
- Holdings analyzer output
- Cron job status (what ran, what failed, what’s next)
- Anything changed since last check (config patches, security posture)

---
Last updated: 2026-02-09
