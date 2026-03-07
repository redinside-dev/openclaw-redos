#!/bin/bash
# config-drift-watchdog.sh — Detects OpenClaw config schema breakage after updates
# LaunchD: runs every 10 minutes via gateway-watchdog or standalone
# Alerts on Telegram if config becomes invalid before it causes a crash loop

set -uo pipefail

LOG="$HOME/.openclaw/logs/config-drift-watchdog.log"
ALERT_STATE="/tmp/openclaw-config-drift-alerted.txt"
COOLDOWN=1800  # 30 min alert cooldown

TS()  { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "[$(TS)] [config-drift-watchdog] $*" >> "$LOG"; }

. "$HOME/.openclaw/scripts/alert-lib.sh"

log "--- check ---"

# Validate config
RESULT=$(openclaw config validate 2>&1)
if echo "$RESULT" | grep -q "Config valid"; then
  log "OK: config valid"
  # Clear alert state if previously alerted
  if [[ -f "$ALERT_STATE" ]]; then
    log "RECOVERY: config valid again"
    send_telegram_direct "✅ <b>[OpenClaw]</b> Config is valid again. Gateway can start normally."
    rm -f "$ALERT_STATE"
  fi
  exit 0
fi

# Config is invalid
ERRORS=$(echo "$RESULT" | grep -E "Unrecognized|invalid|Missing" | head -5 | tr '\n' ' ')
log "ALERT: config invalid — $ERRORS"

# Cooldown check
NOW=$(date +%s)
LAST_ALERT=0
[[ -f "$ALERT_STATE" ]] && LAST_ALERT=$(cat "$ALERT_STATE" 2>/dev/null || echo 0)
AGE=$(( NOW - LAST_ALERT ))
if [[ $AGE -lt $COOLDOWN ]]; then
  log "Alert suppressed (sent ${AGE}s ago)"
  exit 1
fi

echo "$NOW" > "$ALERT_STATE"

OPENCLAW_VER=$(openclaw --version 2>/dev/null || echo "unknown")
send_telegram_direct "🚨 <b>[OpenClaw Config Drift]</b>
Config schema is INVALID after update to <code>${OPENCLAW_VER}</code>.
Agents will crash-loop until fixed.

Errors: <code>${ERRORS}</code>

Run on Mac Mini:
<code>openclaw doctor</code>
<code>bash ~/.openclaw/scripts/redos-restart.sh</code>"

log "ALERT sent"
exit 1
