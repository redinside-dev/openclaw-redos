#!/bin/bash
# cron-pipeline-watchdog.sh — 24/7 cron-pipeline health pager
# LaunchD: ai.openclaw.cron-pipeline-watchdog (StartInterval=60)
# Watches state/openclaw.sqlite::cron_jobs for sustained failures and pages
# via the severity ladder in alert-lib.sh. Writes a heartbeat file
# (/tmp/openclaw-cron-pipeline-watchdog.heartbeat) that gateway-watchdog.sh
# monitors to catch the meta-failure case.

set -uo pipefail

LOCK="/tmp/openclaw-cron-pipeline-watchdog.lock"
LOG="$HOME/.openclaw/logs/cron-pipeline-watchdog.log"
HB="/tmp/openclaw-cron-pipeline-watchdog.heartbeat"
SQLITE="$HOME/.openclaw/state/openclaw.sqlite"

. "$HOME/.openclaw/scripts/alert-lib.sh"

exec 9>"$LOCK" || exit 0
/opt/homebrew/bin/flock -n 9 || exit 0

TS() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "[$(TS)] [cron-pipeline-watchdog] $*" >> "$LOG"; }
is_gateway_up() { nc -z 127.0.0.1 18789 2>/dev/null; }

NOW_S=$(date +%s)
NOW_MS=$((NOW_S * 1000))
echo "$NOW_S" > "$HB"

GATEWAY_STATE=$(is_gateway_up && echo up || echo down)
log "tick — gateway=$GATEWAY_STATE now_ms=$NOW_MS"

# If gateway is down, defer repair to gateway-watchdog and page user.
if [[ "$GATEWAY_STATE" != "up" ]]; then
  log "gateway down — paging user; gateway-watchdog will auto-heal"
  send_alert page "Gateway down" "port 18789 unreachable at $(TS); gateway-watchdog will auto-heal"
  exit 0
fi

# Two separate queries — top-level OR confuses sqlite's index plan with the
# enabled=1 predicate, so we run them as separate counts.
STUCK_ERRORS=$(sqlite3 "$SQLITE" "SELECT COUNT(*) FROM cron_jobs WHERE enabled=1 AND consecutive_errors>=3;" 2>/dev/null | tr -d ' \n')
ENABLED_TOTAL=$(sqlite3 "$SQLITE" "SELECT COUNT(*) FROM cron_jobs WHERE enabled=1;" 2>/dev/null | tr -d ' \n')
STUCK_4H=$(sqlite3 "$SQLITE" "SELECT COUNT(*) FROM cron_jobs WHERE enabled=1 AND next_run_at_ms IS NOT NULL AND next_run_at_ms < $((NOW_MS - 14400000));" 2>/dev/null | tr -d ' \n')

: "${STUCK_ERRORS:=0}"
: "${ENABLED_TOTAL:=0}"
: "${STUCK_4H:=0}"

log "metrics: enabled=$ENABLED_TOTAL err>=3=$STUCK_ERRORS stuck_4h=$STUCK_4H"

# Page on jobs vanished
if (( ENABLED_TOTAL < 70 )); then
  send_alert critical "Cron jobs vanished" "enabled jobs dropped to $ENABLED_TOTAL (expected >= 71)"
fi

# Page on sustained failure
if (( STUCK_ERRORS >= 5 )); then
  send_alert page "Cron errors sustained" "$STUCK_ERRORS enabled jobs have consecutive_errors>=3; top offenders in $LOG"
fi

# Page on 4h+ stuck dispatcher + offenders log
if (( STUCK_4H >= 1 )); then
  log "offenders (top 3 by consecutive_errors):"
  sqlite3 "$SQLITE" "SELECT name || ' | err=' || COALESCE(last_error,'?') FROM cron_jobs WHERE enabled=1 AND consecutive_errors>=3 ORDER BY consecutive_errors DESC LIMIT 3;" 2>/dev/null | while IFS= read -r line; do
    log "  $line"
  done
  send_alert page "Cron pipeline degraded" "enabled=$ENABLED_TOTAL stuck_4h=$STUCK_4H err>=3=$STUCK_ERRORS; see $LOG"
fi

log "tick done"
exit 0
