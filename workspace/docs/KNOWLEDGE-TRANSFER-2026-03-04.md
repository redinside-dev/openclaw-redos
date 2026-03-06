# Knowledge Transfer — Consultant Session 2026-03-04

This document captures everything the external consultant fixed and learned during the 2026-03-04 session.
All agents should read this once and internalize the patterns.

## What Was Broken (Root Causes)

### 1. Gateway crash-loop (the most critical)
**Symptom:** `logs/gateway.err.log` full of "Secret provider 'default' is not configured"
**Root cause:** OpenClaw 2026.3.2 added strict secret provider validation. Any `apiKey: {source:"file", provider:"default"}` fails unless `secrets.providers.default` is configured in openclaw.json.
**Fix applied:** Added `secrets.providers.credentials-file = {source:"file", path:"credentials/secrets.json"}`. Updated all file-based apiKey refs to `provider:"credentials-file"`. Created `credentials/secrets.json` (chmod 600).
**How to diagnose in future:** `tail -20 ~/.openclaw/logs/gateway.err.log` → look for "Secret provider" errors
**How to fix in future:** Check `openclaw.json secrets.providers` section, verify credentials/secrets.json exists with 600 permissions

### 2. RAG completely broken
**Symptom:** `rag_query.py` throws `ONNXRuntimeError: model_optimized.onnx not found`
**Root cause:** fastembed model cache at `/var/folders/.../fastembed_cache/` was corrupted (partial download)
**Fix applied:** `rm -rf /var/folders/bs/srf_0gbd0y13hwm0_g5jvdcw0000gn/T/fastembed_cache/` → model re-downloaded on next run
**How to diagnose in future:** Run `~/.openclaw/.venv/bin/python3 workspace/scripts/rag_query.py "test" 2>&1` — look for ONNX errors
**Note:** memsearch.py uses fastembed (BAAI/bge-small-en-v1.5), NOT Ollama. nomic-embed-text is schema-rejected.

### 3. Dashboard v2 CronJobs tab broken
**Symptom:** Browser console shows 404 on GET /api/cron-jobs
**Fix applied:** Added GET `/api/cron-jobs` and GET `/api/state` routes to `dashboard/server.js`
**Fix applied:** Added `data.today` wrapper to `/api/analytics` response for v2 Overview tab

### 4. Telegram bot token leaked in git commit
**Symptom:** GitHub secret scanning email — token in `workspace/archive/2026-03/watchdog-security-audit.md`
**Root cause:** File was archived with raw token still inside, then committed
**Immediate fix:** Redact in file, push, rebuild RAG index (excluded `archive/` dir from indexing)
**Lesson:** Audit ANY file for secrets BEFORE staging. Archive ≠ safe. Run `git diff --cached | grep -E 'AAF[0-9]+|ghp_|[REDACTED] before every commit.

### 5. Agents idle (0 tasks dispatched)
**Root cause:** AUTONOMOUS.md had only 3 tasks for 8 agents. No auto-injection mechanism.
**Fix applied:**
- Backfilled AUTONOMOUS.md with 6 new tasks (one per idle agent)
- Added `ta[REDACTED] cron — auto-creates tasks for agents with 0 PENDING entries
- Added `accountability-daily-0001` cron — 23:55 audit of tasks-log.md per agent

## What Was Added / Changed

| File | Change |
|------|--------|
| `openclaw.json` | Added `secrets.providers.credentials-file`, updated apiKey refs |
| `credentials/secrets.json` | NEW — contains 9router + zai API keys (chmod 600, gitignored) |
| `dashboard/server.js` | Added GET /api/cron-jobs, GET /api/state, fixed analytics data.today wrapper |
| `cron/jobs.json` | Added ta[REDACTED] + accountability-daily-0001; fixed ideas-indexer channel |
| `workspace/SOUL.md` | Added doc-scan warning, cross-agent collab rules, Session End mandate, Security Mandate, CEO Operating Mandate, Knowledge Transfer Protocol |
| `workspace/HEARTBEAT.md` | Added STEP 0 security check + system state snapshot |
| `workspace/AUTONOMOUS.md` | 6 new tasks for idle agents (ENG/OPS/RESEARCH/FINANCE/INFOSEC/ALLROUNDER) |
| `workspace/STATE.yaml` | GOAL-006 complete, crons_enabled=37, consultant_handover date |
| `workspace/archive/2026-03/` | 21 stale docs archived (keep workspace/ clean) |
| `workspace/scripts/memsearch.py` | Added "archive" to EXCLUDE_DIRS (prevent indexing archived secrets) |
| `workspace/scripts/calculate-autonomy-score.js` | Added per-agent breakdown to STATE.yaml metrics |
| `workspace/memory/working-<agentId>.json` | Created for all 8 agents |
| `agents/main/CLAUDE.md` | Added CEO daily rhythm, security rules, system knowledge transfer |

## Pattern Library — Things to Know

### openclaw.json schema
- `embeddingModel` under `agents.defaults.memorySearch` → **REJECTED** by schema
- `gateway.ws.pingInterval` → **REJECTED** by schema
- Always run `openclaw doctor` after any change. 0 errors = valid.

### Secret providers in OpenClaw 2026.3.2+
- File-based apiKeys need an explicit `secrets.providers.<name>` entry
- Name it anything EXCEPT "default" (leave "default" unconfigured so env refs work via passthrough)
- Env refs (`source:"env", provider:"default"`) work WITHOUT any configured provider — they read from process.env

### memsearch.py
- Uses fastembed + qdrant (not Ollama)
- Cache at `/var/folders/bs/.../fastembed_cache/` — delete to reset
- EXCLUDE_DIRS now includes "archive" — archived files are NOT indexed
- Run with `--force` flag to rebuild from scratch

### Gateway crash → diagnosis flow
1. `launchctl list | grep ai.openclaw.gateway` — check exit code (should be 0)
2. `tail -30 ~/.openclaw/logs/gateway.err.log` — read the error
3. Common errors: secrets provider, missing credentials file, schema invalid
4. `openclaw doctor` — finds schema errors
5. `launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway` — restart

### Per-agent working memory
- All 8 agents now have `workspace/memory/working-<agentId>.json`
- Update at session end: `{"lastTask": "...", "status": "completed|blocked", "nextTask": "...", "timestamp": "..."}`
- This is how agents resume after a crash without losing context

## Agent Role Clarification (updated 2026-03-04)

| Agent | Role | Owns |
|-------|------|------|
| RED (main) | **CEO** — runs the company, not just dispatches tasks. Proactive, curious, decisive. 1-hour SLA for P0/P1. | AUTONOMOUS.md, GOALS.md, morning brief |
| ZEN (allrounder) | COO/general assistant — coordination, summaries, status reports | Status updates, week-in-review |
| ENG | Engineering — code, infra, dashboard, APIs | dashboard/server.js, openclaw.json changes |
| OPS | Operations — monitoring, crons, health checks, RAG | cron/jobs.json, memsearch, gateway health |
| RESEARCH | Analysis — market research, agent patterns, intel | workspace/research/, ideas feed |
| FINANCE | Financial — costs, subscriptions, budget compliance | cost-events.jsonl, weekly_cost_report.py |
| INFOSEC | Security — pre-merge reviews, credential audits | Approval queue, outbound URL allowlist |
| HATAKE | Internal parser — intent classification (internal only) | - |

## Next Priorities (for agents to work on)

1. **RESEARCH** (TASK-20260304-006): Scrape r/LocalLLaMA for agent autonomy patterns → brief for ENG
2. **FINANCE** (TASK-20260304-007): Run weekly_cost_report.py, verify $0 PAYG spend
3. **INFOSEC** (TASK-20260304-008): Pre-merge review of AgentShield code
4. **ENG** (TASK-20260304-004): Verify dashboard-v2 CronJobs tab works end-to-end
5. **OPS** (TASK-20260304-005): Full RAG verification + gateway health report
6. **ALLROUNDER** (TASK-20260304-009): Write week-in-review STATUS_UPDATE_2026-03-04.md
