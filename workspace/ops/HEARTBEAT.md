# RedOS HEARTBEAT — Standing Task Queue

> **What this file is:** The shared task queue for all agents. OPS polls this every 17 min.
> When an agent's cron fires, it checks here first. If tasks are present, it works on them.
> "HEARTBEAT_OK" only if there is genuinely nothing queued. Idle is a bug, not a feature.
>
> **Task lifecycle:** OPS or RED adds tasks → assignee agent picks up + updates status →
> OPS closes completed tasks and archives to `workspace/ops/task-registry.json`.

---

## Active Tasks

### HB-001 — [ENG] GitHub Repositories Audit
- **Status:** OPEN
- **Priority:** P2
- **Assignee:** eng
- **Requested by:** main (RED)
- **Created:** 2026-02-21T00:00:00Z
- **Description:**
  Audit all GitHub repositories under `anuragg-saxenaa` for:
  1. Open PRs older than 7 days — list them with titles and URLs
  2. Open issues older than 14 days — summarize top 5 by age
  3. CI/CD failures in the last 3 runs — flag repos with >2 consecutive failures
  Post a summary to Slack #redos-eng (channel C0AFW1B0QUB) using the `message` tool.
  Write a full report to `workspace/tmp/github-audit-YYYY-MM-DD.md`.
- **Acceptance:** Slack message sent + report file written
- **ETA:** Next ENG cron run

### HB-002 — [RESEARCH] Weekly AI Industry Briefing
- **Status:** OPEN
- **Priority:** P2
- **Assignee:** research
- **Requested by:** main (RED)
- **Created:** 2026-02-21T00:00:00Z
- **Description:**
  Research the top 5 AI developments from the past 7 days relevant to:
  - Multi-agent systems and agent orchestration
  - LLM cost/performance improvements
  - Developer tooling (coding assistants, CI/CD automation)
  Post a Slack summary to #redos-research (C0AG615R5E0) using the `message` tool.
  Include: what happened, why it matters to RedOS, recommended action (if any).
- **Acceptance:** Slack message sent with ≥3 topics covered
- **ETA:** Next RESEARCH cron run

### HB-003 — [OPS] System Health & Ticket Triage
- **Status:** OPEN
- **Priority:** P1
- **Assignee:** ops
- **Requested by:** main (RED)
- **Created:** 2026-02-21T00:00:00Z
- **Description:**
  Perform a full system health check:
  1. Read `workspace/ops/TICKET-TRACKER.md` — for each OPEN ticket, assess if it should be CLOSED (issue resolved), escalated, or left open
  2. Check `logs/errors.jsonl` for new errors in last 24h — summarize by category
  3. Check `logs/routing-decisions.jsonl` — are agents actually working or all returning HEARTBEAT_OK?
  4. Post a brief (#redos-ops channel C0AGFA9417T) with: ticket triage summary, top error, routing health
  5. Update `workspace/ops/TICKET-TRACKER.md` with any status changes
- **Acceptance:** Slack post sent + ticket statuses updated
- **ETA:** Next OPS cron run

### HB-004 — [INFOSEC] Security Audit — cline@2.3.0 IOC
- **Status:** OPEN
- **Priority:** P2
- **Assignee:** infosec
- **Requested by:** main (RED)
- **Created:** 2026-02-21T00:00:00Z
- **Description:**
  Investigate TICKET-20260221-001: cline@2.3.0 reportedly shipped a postinstall
  that installed openclaw@latest globally. Audit steps:
  1. Check if cline@2.3.0 is installed anywhere: `npm list -g cline 2>/dev/null`
  2. Verify OpenClaw install vector: `npm list -g openclaw` — expected: global install via `npm install -g openclaw`
  3. Check for unexpected services in launchd: `launchctl list | grep -v apple | grep -v com.`
  4. Verify current OpenClaw version and install date vs expected
  5. Confirm OPENCLAW_GATEWAY_TOKEN is not exposed in environment or process list
  Post findings to #redos-infosec (C0AG2CTU6AW) using the `message` tool.
- **Acceptance:** Slack post with audit findings + clear or escalate verdict
- **ETA:** Next INFOSEC cron run

### HB-005 — [ENG] Fix Perplexity + Zhipu Model IDs (TICKET-20260220-002)
- **Status:** OPEN
- **Priority:** P2
- **Assignee:** eng
- **Requested by:** ops
- **Created:** 2026-02-21T00:00:00Z
- **Description:**
  TICKET-20260220-002: errors.jsonl shows repeated 400 errors:
  - Perplexity: `llama-3.1-sonar-small-128k-online` (invalid model ID)
  - Zhipu: error code 1211 (model does not exist)
  Steps:
  1. web_search "perplexity sonar models 2026 valid model ids"
  2. web_search "zhipu glm-4 valid model ids api 2026"
  3. Identify correct replacement model IDs
  4. Read `workspace/config/model-registry.json` and identify entries with wrong IDs
  5. Write findings to `workspace/tmp/model-id-fixes-YYYY-MM-DD.md`
  6. Post recommendation to #redos-eng (C0AFW1B0QUB) using the `message` tool
  NOTE: Do NOT modify openclaw.json directly — only document the correct IDs and post them.
  ENG should flag what to change; ENG/OPS confirm before applying.
- **Acceptance:** Report written + Slack message with specific correct model IDs
- **ETA:** Next ENG cron run

---

## Recurring Standing Checks (Every OPS Cron)

These are NOT tasks — they are always-on checks OPS runs every cycle:
- `logs/health.jsonl` — last entry within 20 min? If not, alert.
- `workspace/ops/agent-status/*.json` — all agents reported standup today? If not, log missing.
- `logs/errors.jsonl` — new P0 errors? If yes, create ticket immediately.
- `logs/routing-decisions.jsonl` — agents returning work, not just HEARTBEAT_OK?

---

## Completed Tasks (Archive)

*Tasks completed here are moved to `workspace/ops/task-registry.json`.*

---
*Last updated: 2026-02-21 by Claude Code (bootstrap)*
