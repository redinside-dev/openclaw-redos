#!/bin/bash
# system-pulse.sh — deterministic health check, no LLM needed
# Called by OPS pulse cron every 5 minutes (Tier L2 — pre-approved)
# Writes result to workspace/tmp/pulse-last.json, only alerts on failure

set -euo pipefail

TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
PULSE_FILE="$HOME/.openclaw/workspace/tmp/pulse-last.json"
LOG="$HOME/.openclaw/workspace/logs/self-healing-ops.jsonl"
TG_TOKEN=$(python3 -c "import json; d=json.load(open('$HOME/.openclaw/openclaw.json')); bots=d.get('channels',{}).get('telegram',{}).get('bots',{}); print(list(bots.values())[0].get('token','') if bots else d.get('channels',{}).get('telegram',{}).get('botToken',''))" 2>/dev/null || echo "")
TG_CHAT="1012034994"

alert_telegram() {
  local msg="$1"
  if [ -n "$TG_TOKEN" ]; then
    curl -s --max-time 5 \
      "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
      -d "chat_id=${TG_CHAT}&text=${msg}" > /dev/null 2>&1 || true
  fi
}

GATEWAY_OK=false
OLLAMA_OK=false
ROUTER_OK=false
N8N_OK=false
RESTARTED=""

# ── Gateway check ─────────────────────────────────────────────────────────────
if curl -sf --max-time 3 http://127.0.0.1:18789/health > /dev/null 2>&1; then
  GATEWAY_OK=true
else
  echo "{\"ts\":\"$TS\",\"event\":\"gateway_down\",\"action\":\"restart\"}" >> "$LOG"
  bash "$HOME/.openclaw/scripts/redos-restart.sh" > /dev/null 2>&1 || true
  RESTARTED="gateway"
  alert_telegram "🔴 SYSTEM PULSE: Gateway was DOWN — auto-restarted at $TS"
  sleep 5
  curl -sf --max-time 3 http://127.0.0.1:18789/health > /dev/null 2>&1 && GATEWAY_OK=true || true
fi

# ── Ollama check ──────────────────────────────────────────────────────────────
if curl -sf --max-time 3 http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
  OLLAMA_OK=true
else
  echo "{\"ts\":\"$TS\",\"event\":\"ollama_down\",\"action\":\"restart\"}" >> "$LOG"
  launchctl start homebrew.mxcl.ollama 2>/dev/null || true
  RESTARTED="${RESTARTED:+$RESTARTED,}ollama"
  alert_telegram "🔴 SYSTEM PULSE: Ollama was DOWN — auto-restarted at $TS"
  sleep 5
  curl -sf --max-time 3 http://127.0.0.1:11434/api/tags > /dev/null 2>&1 && OLLAMA_OK=true || true
fi

# ── 9Router check ─────────────────────────────────────────────────────────────
if curl -sf --max-time 3 http://127.0.0.1:20128/ > /dev/null 2>&1; then
  ROUTER_OK=true
fi

# ── n8n check ─────────────────────────────────────────────────────────────────
if curl -sf --max-time 3 http://127.0.0.1:5678/healthz > /dev/null 2>&1; then
  N8N_OK=true
else
  echo "{\"ts\":\"$TS\",\"event\":\"n8n_down\",\"action\":\"restart\"}" >> "$LOG"
  launchctl stop ai.openclaw.n8n 2>/dev/null || true
  sleep 3
  launchctl start ai.openclaw.n8n 2>/dev/null || true
  RESTARTED="${RESTARTED:+$RESTARTED,}n8n"
  sleep 8
  curl -sf --max-time 3 http://127.0.0.1:5678/healthz > /dev/null 2>&1 && N8N_OK=true || \
    alert_telegram "🔴 SYSTEM PULSE: n8n DOWN and failed to restart at $TS"
fi

# ── Write pulse result ────────────────────────────────────────────────────────
python3 -c "
import json
result = {
  'ts': '$TS',
  'status': 'ok' if ($GATEWAY_OK and $OLLAMA_OK) else 'degraded',
  'agent': 'ops',
  'gateway': $GATEWAY_OK,
  'ollama': $OLLAMA_OK,
  'router': $ROUTER_OK,
  'n8n': $N8N_OK,
  'restarted': '$RESTARTED' or None
}
with open('$PULSE_FILE', 'w') as f:
    json.dump(result, f)
print('pulse written')
" 2>/dev/null || echo "{\"ts\":\"$TS\",\"status\":\"pulse_write_failed\"}" >> "$LOG"
