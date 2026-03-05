#!/bin/bash
# watchdog-task-stall.sh — Stalled task detector + gateway health check
# LaunchD: ai.openclaw.watchdog (StartInterval=1800, every 30 min)
# Fixes the broken watchdog that was referencing a non-existent script.
# Also serves as a tertiary gateway check on a longer 30-min cadence.

set -uo pipefail

LOG="$HOME/.openclaw/logs/watchdog.log"
AUTONOMOUS_MD="$HOME/.openclaw/workspace/AUTONOMOUS.md"
TASKS_LOG="$HOME/.openclaw/workspace/logs/tasks-log.md"
OPENCLAW="/opt/homebrew/bin/openclaw"

TS() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "[$(TS)] [watchdog] $*" >> "$LOG"; }

. "$HOME/.openclaw/scripts/alert-lib.sh"

is_gateway_up() {
  curl -sf --connect-timeout 2 --max-time 4 \
    "http://127.0.0.1:18789/health" > /dev/null 2>&1
}

log "=== watchdog run start ==="

# ── Check 1: Gateway health (tertiary check, Layer 1 is primary) ─────────────
if ! is_gateway_up; then
  log "Gateway DOWN detected by watchdog — Layer 1 should already be handling this"
  # Layer 1 (gateway-watchdog, runs every 60s) will have already fired.
  # This is belt-and-suspenders; only alert if Layer 1 somehow missed it.
  LAYER1_LOG="$HOME/.openclaw/logs/gateway-watchdog.log"
  LAYER1_RECENT=$(tail -5 "$LAYER1_LOG" 2>/dev/null | grep -c "FIXED\|recovery\|CRITICAL" || echo "0")
  if [[ "$LAYER1_RECENT" -eq 0 ]]; then
    log "WARNING: Layer 1 watchdog doesn't seem to have acted — attempting repair"
    "$OPENCLAW" gateway install >> "$LOG" 2>&1 || true
    sleep 15
    if is_gateway_up; then
      log "Gateway repaired by fallback watchdog"
      send_telegram_direct "⚠️ <b>[OpenClaw Watchdog]</b> Gateway was DOWN and Layer 1 watchdog missed it. Repaired by 30-min watchdog at $(TS)."
    fi
  fi
fi

# ── Check 2: Detect stalled AUTONOMOUS.md tasks ──────────────────────────────
if [[ -f "$AUTONOMOUS_MD" ]]; then
  # Find IN_PROGRESS tasks older than 4 hours
  STALLED=$(grep -E "^\|.*IN_PROGRESS" "$AUTONOMOUS_MD" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$STALLED" -gt 5 ]]; then
    log "WARNING: $STALLED tasks stuck IN_PROGRESS — may indicate agent loops"
    send_slack_direct "⚠️ [OpenClaw Watchdog] $STALLED tasks stuck IN_PROGRESS in AUTONOMOUS.md. Possible agent loops."
  fi
fi

# ── Check 3: Worker processes alive ──────────────────────────────────────────
for AGENT in eng ops research; do
  if ! pgrep -f "autonomous-worker-v2.js --agent=${AGENT}" > /dev/null 2>&1; then
    log "WARNING: worker for agent '$AGENT' not running — attempting restart"
    launchctl kickstart "gui/$(id -u)/ai.openclaw.worker.${AGENT}" >> "$LOG" 2>&1 || true
  fi
done

log "=== watchdog run complete ==="
exit 0
