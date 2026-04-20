#!/usr/bin/env bash
# boot-sequence.sh — Post-login boot sequence for RedOS.
# Waits for all services to be healthy, then runs token refresh + watchdog.
# Managed by: ai.openclaw.boot-sequence LaunchAgent (RunAtLoad=true, KeepAlive=false)
#
# This ensures zero human intervention is needed after a Mac Mini reboot.

set -uo pipefail

LOG="$HOME/.openclaw/logs/boot-sequence.log"
SCRIPTS="$HOME/.openclaw/scripts"
NODE="$(command -v node 2>/dev/null || echo /opt/homebrew/bin/node)"

log() { echo "$(date -u +%FT%TZ) [boot-sequence] $*" | tee -a "$LOG"; }

mkdir -p "$HOME/.openclaw/logs"
log "=== Boot sequence starting ==="

# ── Step 1: Wait for core services ─────────────────────────────────────────

wait_for() {
  local name="$1" url="$2" max="${3:-90}"
  local waited=0
  while ! curl -sf --connect-timeout 2 --max-time 3 "$url" > /dev/null 2>&1; do
    if [[ $waited -ge $max ]]; then
      log "WARN: $name not ready after ${max}s — continuing anyway"
      return 1
    fi
    sleep 5; waited=$((waited + 5))
  done
  log "OK: $name ready (${waited}s)"
}

wait_for "OpenClaw"     "http://127.0.0.1:18789/health"    90
wait_for "9Router"      "http://127.0.0.1:20128/v1/models" 90
wait_for "Dashboard"    "http://127.0.0.1:19000"           60
wait_for "n8n"          "http://127.0.0.1:5678"            60

log "All services healthy. Running post-boot tasks..."

# ── Step 2: 9Router token refresh (sync all providers) ─────────────────────
log "Running 9Router token refresh (--all)..."
if [[ -f "$SCRIPTS/9router-token-refresh.js" ]]; then
  "$NODE" "$SCRIPTS/9router-token-refresh.js" --all >> "$LOG" 2>&1 && \
    log "9Router token refresh: OK" || \
    log "WARN: 9Router token refresh exited non-zero (check log)"
else
  log "WARN: 9router-token-refresh.js not found — skipping"
fi

# ── Step 3: 9Router watchdog (disable expired, alert on stale) ─────────────
log "Running 9Router watchdog..."
if [[ -f "$SCRIPTS/9router-watchdog.sh" ]]; then
  ALERT=$(bash "$SCRIPTS/9router-watchdog.sh" --fix 2>&1 || true)
  if [[ -n "$ALERT" ]]; then
    log "9Router watchdog alert: $ALERT"
  else
    log "9Router watchdog: OK (no alerts)"
  fi
else
  log "WARN: 9router-watchdog.sh not found — skipping"
fi

# ── Step 4: Final health summary ────────────────────────────────────────────
log "=== Boot sequence complete ==="

SERVICES=(
  "OpenClaw|http://127.0.0.1:18789/health"
  "9Router|http://127.0.0.1:20128/v1/models"
  "Dashboard|http://127.0.0.1:19000"
  "n8n|http://127.0.0.1:5678"
)
for entry in "${SERVICES[@]}"; do
  name="${entry%%|*}"; url="${entry##*|}"
  if curl -sf --connect-timeout 2 --max-time 3 "$url" > /dev/null 2>&1; then
    log "  ✓ $name"
  else
    log "  ✗ $name — NOT RESPONDING"
  fi
done
