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
- [ ] research-to-eng pipeline cron running (adding now)
- [ ] ENG receives and acknowledges research brief
- [ ] First implementation shipped

### GOAL-004 — Cost Optimisation
**Owner:** FINANCE
**Horizon:** Q1 2026
**Status:** Active
**KPI:** Daily API spend < $15 (variable), cache hit rate > 60%

Sub-goals:
- [x] Budget guardrails configured
- [x] PAYG models removed from fallback chains
- [ ] FINANCE weekly cost report running

---

## Completed Goals

- **n8n webhook delegation** — ✅ 2026-02-28: 3 live workflows (echo-test, slack-post, github-repo-status), API key auth, credential isolation working
- **Semantic memory search** — ✅ 2026-02-28: qdrant + fastembed deployed, memsearch.py + rag_query.py, dashboard /api/search

## Icebox (future goals, not active)

- Multi-agent content factory pipeline
- Personal knowledge base with RAG ingestion
