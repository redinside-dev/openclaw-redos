# OPS Domain Knowledge Base

**Agent:** OPS (⚙️) | **Updated:** 2026-03-04

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
| Watchdog | — | `ai.openclaw.watchdog` | `launchctl kickstart -k gui/$(id -u)/ai.openclaw.watchdog` |

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

## Crons (37 enabled, all in cron/jobs.json)
- **Never hardcode `model`** in cron payloads — omit, use agent defaults
- **Never use ZAI/PAYG models** in crons
- After any cron change: run `openclaw doctor` to validate
- Cron delivery requires `delivery.to` (not `delivery.target`) + `delivery.channel`
- Session cleanup: `openclaw sessions cleanup --store ~/.openclaw/agents/{agent}/sessions/sessions.json --enforce --fix-missing`

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
