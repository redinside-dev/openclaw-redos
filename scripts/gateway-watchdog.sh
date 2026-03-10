#!/bin/bash
# gateway-watchdog.sh — Layer 1: Gateway Auto-Healer
# LaunchD: ai.openclaw.gateway-watchdog (StartInterval=60)
# Completely external to OpenClaw. Runs every 60 seconds.
# Detects port 18789 down → auto-repairs → alerts via direct Telegram API.

set -uo pipefail

LOCK="/tmp/openclaw-gw-watchdog.lock"
LOG="$HOME/.openclaw/logs/gateway-watchdog.log"
STATE="/tmp/openclaw-gw-down-since.txt"
ALERT_COOLDOWN="/tmp/openclaw-gw-alert-sent.txt"
OPENCLAW="/opt/homebrew/bin/openclaw"
GATEWAY_PLIST="$HOME/Library/LaunchAgents/ai.openclaw.gateway.plist"

TS() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "[$(TS)] [gateway-watchdog] $*" >> "$LOG"; }

# Source shared alert helpers
. "$HOME/.openclaw/scripts/alert-lib.sh"

is_gateway_up() {
  curl -sf --connect-timeout 2 --max-time 4 \
    "http://127.0.0.1:18789/health" > /dev/null 2>&1
}

#  only one instance runs at a time; skip if already running
exec 9>"$LOCK"
flock -n 9 || exit 0

log "--- check ---"

# ── HEALTHY PATH ─────────────────────────────────────────────────────────────
if is_gateway_up; then
  log "OK: port 18789 healthy"
  # If we had previously detected a failure, send recovery alert
  if [[ -f "$STATE" ]]; then
    DOWN_SINCE=$(cat "$STATE" 2>/dev/null || echo "unknown")
    FIXED_AT=$(TS)
    log "RECOVERY: was down since $DOWN_SINCE, now up at $FIXED_AT"
    send_telegram_direct "🔧 <b>[OpenClaw AutoRecovery]</b>
Gateway came back up at $FIXED_AT
Was down since: $DOWN_SINCE
All Telegram bots reconnecting..."
    send_slack_direct "🔧 [OpenClaw AutoRecovery] Gateway up at $FIXED_AT (was down since $DOWN_SINCE)"
    rm -f "$STATE" "$ALERT_COOLDOWN"
  fi
  exit 0
fi

# ── GATEWAY IS DOWN ───────────────────────────────────────────────────────────
# Record first detection time
if [[ ! -f "$STATE" ]]; then
  TS > "$STATE"
  log "FIRST DETECTION: gateway down at $(TS)"
fi
DOWN_SINCE=$(cat "$STATE" 2>/dev/null || echo "unknown")
log "Gateway DOWN (since $DOWN_SINCE) — starting repair sequence"

# ── Attempt 1: openclaw gateway install ──────────────────────────────────────
log "Attempt 1: openclaw gateway install"
"$OPENCLAW" gateway install >> "$LOG" 2>&1 || true
sleep 12

if is_gateway_up; then
  FIXED_AT=$(TS)
  log "FIXED by Attempt 1 (gateway install) at $FIXED_AT"
  send_telegram_direct "🔧 <b>[OpenClaw AutoRecovery]</b>
Gateway was DOWN since $DOWN_SINCE
Fixed at $FIXED_AT by: <code>openclaw gateway install</code>
All Telegram bots reconnecting..."
  send_slack_direct "🔧 [OpenClaw AutoRecovery] Gateway fixed at $FIXED_AT via gateway install"
  rm -f "$STATE" "$ALERT_COOLDOWN"
  # Restart node host to reconnect to new gateway
  "$OPENCLAW" node restart >> "$LOG" 2>&1 || true
  exit 0
fi

# ── Attempt 2: launchctl kickstart ───────────────────────────────────────────
log "Attempt 2: launchctl kickstart"
UID_VAL=$(id -u)
launchctl kickstart -k "gui/${UID_VAL}/ai.openclaw.gateway" >> "$LOG" 2>&1 || {
  # Service may not be registered — try loading the plist first
  log "kickstart failed, trying launchctl load"
  launchctl load "$GATEWAY_PLIST" >> "$LOG" 2>&1 || true
}
sleep 12

if is_gateway_up; then
  FIXED_AT=$(TS)
  log "FIXED by Attempt 2 (kickstart) at $FIXED_AT"
  send_telegram_direct "🔧 <b>[OpenClaw AutoRecovery]</b>
Gateway was DOWN since $DOWN_SINCE
Fixed at $FIXED_AT by: launchctl kickstart
All Telegram bots reconnecting..."
  send_slack_direct "🔧 [OpenClaw AutoRecovery] Gateway fixed at $FIXED_AT via kickstart"
  rm -f "$STATE" "$ALERT_COOLDOWN"
  "$OPENCLAW" node restart >> "$LOG" 2>&1 || true
  exit 0
fi

# ── All attempts failed — alert with 15-minute cooldown ──────────────────────
NOW_EPOCH=$(date +%s)
LAST_ALERT=0
[[ -f "$ALERT_COOLDOWN" ]] && LAST_ALERT=$(cat "$ALERT_COOLDOWN" 2>/dev/null || echo 0)
AGE_SINCE_ALERT=$(( NOW_EPOCH - LAST_ALERT ))

if [[ $AGE_SINCE_ALERT -lt 900 ]]; then
  log "CRITICAL: all repairs failed (alert suppressed, sent ${AGE_SINCE_ALERT}s ago)"
  exit 1
fi

echo "$NOW_EPOCH" > "$ALERT_COOLDOWN"
log "CRITICAL: all repairs failed — sending alert"

send_telegram_direct "🚨 <b>[OpenClaw CRITICAL]</b>
Gateway has been DOWN since $DOWN_SINCE
Auto-recovery FAILED after 2 attempts.

Manual fix:
<code>openclaw gateway install
openclaw node restart</code>

Check log: <code>~/.openclaw/logs/gateway-watchdog.log</code>"

send_slack_direct "🚨 [OpenClaw CRITICAL] Gateway DOWN since $DOWN_SINCE. Auto-recovery FAILED. Manual: openclaw gateway install"
exit 1
