# Organization Structure (RedTeam)

Last updated: 2026-02-09 (America/Toronto)

## Mission
Operate OpenClaw as a reliable, conservative, stocks-only assistant system that produces repeatable daily/weekly outputs (reports, dashboards, alerts) with clear rollback paths.

## Roles (current)

### Red — CEO / Main Coordinator
**Primary responsibility:** Owns final decision-making, prioritization, integration, and delivery.

**Typical duties**
- Breaks work into tasks and assigns to Zen/sub-agents.
- Ensures code/config changes are minimal, reviewed, and reversible.
- Ensures commits are pushed and CI (if present) is green.

### Zen — CSO/CTO / All-rounder
**Primary responsibility:** Research, architecture, reliability, and execution support.

**Typical duties**
- Investigates tooling issues (search, models, skills, integrations) and proposes fixes.
- Produces structured briefs and documentation.
- Implements safe, minimal patches with explicit rollback steps.

## Departments / “Chains”
We treat each automation/reporting stream as a department.

1) **OPS (Reliability)**
- Gateway health, browser tool health, cron integrity, backups/rollback.

2) **RESEARCH (Signals)**
- Daily AI + OpenClaw trends; new skills/workflows; security/supply-chain notes.

3) **FINANCE (Stocks-only)**
- Portfolio review, market briefs, watchlists, trade pot reporting.

4) **ENG (Build/Repo)**
- PR tracking, CI status, code changes, deploy/runbooks.

## Operating Rules (to prevent breakage)
- Primary agent model stays **openai-codex/gpt-5.2**.
- Web search provider: Perplexity; model id: **sonar**.
- Any change must have: **(1) backup, (2) minimal patch, (3) verification, (4) rollback**.
- **Projects live only under** `Development / Codebase / Projects/` (org policy).
- **Only approved projects** should be updated unless Anurag expands the list.
- OpenClaw workspace/config is **local-only** until backup/recovery strategy is defined.
- Changes are restricted to the **new department** unless explicitly discussed.

## Communication
- Telegram is the single source of truth for updates.
- Daily structured status should be available by morning.
