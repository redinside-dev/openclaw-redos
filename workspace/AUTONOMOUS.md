# AUTONOMOUS TASK QUEUE
# Format: **TASK-ID** | STATUS | agentId | description
# Statuses: PENDING → IN_PROGRESS → DONE
# Last reset: 2026-03-13 — cleared consultant loop noise, fixed cron model overrides

---

## ENG Tasks

**ENG-2026-0313-001** | IN_PROGRESS | eng | Read workspace/projects/backlog.md. Pick the next unstarted open-source project spec (GOAL-007). Create GitHub repo under redinside-dev/, implement MVP, open a PR, log result to workspace/projects/pr-log.md.

**ENG-2026-0313-002** | PENDING | eng | Coding factory run: check workspace-website-agency/leads.json for leads with no website. Pick 3 leads. Generate a simple HTML landing page for each. Save to workspace-website-agency/previews/<slug>.html. Log to workspace/logs/tasks-log.md.

---

## RESEARCH Tasks

**RESEARCH-2026-0313-001** | PENDING | research | Mine pain points for GOAL-007. Write 3 new project specs into workspace/projects/backlog.md. Each needs: problem statement, target user, MVP scope, recommended stack.

**RESEARCH-2026-0313-002** | PENDING | research | Competitive intelligence for GOAL-008 (website agency). Research top 3 AI-powered website agency competitors. Save findings to workspace/research/website-agency-competitive-intel.md.

---

## OPS Tasks

**OPS-2026-0313-001** | PENDING | ops | Post-fix health check: verify cron/jobs.json has no model overrides. Run openclaw doctor. Update TICKET-TRACKER.md — mark TICKET-20260313-006/007 as RESOLVED. Write summary to workspace/ops/health-check-post-fix.md.

**OPS-2026-0313-002** | PENDING | ops | Check workspace/memory/working-*.json for all agents. Identify any idle >24h. Send sessions_send wake-up to each with their next PENDING task from this file.

---

## FINANCE Tasks

**FINANCE-2026-0313-001** | PENDING | finance | Run weekly cost report. Read workspace/config/budget-guardrails.json. Estimate actual spend vs limits. Write report to workspace/finance/cost-report-2026-03-13.md. Send 3-line Telegram summary to RED.

---

## INFOSEC Tasks

**INFOSEC-2026-0313-001** | PENDING | infosec | Review workspace/ops/security-alert-2026-03-13.md. Classify each item as L1/L2/L3. Implement L1/L2 items directly. Write L3 proposals to workspace/infosec/security-proposals.md and ping RED.

---

## ZEN Tasks

**ZEN-2026-0313-001** | PENDING | allrounder | Check workspace-website-agency/leads.json. For leads that have a preview, draft an outreach SMS message (<160 chars) for each. Save drafts to workspace-website-agency/outreach-drafts.md. Do not send yet.

---

## HATAKE Tasks

**HATAKE-2026-0313-001** | PENDING | hatake | Lead gen for GOAL-008. Find 10 local small businesses (restaurants, salons, contractors) likely without websites. Add each to workspace-website-agency/leads.json: name, category, location, has_website=false.

---

## RED Tasks

**RED-2026-0313-001** | PENDING | main | Morning pulse: read STATE.yaml, GOALS.md, this file. Send 5-line status brief to Anurag via Telegram: goal statuses, top 3 active tasks, top blocker, plan for next 24h.
