#!/bin/bash
# telegram-deadman.sh — Layer 2: Telegram Dead-Man's Switch
# LaunchD: ai.openclaw.telegram-deadman (StartInterval=300)
# Fires when: gateway is UP but Telegram has been silent >15 minutes.
# This catches the case where the gateway process is alive but Telegram
# providers have silently disconnected (stale socket, bot API timeout, etc.)

set -uo pipefail

LOCK="/tmp/openclaw-telegram-deadman.lock"
LOG="$HOME/.openclaw/logs/telegram-deadman.log"
GATEWAY_LOG="$HOME/.openclaw/logs/gateway.log"
ALERT_STATE="/tmp/openclaw-telegram-deadman-alerted.txt"
DEAD_THRESHOLD=1800  # 30 minutes in seconds (only real sendMessage/messageReceived counts)
STARTUP_GRACE=180    # 3 minutes — don't kill a gateway that just started
OPENCLAW="/opt/homebrew/bin/openclaw"

TS() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "[$(TS)] [telegram-deadman] $*" >> "$LOG"; }

. "$HOME/.openclaw/scripts/alert-lib.sh"

is_gateway_up() {
  curl -sf --connect-timeout 2 --max-time 4 \
    "http://127.0.0.1:18789/health" > /dev/null 2>&1
}

# macOS-compatible lock (flock not available on macOS without util-linux)
LOCK_DIR="${LOCK}.d"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then exit 0; fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null' EXIT

log "--- check ---"

# Defer to Layer 1 if gateway is already down
if ! is_gateway_up; then
  log "Gateway DOWN — Layer 1 watchdog handles this. Exiting."
  exit 0
fi

# Find most recent REAL Telegram activity in gateway.log
# Only count actual message traffic — not bot startup lines.
# "starting provider" lines fire on every gateway restart and would mask true silence.
LAST_LINE=$(grep -E '\[telegram\].*(sendMessage ok|messageReceived)' \
  "$GATEWAY_LOG" 2>/dev/null | tail -1)

if [[ -z "$LAST_LINE" ]]; then
  log "WARN: no Telegram activity lines found in gateway.log"
  exit 0
fi

# Parse timestamp: "2026-03-05T01:47:12.454Z [telegram] ..."
# BSD date on macOS: strip fractional seconds before converting
RAW_TS=$(echo "$LAST_LINE" | awk '{print $1}')
CLEAN_TS="${RAW_TS%%.*}"    # remove fractional seconds
CLEAN_TS="${CLEAN_TS%Z}"    # remove trailing Z if no fractional part

LAST_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%S" "$CLEAN_TS" +%s 2>/dev/null || echo 0)
NOW_EPOCH=$(date +%s)
AGE=$(( NOW_EPOCH - LAST_EPOCH ))

log "Last Telegram activity: $CLEAN_TS (${AGE}s ago, threshold=${DEAD_THRESHOLD}s)"

# ── STARTUP GRACE: never kill a gateway that just started ─────────────────────
# If the most recent telegram line is a "starting provider" within STARTUP_GRACE,
# the gateway is still initialising — give it time, don't restart.
if [[ $AGE -lt $STARTUP_GRACE ]]; then
  log "OK: Telegram active ${AGE}s ago (within startup grace ${STARTUP_GRACE}s)"
  if [[ -f "$ALERT_STATE" ]]; then
    log "RECOVERY: Telegram reconnected at $(TS)"
    send_telegram_direct "✅ <b>[OpenClaw]</b> Telegram bots reconnected at $(TS). Last activity was ${AGE}s ago."
    send_slack_direct "✅ [OpenClaw] Telegram reconnected at $(TS). Was silent, now active."
    rm -f "$ALERT_STATE"
  fi
  exit 0
fi

# ── HEALTHY PATH ──────────────────────────────────────────────────────────────
if [[ $AGE -lt $DEAD_THRESHOLD ]]; then
  log "OK: Telegram active ${AGE}s ago"
  if [[ -f "$ALERT_STATE" ]]; then
    log "RECOVERY: Telegram reconnected at $(TS)"
    send_telegram_direct "✅ <b>[OpenClaw]</b> Telegram bots reconnected at $(TS). Last activity was ${AGE}s ago."
    send_slack_direct "✅ [OpenClaw] Telegram reconnected at $(TS). Was silent, now active."
    rm -f "$ALERT_STATE"
  fi
  exit 0
fi

# ── TELEGRAM SILENT > 15 MIN WITH GATEWAY UP ──────────────────────────────────
log "ALERT: Telegram silent ${AGE}s — restarting gateway to reconnect providers"

# Attempt: SIGTERM gateway so launchd restarts it → providers reinitialize
pkill -f "openclaw.*gateway" >> "$LOG" 2>&1 || true
sleep 30

# Check if real Telegram activity appeared after restart
NEW_LINE=$(grep -E '\[telegram\].*(sendMessage ok|messageReceived)' \
  "$GATEWAY_LOG" 2>/dev/null | tail -1)
NEW_TS=$(echo "$NEW_LINE" | awk '{print $1}')
NEW_CLEAN="${NEW_TS%%.*}"
NEW_CLEAN="${NEW_CLEAN%Z}"
NEW_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%S" "$NEW_CLEAN" +%s 2>/dev/null || echo 0)
NEW_AGE=$(( $(date +%s) - NEW_EPOCH ))

if [[ $NEW_AGE -lt 60 ]]; then
  log "FIXED: Telegram providers reconnected after gateway restart"
  send_telegram_direct "🔧 <b>[OpenClaw AutoRecovery]</b>
Telegram bots were silent for $(( AGE / 60 )) minutes.
Fixed at $(TS) by restarting gateway.
All bots reconnecting..."
  send_slack_direct "🔧 [OpenClaw] Telegram reconnected at $(TS) after $(( AGE / 60 ))min silence"
  rm -f "$ALERT_STATE"
  exit 0
fi

# Still dead — alert with 15-min cooldown to avoid spam
NOW_EPOCH=$(date +%s)
LAST_ALERT=0
[[ -f "$ALERT_STATE" ]] && LAST_ALERT=$(cat "$ALERT_STATE" 2>/dev/null || echo 0)
AGE_SINCE_ALERT=$(( NOW_EPOCH - LAST_ALERT ))

if [[ $AGE_SINCE_ALERT -lt 900 ]]; then
  log "Alert suppressed (sent ${AGE_SINCE_ALERT}s ago)"
  exit 0
fi

echo "$NOW_EPOCH" > "$ALERT_STATE"
SILENT_MINS=$(( AGE / 60 ))
log "CRITICAL: Telegram still dead after restart — sending alert"

send_telegram_direct "🔇 <b>[OpenClaw]</b> Telegram bots silent ${SILENT_MINS} minutes.
Gateway restart did not fix it.

Check:
<code>tail -50 ~/.openclaw/logs/gateway.log | grep telegram</code>
<code>openclaw gateway install</code>"

send_slack_direct "🔇 [OpenClaw] Telegram silent ${SILENT_MINS}min. Gateway restart failed. Manual check needed."
exit 1
