# OPS Domain Knowledge Base

**Agent:** OPS (⚙️) | **Updated:** 2026-03-04 (Session 5)

---

## Infra Map

| Service | Port | launchd label | Restart command |
|---------|------|---------------|-----------------|
| OpenClaw gateway | 18789 | `ai.openclaw.gateway` | `launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway` |
| Dashboard | 19000 | `ai.openclaw.dashboard` | `launchctl kickstart -k gui/$(id -u)/ai.openclaw.dashboard` |
| n8n | 5678 | `ai.openclaw.n8n` | `launchctl kickstart -k gui/$(id -u)/ai.openclaw.n8n` |
| 9Router | 20128 | `ai.openclaw.9router` | `launchctl kickstart -k gui/$(id -u)/ai.openclaw.9router` |
| Ollama | 11434 | `homebrew.mxcl.ollama` | `launchctl kickstart -k gui/$(id -u)/homebrew.mxcl.ollama` |
| Cloudflared | — | `ai.openclaw.cloudflared` | `launchctl kickstart -k gui/$(id -u)/ai.openclaw.cloudflared` |
| Watchdog (30min) | — | `ai.openclaw.watchdog` | `launchctl kickstart -k gui/$(id -u)/ai.openclaw.watchdog` |
| Gateway Watchdog (60s) | — | `ai.openclaw.gateway-watchdog` | `launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway-watchdog` |
| Telegram Deadman (5min) | — | `ai.openclaw.telegram-deadman` | `launchctl kickstart -k gui/$(id -u)/ai.openclaw.telegram-deadman` |
| Boot Guard (boot-time) | — | `ai.openclaw.boot-guard` | runs once at login |

## 4-Layer Gateway Resilience System (deployed 2026-03-04)

The gateway has a 4-layer auto-recovery system. **Do NOT manually intervene** unless all 4 layers have failed.

| Layer | What | Interval | Action |
|-------|------|----------|--------|
| 0 | n8n "🛡️ OpenClaw Guardian" (ID: ZD7ljvVjdj9OvosQ) | 2 min | External; tries `openclaw gateway install` + kickstart; Telegram alert |
| 1 | `ai.openclaw.gateway-watchdog` launchd | 60s | Bash; same repair; direct Telegram via @OPSRED_BOT |
| 2 | `ai.openclaw.telegram-deadman` launchd | 5 min | Detects silent Telegram providers; kills gateway to force reinit |
| 3 | `ai.openclaw.boot-guard` launchd | boot only | Validates plist entrypoint post-upgrade |

**Manual repair (if all layers fail):**
```bash
openclaw gateway install
openclaw node restart
```

**Root cause of 2026-03-04 outage:** Post-upgrade launchd entrypoint mismatch (`dist/index.js node run` → `dist/entry.js gateway`). After any `npm update -g openclaw`, always run `openclaw gateway install`.

**Alert bot:** @OPSRED_BOT sends all watchdog alerts to admin (chat_id 1012034994).
**Token file:** `workspace/config/telegram-bot-token.txt` (contains OPS_BOT token)

## Full Stack Restart
```bash
bash ~/.openclaw/scripts/redos-restart.sh
# Check status without restart:
bash ~/.openclaw/scripts/redos-restart.sh --status
```

## Health Checks
```bash
# All services
bash ~/.openclaw/scripts/redos-restart.sh --status

# Gateway logs (live)
tail -f ~/.openclaw/logs/gateway.err.log

# n8n logs
tail -f ~/.openclaw/logs/n8n.log

# Ollama models
curl -s http://127.0.0.1:11434/api/tags | python3 -c "import json,sys; [print(m['name']) for m in json.load(sys.stdin)['models']]"

# 9router models
curl -s http://127.0.0.1:20128/v1/models | python3 -c "import json,sys; [print(m['id']) for m in json.load(sys.stdin)['data']]"
```

## Model Routing — Cost Control

| Task | Model to use |
|------|-------------|
| Health checks, heartbeats, dispatch | `ollama/qwen3.5:4b` (free, local) |
| Standard monitoring, analysis | `9router/free-unlimited` |
| Complex infra decisions | `9router/subagent-reliable` |

Ollama is the default for OPS loops. If Ollama is down, fallback to `9router/free-unlimited`. Never use ZAI/PAYG in any OPS cron.

## Crons (37+ enabled, all in cron/jobs.json)
- **Never hardcode specific model versions** in cron payloads — use routing profiles or omit (uses agent default)
- **Exception**: specifying tier (e.g. `"model":"ollama/qwen3.5:4b"`) is allowed for mechanical crons to force local model
- **Never use ZAI/PAYG models** in crons
- After any cron change: run `openclaw doctor` to validate
- Cron delivery requires `delivery.to` (not `delivery.target`) + `delivery.channel`
- **SOUL.md size limit**: OpenClaw truncates SOUL.md at 20,000 chars. Monitor with: `wc -c ~/.openclaw/workspace/SOUL.md` — alert RED if it exceeds 18,000
- Session cleanup: `openclaw sessions cleanup --store ~/.openclaw/agents/{agent}/sessions/sessions.json --enforce --fix-missing`

## Loop Detection
- OpenClaw logs `"Loop warning: exec called 30 times with identical arguments"` when a session loops
- Check: `grep "Loop warning" /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log | tail -5`
- Cause: agent calling same exec/rag_query.py repeatedly without progress
- Fix: simplify the cron payload — remove any "read LEARNINGS.md" or "run rag_query.py" pre-steps from dispatcher/heartbeat crons

## Ollama Rules
- Service: `homebrew.mxcl.ollama` (headless) — NOT Ollama.app
- Currently installed: `qwen3.5:4b` (3GB)
- DELETED: `llama3.1:8b`, `qwen2.5-coder:7b`
- If Ollama.app spawns: kill it + `launchctl disable "gui/$(id -u)/com.electron.ollama"`
- Force evict model: `curl -X POST http://127.0.0.1:11434/api/generate -d '{"model":"<name>","keep_alive":0,"prompt":"","stream":false}'`

## Pre-approved Self-Healing Actions (no Telegram approval needed)
- Restart any service via launchctl
- Archive session files > 50MB
- Run `openclaw doctor`
- Restore 9router db.json from backup when < 1KB
- Run disk cleanup in logs/ and workspace/tmp/
- Truncate log files > 1MB older than 7 days

## Critical Files
| File | Purpose |
|------|---------|
| `cron/jobs.json` | 37 cron definitions |
| `workspace/ops/TICKET-TRACKER.md` | Open tickets |
| `workspace/ops/LEARNINGS.md` | 99+ lessons (append only) |
| `workspace/ops/health-monitor-state.json` | Health check state |
| `workspace/tasks-log.md` | Task completion log (append only) |
| `workspace/STATE.yaml` | Live shared state |

## Disk Cleanup Runbook
```bash
# Truncate large logs (>1MB, >7 days)
find ~/.openclaw/logs -name '*.log' -mtime +7 -size +1M -exec truncate -s 1M {} \;
# Clear tmp
find ~/.openclaw/workspace/tmp -mtime +3 -type f -delete
# Clear pycache
find ~/.openclaw/workspace -name '__pycache__' -type d -exec rm -rf {} + 2>/dev/null
# Check disk
df -h ~/.openclaw | tail -1
```
