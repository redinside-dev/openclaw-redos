#!/bin/bash
# l3-meta-meta-loop.sh — L3 supervisor-of-supervisors
# LaunchD: ai.openclaw.l3-meta-loop (StartInterval=120)
# Every 2 min, this script checks that the L0/L1/L2 layers are alive:
#   - L0: gateway-watchdog heartbeat (updated every 60s)
#   - L1: redos-self-healer (runs on 10-min cron)
#   - L2: agent-health-watchdog (this layer's peers; updates every 120s)
# If any layer is dead, this script respawns it via launchd. This is
# the "what watches the watchmen" loop.
set -uo pipefail

LOCK="/tmp/openclaw-l3.lock"
LOG="$HOME/.openclaw/logs/l3-meta-meta-loop.log"
UID_VAL=$(id -u)

TS() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "[$(TS)] [l3] $*" >> "$LOG"; }

exec 9>"$LOCK"
flock -n 9 || exit 0

log "--- check ---"

# ── L0 health: gateway-watchdog heartbeat ───────────────────────────────────
GW_HB="/tmp/openclaw-gateway-watchdog.heartbeat"
if [[ ! -f "$GW_HB" ]] || (( $(date +%s) - $(cat "$GW_HB" 2>/dev/null || echo 0) > 180 )); then
  log "L0 DEAD (gateway-watchdog no heartbeat) — respawning"
  launchctl kickstart -k "gui/${UID_VAL}/ai.openclaw.gateway-watchdog" >> "$LOG" 2>&1 \
    || launchctl bootstrap "gui/${UID_VAL}" "$HOME/Library/LaunchAgents/ai.openclaw.gateway-watchdog.plist" >> "$LOG" 2>&1 \
    || true
fi

# ── L1 health: redos-self-healer heartbeat ─────────────────────────────────
RH_HB="/tmp/openclaw-redos-self-healer.heartbeat"
if [[ ! -f "$RH_HB" ]] || (( $(date +%s) - $(cat "$RH_HB" 2>/dev/null || echo 0) > 900 )); then
  log "L1 DEAD (redos-self-healer no heartbeat) — respawning"
  launchctl kickstart -k "gui/${UID_VAL}/ai.openclaw.redos-self-healer" >> "$LOG" 2>&1 \
    || launchctl bootstrap "gui/${UID_VAL}" "$HOME/Library/LaunchAgents/ai.openclaw.redos-self-healer.plist" >> "$LOG" 2>&1 \
    || true
fi

# ── L2 health: agent-health-watchdog heartbeat ─────────────────────────────
AH_HB="/tmp/openclaw-agent-health-watchdog.heartbeat"
if [[ ! -f "$AH_HB" ]] || (( $(date +%s) - $(cat "$AH_HB" 2>/dev/null || echo 0) > 300 )); then
  log "L2 DEAD (agent-health-watchdog no heartbeat) — respawning"
  launchctl kickstart -k "gui/${UID_VAL}/ai.openclaw.agent-health-watchdog" >> "$LOG" 2>&1 \
    || launchctl bootstrap "gui/${UID_VAL}" "$HOME/Library/LaunchAgents/ai.openclaw.agent-health-watchdog.plist" >> "$LOG" 2>&1 \
    || true
fi

# ── Backoff sweeper health ──────────────────────────────────────────────────
BS_HB="/tmp/openclaw-cron-backoff-sweeper.heartbeat"
if [[ ! -f "$BS_HB" ]] || (( $(date +%s) - $(cat "$BS_HB" 2>/dev/null || echo 0) > 600 )); then
  log "BACKOFF-SWEEPER DEAD — respawning"
  launchctl kickstart -k "gui/${UID_VAL}/ai.openclaw.cron-backoff-sweeper" >> "$LOG" 2>&1 \
    || launchctl bootstrap "gui/${UID_VAL}" "$HOME/Library/LaunchAgents/ai.openclaw.cron-backoff-sweeper.plist" >> "$LOG" 2>&1 \
    || true
fi

log "all layers checked"
date +%s > "$AH_HB"  # L3 self-heartbeat
