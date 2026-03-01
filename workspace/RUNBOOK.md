# RedOS Runbook — What We Run

Single reference for crons, skills, RAG, and dashboard. Update when adding/removing jobs or skills.

---

## 1. Restart and validate

```bash
# Restart full stack after any config change
bash ~/.openclaw/scripts/redos-restart.sh

# Check status only
bash ~/.openclaw/scripts/redos-restart.sh --status

# Validate openclaw.json (run before every restart)
openclaw doctor
```

---

## 2. Cron jobs

**Source:** `cron/jobs.json`  
**Count:** ~100 jobs (gateway loads at startup).  
**Rule:** Never hardcode `model` in payloads; use agent defaults. See `workspace/ops/OPENCLAW-STANDARDS.md` for full checklist.

### Key job categories

| Category | Examples |
|----------|----------|
| **Standups** | `sa-*-checkin-0001` (RED, ENG, RESEARCH, FINANCE, OPS, INFOSEC); `0e518762-...` OPS Scrum Master rollup |
| **Daily summary / brief** | `a5bdd899-...` RED CEO Daily Summary to Anurag (Telegram); `14c3b159-...` RED Daily Brief (9am — includes Tasks for today + AI-recommended tasks) |
| **Approvals** | `telegram-approval-monitor-0001` — RED checks pending L4/L5 approvals every 2 min |
| **Autonomy & state** | `autonomy-scorecard-daily-0001` (9:05am ET M–F) → Slack + AUTONOMY-SCORE-*.json + STATE.yaml; `ops-state-sync-0001` (11pm) → STATE.yaml metrics |
| **Threshold alerts** | `dashboard-threshold-alerts-0001` (10:30 & 16:30 M–F) — autonomy_score < 6 or high gateway errors → Telegram + #redos-ops |
| **Habit check-in** | `habit-check-in-daily-0001` (8am daily) — Telegram prompt; user reply recorded via habit-tracker skill |
| **Earnings tracker** | `earnings-tracker-weekly-0001` (Monday 7am) — FINANCE posts upcoming earnings to Slack + Telegram via web_search |
| **RAG** | `semantic-memory-reindex-0001` (3am) — rebuild vector index via `~/.openclaw/.venv/bin/python3 .../memsearch.py index` |
| **A2A / pipelines** | `a2a-eng-reads-research-0001`, `a2a-infosec-reviews-eng-0001`, `a2a-friday-retro-0001`, `a2a-red-morning-team-pulse-0001`; research→ENG intake crons |
| **Inner loops** | `inner-loop-main-0001`, `inner-loop-eng-0001`, etc. — each agent reads STATE/AUTONOMOUS/TICKET and acts |
| **Health** | `system-pulse-always-on-0001`, `c8481b2a-...` System Health Watch, `ops-disk-monitor-daily-2026-02-22`, `cron-watchdog` |
| **Episodes** | `episodes-seeder-0001` (every 30 min 8–22) — seeds episodes.jsonl from cron state |

---

## 3. Skills

**Location:** `workspace/skills/` — each skill has a `SKILL.md` (declarative).  
**Count:** 43.  
**Config:** `openclaw.json` → `skills.entries` (all enabled); per-agent `skills` arrays subset by role.

### Critical skills (all agents should know)

| Skill | Purpose |
|-------|---------|
| `maker-checker` | L0–L5 risk tiers; L3 INFOSEC A2A; L4/L5 Telegram approval |
| `telegram-approvals` | L4/L5 human-in-the-loop format and pending queue |
| `tool-call-validator` | Preflight + exec tier + A2A logging before every call |
| `a2a-transparency` | Post to Slack before spawn; log to a2a-delegations.jsonl |
| `a2a-verify` | A2A checklist, smoke tests, enforcement |
| `semantic-memory` | RAG: memsearch.py + rag_query.py over workspace |
| `rag-url-ingestion` | Save URL/article → workspace/kb/*.md → reindex RAG |
| `habit-tracker` | Daily habit check-in; record to workspace/habits/habit-log.md; optional weekly summary |
| `earnings-tracker` | Upcoming earnings this week via web_search; symbols from workspace/config/earnings-symbols.json; FINANCE posts to Slack + Telegram |
| `autonomy-scorecard` | Daily 1–10 score (OPS runs); writes AUTONOMY-SCORE-*.json |
| `self-healing-auto` / `self-healing-protocol` | Auto-fix, tickets, LEARNINGS.md |
| `n8n-webhooks` | Credential-isolated external API calls via webhooks |

---

## 4. RAG (semantic memory)

- **Search:** `~/.openclaw/.venv/bin/python3 ~/.openclaw/workspace/scripts/memsearch.py "query" --top 5`
- **RAG context:** `~/.openclaw/.venv/bin/python3 ~/.openclaw/workspace/scripts/rag_query.py "question" --top 4`
- **Reindex:** `~/.openclaw/.venv/bin/python3 ~/.openclaw/workspace/scripts/memsearch.py index` (OPS cron 3am)
- **Index:** `~/.openclaw/.memsearch/qdrant/` · Model: BAAI/bge-small-en-v1.5 · Chunks: 600/80
- **When:** For workspace policy/config/feature questions, agents must run rag_query first (SOUL.md).

---

## 5. Dashboard (Mission Control)

- **URL:** `http://127.0.0.1:19000` · Auth: `red` / `redos2026`
- **Launchd:** `ai.openclaw.dashboard`

### Key APIs

| Endpoint | Purpose |
|----------|---------|
| `/api/pipeline` | Research→ENG pipeline, idea validator state |
| `/api/analytics` | Episodes, traces |
| `/api/agents` | Agent list and status |
| `/api/tickets` | TICKET-TRACKER summary |
| `/api/search?q=...&top=5` | Semantic search (uses memsearch.py via venv) |
| `/api/health` | Gateway health |
| `/api/errors` / `/api/gateway-errors` | Error logs |

---

## 6. Key file locations

| File | Purpose |
|------|---------|
| `workspace/SOUL.md` | Operating principles; session start + RAG rule |
| `workspace/STATE.yaml` | Sprint, per-agent focus, pipelines, metrics |
| `workspace/AUTONOMOUS.md` | Task queue (RED adds; eng/ops/research/infosec claim) |
| `workspace/ops/TICKET-TRACKER.md` | Open/resolved tickets; SLA |
| `workspace/ops/LEARNINGS.md` | Post-resolution learnings |
| `workspace/ops/AUTONOMY-SCORE-*.json` | Daily scorecard output (OPS) |
| `workspace/ops/OPENCLAW-STANDARDS.md` | OpenClaw standards checklist (Part 3.3) |
| `workspace/logs/a2a-delegations.jsonl` | A2A dispatch/result log |
| `workspace/logs/episodes.jsonl` | Completed task episodes |
| `cron/jobs.json` | All cron definitions |

---

*Last updated: 2026-03-01 — World-class improvement plan Phase 1*
