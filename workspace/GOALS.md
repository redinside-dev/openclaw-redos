# RedOS Goals — Shared across all agents

**RULES:**
- Only RED (main) updates this file
- All agents READ it at session start (via SOUL.md instruction)
- Goals drive inner-loop task selection — don't work on things not linked to a goal

---

## Active Goals (ordered by priority)

### GOAL-001 — 98% Autonomous Operation
**Owner:** RED
**Horizon:** Q1 2026
**Status:** In Progress
**KPI:** autonomy-scorecard ≥ 9/10 for 5 consecutive days

Sub-goals:
- [x] A2A functional (sessions_send verified working 2026-02-28)
- [x] L4 Telegram approval loop verified
- [x] Self-healing skills enabled
- [x] episodes.jsonl populated with real data (82 episodes seeded 2026-02-28, 30min seeder cron running)
- [x] autonomy-scorecard running nightly (autonomy-scorecard-daily-0001 cron, 9:05am ET)
- [x] Inner loop AUTONOMOUS.md task queue wired into eng/ops/research/infosec SOUL.md (2026-02-28)
- [ ] All inner loops executing without errors for 7 days

### GOAL-002 — Zero Silent Failures
**Owner:** OPS
**Horizon:** Q1 2026
**Status:** In Progress
**KPI:** 0 uncaught errors in gateway.err.log for 48h consecutive

Sub-goals:
- [x] self-healing-auto skill enabled
- [x] Proactive health scan in all inner loops
- [x] context-overflow-monitor running (context-overflow-monitor-0001, every 3h, lastStatus: ok)
- [ ] All stale tickets resolved or escalated

### GOAL-003 — Research→ENG Pipeline Live
**Owner:** RESEARCH
**Horizon:** Q1 2026
**Status:** Pending first run
**KPI:** At least 1 RESEARCH finding delivered to ENG per week, ENG implements 1+ quick win

Sub-goals:
- [x] First research brief written (topic: autonomous coding agent patterns, 2026-02-28)
- [x] research-to-eng pipeline cron running (verified 2026-03-04 — research-weekly-digest, market-factory, content-factory all wired)
- [ ] ENG receives and acknowledges research brief
- [ ] First implementation shipped

### GOAL-004 — Cost Optimisation
**Owner:** FINANCE
**Horizon:** Q1 2026
**Status:** Active
**KPI:** Daily variable spend ≤$1.00/day (50% reduction from ~$2.00 baseline), cache hit rate >60%

Sub-goals:
- [x] Budget guardrails configured (`workspace/config/budget-guardrails.json`)
- [x] PAYG models removed from fallback chains
- [x] 3-tier model routing added (Haiku/Sonnet/Opus) — see `routing-profiles.json`
- [x] Prompt caching config added (`cache_control: ephemeral` in routing-profiles.json)
- [x] Cost charts added to dashboard-v2 Cost Estimator tab
- [x] New gateway endpoints for cost visibility (`/api/mission-control/costs`, `/api/mission-control/savings`)
- [x] Prompt caching enabled — implemented in `gateway/resilient-handler.js` + OpenClaw handles natively for cc/ models (2026-03-04)
- [x] Batch API — cron payload `batch: true` flag supported by gateway/server.js (2026-03-02)
- [ ] FINANCE weekly cost report running — cron exists (`finance-weekly-cost-report-0001`), verify first successful run
- [ ] Subscription audit complete — ChatGPT Pro x2 utilization review (due 2026-04-01)

### GOAL-005 — Event-Driven Architecture
**Owner:** OPS
**Horizon:** Q2 2026
**Status:** ✅ COMPLETE (2026-03-02) — merged to main
**KPI:** ≤30 active cron jobs ✅, 80%+ external events via n8n webhooks ✅

Sub-goals:
- [x] Cron audit complete — 110 → 30 enabled (85 disabled, 115 total)
- [x] n8n workflow catalog documented (`workspace/skills/n8n-webhooks/SKILL.md`)
- [x] Event-driven classification guide created (`workspace/skills/event-driven-patterns/SKILL.md`)
- [x] Feature branch `feature/event-driven-mission-control` → merged to main (PR #2)
- [x] n8n github-events workflow built + GitHub webhook registered (webhook ID 598611413)
- [x] n8n slack-inbound-router workflow built
- [x] Cloudflare Tunnel configured + auto-sync on boot (launchd `ai.openclaw.tunnel-sync`)
- [x] Cron reduction: 40 → 30 ✅ (KPI met)
- [x] Validated: `python3 -c "import json; d=json.load(open('cron/jobs.json')); print(sum(1 for j in d['jobs'] if j.get('enabled',True)))"` → 30

---

## Completed Goals

- **GOAL-006 — Production Agent Reliability** — ✅ 2026-03-04 complete (deadline 2026-03-06). All sub-goals delivered: context engineering, force resolution pattern, coordination protocol, self-healing infrastructure, context audit.

- **n8n webhook delegation** — ✅ 2026-02-28: 3 live workflows (echo-test, slack-post, github-repo-status), API key auth, credential isolation working
- **Semantic memory search** — ✅ 2026-02-28: qdrant + fastembed deployed, memsearch.py + rag_query.py, dashboard /api/search

### GOAL-006 — Production Agent Reliability (Varick Agents patterns)
**Owner:** RED
**Horizon:** Q1 2026 (Complete by 2026-03-06 23:59 EST - 5 days)
**Status:** Active (added 2026-03-02)
**KPI:** A2A timeout rate <5%, blocked tasks auto-resolve <1h, agent completion rate >80%
**Inspiration:** [Vas @ Varick Agents ($3M ARR)](https://x.com/vasuman/status/2010473638110363839) — production agent patterns

**DEADLINE: 2026-03-06 23:59 EST (end of 5-day autonomous run)**

Sub-goals with deadlines:
- [x] **Context Engineering (P1) — DONE 2026-03-04**: a2a-handoff-protocol.md, knowledge bases (5 agents), a2a-retry in skills.entries, handoffs/ dir
  - Structured A2A handoff protocol with retry/fallback
  - Domain knowledge bases per agent (`workspace/knowledge/{agent}/`)
  - Cross-task memory chains in episodes.jsonl
  - **Owner:** ENG + OPS
  - **Deliverable:** `workspace/docs/a2a-handoff-protocol.md`, knowledge bases for 3+ agents, episodes.jsonl with context chains

- [x] **Force Resolution Pattern (P1) — DONE 2026-03-04**: watchdog LaunchAgent (30min), SLA escalation in handoff protocol, dependency blocking documented
  - Watchdog auto-remediation before alerts (upgrade 3 watchdog scripts)
  - SLA breach auto-escalation with context+suggested fixes
  - Block-on-failure for dependency chains
  - **Owner:** OPS + INFOSEC
  - **Deliverable:** 3 upgraded watchdog scripts with auto-remediation, SLA escalation handler, dependency blocker

- [x] **Coordination Protocol (P1) — DONE 2026-03-04**: a2a-retry skill active, sessions_send syntax fixed, conflict resolution protocol in handoff doc
  - Fix sessions_send timeout epidemic (TICKET-20260301-044)
  - Add retry/fallback for A2A communication
  - Conflict resolution for parallel work
  - **Owner:** ENG
  - **Deliverable:** sessions_send timeout fix deployed, retry logic implemented, conflict resolution protocol documented

- [x] **Self-Healing Infrastructure (P2) — DONE 2026-03-04**: di[REDACTED] + credential-health-check crons, watchdog auto-remediation, workspace-ops scripts deployed
  - Auto-rotate credentials (Perplexity/GitHub tokens)
  - Auto-provision missing files/paths (fix INFOSEC blockers)
  - Health monitors with remediation loops
  - **Owner:** OPS + ENG
  - **Deliverable:** Credential rotation cron, file provisioning script, 2+ health monitors with auto-fix

- [x] **Context Audit (P2) — DONE 2026-03-04**: SOUL.md audited + task templates + domain knowledge mandate, 5 agent knowledge bases created
  - Review all agent SOUL.md for domain knowledge gaps
  - Add structured context requirements to task templates
  - Measure context quality (track clarification requests)
  - **Owner:** RED + ALLROUNDER
  - **Deliverable:** SOUL.md audit report, updated task templates, context quality dashboard

**Daily Check-ins:** RED reviews progress at 09:00 EST daily, escalates blockers immediately
**Success Gate:** All P1 items (Days 2-3) must complete before P2 items start

**Key Insights:**
- Context is the whole game — agents without context are expensive random number generators
- Design for multiplication not replacement — let 3 people do what used to require 15
- Catch and resolve, don't report and review — dashboards are where problems go to die
- Architecture matters more than model selection — solo/parallel/collaborative is a bigger decision than which LLM
- Ship fast, improve constantly — 3 months max to production, not 12-month timelines

---

---

### GOAL-007 — 10 Open-Source Projects in 2 Months
**Owner:** RED (orchestrates) + RESEARCH (ideation) + ENG (implementation)
**Horizon:** 2026-03-05 → 2026-05-05 (8 weeks)
**Status:** 🟡 In Progress — ENG working PRJ-023 (ai-diff-shield MVP), backlog being generated
**KPI:** 10 public GitHub repos, each with: ≥1 real commit by an agent, README, open issues, PR log

**Pipeline (how it works):**
```
RESEARCH: pain point mining → project spec → workspace/projects/backlog.md
  ↓ (weekly, PRJ-NNN tasks injected by dispatcher)
ENG: picks spec → creates GitHub repo → implements MVP → opens PR → logs to PM-LOG.md
  ↓
RED: reviews PR log at 09:00 EST daily, posts weekly update to Slack
```

**Tracking:**
- Backlog: `workspace/projects/backlog.md` (RESEARCH owns)
- Per-project: `workspace/projects/<slug>/` → `PM-LOG.md`, `SPEC.md`, PRs
- PR log: `workspace/projects/pr-log.md` (auto-appended by ENG after each PR)
- Weekly digest: RED posts to `#redos-mission-control` every Monday 09:00 EST

**Project status board:**
| # | Slug | Status | Repo | Last PR |
|---|------|--------|------|---------|
| — | backlog | 🔄 RESEARCH mining pain points | — | — |

*(RESEARCH fills this table in backlog.md; ENG updates as repos are created)*

**Constraints:**
- All projects must be public GitHub repos under `redinside-dev/` org or `anuragg-saxenaa` account
- Each project: Node.js or Python (current stack), MIT license
- No approval needed for repo creation, commits, or PRs — these are L1/L2 autonomous actions
- ENG must open a PR (not push directly to main) so there is a reviewable artifact

---

### GOAL-008 — Fully Automated Website Agency
**Owner:** RED (orchestrates) + HATAKE (lead gen) + RESEARCH (audit) + ENG (build) + ZEN (outreach)
**Horizon:** Q1 2026 → Q2 2026 (4 weeks)
**Status:** 🟡 Starting — Infrastructure and skills created
**KPI:** 5+ converted clients per month, 80% automated outreach

**Pipeline:**
```
HATAKE: Google Maps → find businesses without websites → leads.json
  ↓
RESEARCH: audit website → grade A/B/C/D → audits.json
  ↓ (grade D)
ENG: generate custom website → preview URL → projects.json
  ↓
ZEN: send SMS preview → schedule AI voice call → close deal
  ↓
RED: approval (L4) → go live
```

**Tracking:**
- Leads: `workspace-website-agency/leads.json`
- Audits: `workspace-website-agency/audits.json`
- Projects: `workspace-website-agency/projects.json`
- Skills: `workspace/skills/lead-gen-maps/`, `website-auditor/`, `website-builder/`, `outreach-automation/`

**n8n webhooks needed:**
- `google-maps-search` - Find businesses
- `website-audit` - Analyze sites
- `website-builder` - Generate sites
- `sms-sender` - Send preview links
- `voice-call-schedule` - AI voice follow-up

**Skills created:**
- [x] `lead-gen-maps` (HATAKE)
- [x] `website-auditor` (RESEARCH)
- [x] `website-builder` (ENG)
- [x] `outreach-automation` (ZEN)

**Next steps:**
- [ ] Create n8n workflows for all webhooks
- [ ] Test lead-gen on a small batch (10 businesses)
- [ ] Run full pipeline end-to-end
- [ ] Set up cron jobs for daily automation

---

### GOAL-009 — RedOS Competitive Positioning Response
**Owner:** RED (orchestrates) + RESEARCH (messaging) + ENG (hardening)
**Horizon:** 2026-04-16 → 2026-04-23 (1 week)
**Status:** 🟡 Active
**KPI:** Public positioning statement live, community traction (HN/Reddit), RedOS hardening shipped

**Context:**
- Cursor Bugbot ships "Learned Rules" — agents learn from PR feedback, accumulating institutional memory
- Windsurf 2.0 × Devin integration live — cloud IDE agents, $20/mo floor, "laptop closed" persistence
- Both competitors converging on: institutional knowledge + cloud agents
- RedOS counter-positioning: "agents that ask before they act" — fundamentally different architecture (human-in-the-loop by default)

**Positioning decision (RED, 2026-04-16):** RedOS = **The accountable system operator**
- Tagline: "Agents that ask permission first"
- Core story: Cloud agents work while you sleep. But when Devin opens a PR at 3am — who's watching? RedOS agents run on your machine, pause for approval, and work across your whole system.
- Differentiator: Bugbot learned rules are a reaction to Devin's accountability gap. RedOS had it from day one.

**Sub-goals:**
- [x] Competitive brief reviewed by RED (2026-04-16)
- [ ] RESEARCH: Draft public positioning statement for HN + Reddit (Version A/B/C from brief)
- [ ] RESEARCH: Monitor Windsurf 2.0 adoption signals + track Devin Core vs RedOS trial sign-ups
- [ ] ENG: Audit RedOS onboarding — first 5 min must feel easier than installing Windsurf
- [ ] ENG: Verify OpenClaw agents work fully offline (no required cloud round-trips on startup)
- [ ] ENG: Confirm RedOS human-in-the-loop architecture is testable/demonstrable (demo scenario)
- [ ] ZEN: Identify "Devin exit ramp" community (devs burned by $500→$20 pricing pivot)

- [ ] RED: Post positioning to #redos-mission-control + Telegram to Anurag

**Tracking:** `workspace/research/competitive-2026-04-16.md`

---

## Icebox (future goals, not active)

- Personal knowledge base with RAG ingestion
