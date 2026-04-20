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

# Config is invalid — AUTO-FIX FIRST, then alert if still broken
ERRORS=$(echo "$RESULT" | grep -E "Unrecognized|invalid|Missing" | head -5 | tr '\n' ' ')
log "Config invalid — attempting auto-fix via doctor --fix: $ERRORS"

openclaw doctor --fix >> "$LOG" 2>&1 || true

# Re-check after fix
RESULT2=$(openclaw config validate 2>&1)
if echo "$RESULT2" | grep -q "Config valid"; then
  log "FIXED: doctor --fix resolved config issues"
  # Restart gateway so it picks up the fixed config
  bash "$HOME/.openclaw/scripts/redos-restart.sh" > /dev/null 2>&1 || true
  send_telegram_direct "✅ <b>[OpenClaw AutoFix]</b> Config drift detected and auto-fixed.
Invalid keys removed, gateway restarted.
Was: <code>$ERRORS</code>"
  rm -f "$ALERT_STATE"
  exit 0
fi

# Still broken after fix — escalate
log "ALERT: doctor --fix could not resolve — $ERRORS"

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
send_telegram_direct "🚨 <b>[OpenClaw Config Drift — NEEDS MANUAL FIX]</b>
Config is INVALID and auto-fix failed (v<code>${OPENCLAW_VER}</code>).

Errors: <code>${ERRORS}</code>

Run: <code>openclaw doctor --fix &amp;&amp; bash ~/.openclaw/scripts/redos-restart.sh</code>"

log "ALERT sent"
exit 1
