# AUTONOMOUS.md - Task Queue for Inner Loops

This is the central task queue for autonomous agents. Tasks are assigned by RED (CEO) and claimed by agents (eng, ops, research, infosec, finance).

## Format

```markdown
YYYY-MM-DDTHH:MM:SSZ | DISPATCHER | AUTO-NNN | agentId | priority | task description | status | timestamp
```

## Priority Levels
- P0: System down, immediate action required
- P1: High priority, resolve within 24h
- P2: Medium priority, resolve within 3 days
- P3: Low priority, resolve when possible

## Active Tasks

### GOAL-006 — Production Agent Reliability (Varick Agents patterns)
**Owner:** RED
**Horizon:** Q1 2026 (Complete by 2026-03-06 23:59 EST - 5 days)
**Status:** Active (added 2026-03-02)
**KPI:** A2A timeout rate <5%, blocked tasks auto-resolve <1h, agent completion rate >80%
**Inspiration:** [Vas @ Varick Agents ($3M ARR)](https://x.com/vasuman/status/2010473638110363839) — production agent patterns

**DEADLINE: 2026-03-06 23:59 EST (end of 5-day autonomous run)**

Sub-goals with deadlines:
- [ ] **Context Engineering (P1) — DUE: 2026-03-03 23:59 EST (Day 2)**
  - Structured A2A handoff protocol with retry/fallback
  - Domain knowledge bases per agent (`workspace/knowledge/{agent}/`)
  - Cross-task memory chains in episodes.jsonl
  - **Owner:** ENG + OPS
  - **Deliverable:** `workspace/docs/a2a-handoff-protocol.md`, knowledge bases for 3+ agents, episodes.jsonl with context chains

- [ ] **Force Resolution Pattern (P1) — DUE: 2026-03-04 23:59 EST (Day 3)**
  - Watchdog auto-remediation before alerts (upgrade 3 watchdog scripts)
  - SLA breach auto-escalation with context+suggested fixes
  - Block-on-failure for dependency chains
  - **Owner:** OPS + INFOSEC
  - **Deliverable:** 3 upgraded watchdog scripts with auto-remediation, SLA escalation handler, dependency blocker

- [ ] **Coordination Protocol (P1) — DUE: 2026-03-04 23:59 EST (Day 3)**
  - Fix sessions_send timeout epidemic (TICKET-20260301-044)
  - Add retry/fallback for A2A communication
  - Conflict resolution for parallel work
  - **Owner:** ENG
  - **Deliverable:** sessions_send timeout fix deployed, retry logic implemented, conflict resolution protocol documented

- [ ] **Self-Healing Infrastructure (P2) — DUE: 2026-03-05 23:59 EST (Day 4)**
  - Auto-rotate credentials (Perplexity/GitHub tokens)
  - Auto-provision missing files/paths (fix INFOSEC blockers)
  - Health monitors with remediation loops
  - **Owner:** OPS + ENG
  - **Deliverable:** Credential rotation cron, file provisioning script, 2+ health monitors with auto-fix

- [ ] **Context Audit (P2) — DUE: 2026-03-06 23:59 EST (Day 5)**
  - Review all agent SOUL.md for domain knowledge gaps
  - Add structured context requirements to task templates
  - Measure context quality (track clarification requests)
  - **Owner:** RED + ALLROUNDER
  - **Deliverable:** SOUL.md audit report, updated task templates, context quality dashboard

**Daily Check-ins:** RED reviews progress at 09:00 EST daily, escalates blockers immediately
**Success Gate:** All P1 items (Days 2-3) must complete before P2 items start

## Task Queue

### 2026-03-04T05:04:00Z | DISPATCHER | AUTO-013 | eng | P2 | Validate all fallback model chains in openclaw.json | DONE | 2026-03-04T14:30:00Z — ops llama3.1:8b→qwen3.5:4b fixed, defaults primary fixed

### 2026-03-04T05:04:00Z | DISPATCHER | AUTO-022 | ops | P2 | GOAL-006 Self-Healing Infrastructure (DUE: 2026-03-05 23:59 EST): Auto-rotate credentials (Perplexity/GitHub tokens), auto-provision missing files/paths (fix INFOSEC blockers), create health monitors with remediation loops. Deliverable: Credential rotation cron, file provisioning script, 2+ health monitors with auto-fix | PENDING | 2026-03-04T05:04:00Z

### 2026-03-04T05:34:00Z | DISPATCHER | AUTO-023 | ops | P2 | GOAL-006 Self-Healing Infrastructure (DUE: 2026-03-05 23:59 EST): Auto-rotate credentials (Perplexity/GitHub tokens), auto-provision missing files/paths (fix INFOSEC blockers), create health monitors with remediation loops. Deliverable: Credential rotation cron, file provisioning script, 2+ health monitors with auto-fix | DISPATCHED | 2026-03-04T05:34:00Z

### 2026-03-04T06:40:00Z | RESEARCH | TASK-20260304-001 | research | P1 | Run Terminal-Bench baseline evaluation (1 day) - Execute internal Terminal-Bench before public commitment | IN_PROGRESS | 2026-03-04T12:05:17Z

### 2026-03-04T06:40:00Z | ENG | TASK-20260304-002 | eng | P1 | AgentShield security integration (0.5 days) - Integrate everything-claude-code security framework (102 rules, 1282 tests) | IN_PROGRESS | 2026-03-04T12:05:17Z

### 2026-03-04T06:40:00Z | OPS | TASK-20260304-003 | ops | P1 | Python package updates (0.5 hours) - Upgrade pip (26.0 → 26.0.1) and other system packages | PENDING | 2026-03-04T06:40:00Z

### 2026-03-04T15:15:00Z | CONSULTANT | TASK-20260304-004 | eng | P1 | Dashboard reliability: (1) Verify GET /api/cron-jobs returns data at http://localhost:19000/api/cron-jobs, (2) Verify GET /api/state returns STATE.yaml data, (3) Test dashboard-v2 CronJobs tab at http://localhost:19000/v2/ — confirm it loads job list, (4) Run: cd ~/.openclaw/dashboard-v2 && npm run build, post result to #redos-mission-control | PENDING | 2026-03-04T15:15:00Z

### 2026-03-04T15:15:00Z | CONSULTANT | TASK-20260304-005 | ops | P1 | RAG verification + gateway health: (1) Run: ~/.openclaw/.venv/bin/python3 ~/.openclaw/workspace/scripts/rag_query.py "sessions_send timeout" — confirm non-empty results, (2) Run: ~/.openclaw/scripts/index-episodes.sh, (3) Run openclaw status and confirm gateway is reachable, (4) Post health summary to #redos-mission-control | PENDING | 2026-03-04T15:15:00Z

### 2026-03-04T15:15:00Z | CONSULTANT | TASK-20260304-006 | research | P2 | Social monitoring intelligence brief: (1) Scrape r/LocalLLaMA + r/MachineLearning for agent autonomy patterns (last 7 days) using existing reddit-service workflow, (2) Identify top 3 pain points relevant to multi-agent coordination, (3) Write brief to workspace/research/agent-patterns-brief-2026-03-04.md, (4) sessions_send to ENG with brief summary for backlog | PENDING | 2026-03-04T15:15:00Z

### 2026-03-04T15:15:00Z | CONSULTANT | TASK-20260304-007 | finance | P1 | Weekly cost verification: (1) Run ~/.openclaw/workspace/scripts/weekly_cost_report.py and confirm no errors, (2) Check workspace/logs/cost-events.jsonl for any anomalies (PAYG spend should be $0), (3) Verify subscription usage: confirm ChatGPT Pro x2 is still flagged in STATE.yaml, (4) Append 3-line cost summary to workspace/ops/LEARNINGS.md | PENDING | 2026-03-04T15:15:00Z

### 2026-03-04T15:15:00Z | CONSULTANT | TASK-20260304-008 | infosec | P1 | AgentShield pre-merge review: (1) Review AgentShield code in TASK-20260304-002 before ENG merges, (2) Audit outbound URL allowlist in openclaw.json tools.web section, (3) Check if any new credentials added in this session are properly gitignored (credentials/secrets.json, credentials/zai-api-key.txt), (4) Post approval/block decision to ENG via sessions_send | PENDING | 2026-03-04T15:15:00Z

### 2026-03-04T15:15:00Z | CONSULTANT | TASK-20260304-009 | allrounder | P1 | Week-in-review summary: Write workspace/STATUS_UPDATE_2026-03-04.md covering: (1) What broke this week and was fixed (RAG, gateway crash-loop, dashboard), (2) Current agent reliability metrics from STATE.yaml, (3) Top 3 things the team learned this week, (4) Recommended priorities for next 3 days. Post summary to #redos-mission-control Slack | PENDING | 2026-03-04T15:15:00Z

## Completed Tasks

### 2026-03-04T05:34:00Z | DISPATCHER | AUTO-023 | ops | P2 | GOAL-006 Self-Healing Infrastructure (DUE: 2026-03-05 23:59 EST): Auto-rotate credentials (Perplexity/GitHub tokens), auto-provision missing files/paths (fix INFOSEC blockers), create health monitors with remediation loops. Deliverable: Credential rotation cron, file provisioning script, 2+ health monitors with auto-fix | DISPATCHED | 2026-03-04T05:34:00Z

## Task Creation

When creating new tasks:
1. Only RED (main) adds tasks to AUTONOMOUS.md
2. Tasks must be linked to an active GOAL
3. Assign an owner (eng/ops/research/infosec/finance)
4. Set priority (P0-P3)
5. Include clear deliverable and deadline

## Agent Workflow

1. Read SOUL.md → GOALS.md → STATE.yaml → AUTONOMOUS.md at session start
2. Claim one PENDING task by updating status to IN_PROGRESS with timestamp
3. Execute task without asking for approval (unless Level 2+ approval required)
4. Update task status to COMPLETE when done
5. Log to workspace/logs/dispatch.jsonl with taskId, agentId, timestamp, task description, learnings applied