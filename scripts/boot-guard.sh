#!/bin/bash
# boot-guard.sh — Layer 3: Startup/Boot Guard
# LaunchD: ai.openclaw.boot-guard (RunAtLoad=true, runs ONCE per login)
# Catches the exact failure mode from today: openclaw upgrades and
# the gateway plist references a stale entrypoint path.
# Waits 60s for stack to initialize, then validates and repairs gateway.

set -uo pipefail

LOG="$HOME/.openclaw/logs/boot-guard.log"
OPENCLAW="/opt/homebrew/bin/openclaw"
GATEWAY_PLIST="$HOME/Library/LaunchAgents/ai.openclaw.gateway.plist"

TS() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "[$(TS)] [boot-guard] $*" | tee -a "$LOG"; }

. "$HOME/.openclaw/scripts/alert-lib.sh"

is_gateway_up() {
  local token
  token=$(python3 -c "import json; print(json.load(open('$HOME/.openclaw/openclaw.json'))['gateway']['auth']['token'])" 2>/dev/null || echo "")
  curl -sf --connect-timeout 3 --max-time 15 \
    -H "Authorization: Bearer ${token}" \
    "http://127.0.0.1:18789/health" > /dev/null 2>&1
}

log "=== Boot guard starting — waiting 60s for stack to initialize ==="
sleep 60

log "Running post-boot gateway checks..."

REPAIRED=0

# Check 1: Is ai.openclaw.gateway registered with launchd?
if ! launchctl list ai.openclaw.gateway > /dev/null 2>&1; then
  log "CHECK 1 FAIL: ai.openclaw.gateway not registered — running openclaw gateway install"
  "$OPENCLAW" gateway install >> "$LOG" 2>&1 || true
  sleep 15
  REPAIRED=1
fi

# Check 2: Does the plist file exist?
if [[ ! -f "$GATEWAY_PLIST" ]]; then
  log "CHECK 2 FAIL: gateway plist missing — running openclaw gateway install"
  "$OPENCLAW" gateway install >> "$LOG" 2>&1 || true
  sleep 15
  REPAIRED=1
fi

# Check 3: Does the binary referenced in the plist actually exist on disk?
# This catches the post-upgrade entrypoint mismatch (today's root cause)
if [[ -f "$GATEWAY_PLIST" ]]; then
  NODE_BIN=$(grep -A5 "ProgramArguments" "$GATEWAY_PLIST" | \
    grep "<string>" | head -1 | sed 's|.*<string>||;s|</string>.*||')
  if [[ -n "$NODE_BIN" ]] && [[ ! -x "$NODE_BIN" ]]; then
    log "CHECK 3 FAIL: plist binary missing or not executable: $NODE_BIN"
    log "Running openclaw gateway install to fix entrypoint mismatch"
    "$OPENCLAW" gateway install >> "$LOG" 2>&1 || true
    sleep 15
    REPAIRED=1
  else
    log "CHECK 3 OK: plist binary exists: $NODE_BIN"
  fi
fi

# Check 4: Is gateway actually responding?
if is_gateway_up; then
  log "CHECK 4 OK: gateway healthy on port 18789"
  if [[ $REPAIRED -eq 1 ]]; then
    send_telegram_direct "✅ <b>[OpenClaw Boot Guard]</b> Gateway was repaired at boot ($(TS)). System healthy."
  fi
  send_slack_direct "✅ [OpenClaw Boot] Gateway healthy at boot $(TS)"
  log "=== Boot guard complete — all checks PASSED ==="
  exit 0
fi

# Gateway still not up — try one more repair
log "CHECK 4 FAIL: gateway not responding — attempting final repair"
"$OPENCLAW" gateway install >> "$LOG" 2>&1 || true
sleep 20

if is_gateway_up; then
  log "Final repair succeeded — gateway up at $(TS)"
  send_telegram_direct "✅ <b>[OpenClaw Boot Guard]</b> Gateway repaired at boot $(TS). System healthy."
  send_slack_direct "✅ [OpenClaw Boot] Gateway repaired at boot $(TS)"
  log "=== Boot guard complete — repaired and HEALTHY ==="
  exit 0
fi

log "=== Boot guard FAILED: gateway not healthy after all repairs ==="
send_telegram_direct "🚨 <b>[OpenClaw Boot Guard]</b>
Gateway NOT healthy after boot ($(TS)).
Manual fix required:
<code>openclaw gateway install
openclaw node restart</code>"
send_slack_direct "🚨 [OpenClaw Boot] Gateway unhealthy after boot. Manual: openclaw gateway install"
exit 1
