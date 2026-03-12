#!/usr/bin/env bash
# ============================================================
# health-monitor.sh — RedOS Persistent Health Monitor
# Runs every 15 minutes via launchd (ai.openclaw.health-monitor)
# Works 24/7 with NO Claude Code session open.
# ============================================================

set -euo pipefail

REPO="/Users/redinside/.openclaw"
LOG="$REPO/logs/health-monitor.log"
GATEWAY_LOG="$REPO/logs/gateway.log"
EXECUTOR_LOG="$REPO/logs/claude-executor.log"

export HOME="/Users/redinside"
export PATH="/Users/redinside/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

mkdir -p "$REPO/logs"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
STATUS="HEALTHY"
ISSUES=()

echo "" >> "$LOG"
echo "=== $NOW HEALTH CHECK ===" >> "$LOG"

# ── 1. Check gateway is alive, restart if down ──
if ! curl -sf http://127.0.0.1:18789/health > /dev/null 2>&1; then
  ISSUES+=("gateway-down")
  STATUS="ALERT"
  echo "[$NOW] AUTO-FIX: gateway down, restarting stack" >> "$LOG"
  bash "$REPO/scripts/redos-restart.sh" >> "$LOG" 2>&1 || true
fi

# ── 2. Check gateway log for channel errors (fix = already done in crons, but catch regressions) ──
if [ -f "$GATEWAY_LOG" ]; then
  CHANNEL_ERRORS=$(tail -200 "$GATEWAY_LOG" | grep -c "Channel is required" 2>/dev/null || true)
  if [ "$CHANNEL_ERRORS" -gt 5 ]; then
    ISSUES+=("channel-errors:$CHANNEL_ERRORS")
    STATUS="ALERT"
    echo "[$NOW] WARN: $CHANNEL_ERRORS channel errors in gateway log — cron config may need re-fix" >> "$LOG"
  fi
fi

# ── 3. Check 9Router ──
if ! curl -sf http://127.0.0.1:20128/ > /dev/null 2>&1; then
  ISSUES+=("9router-down")
  STATUS="DEGRADED"
  echo "[$NOW] WARN: 9Router unreachable" >> "$LOG"
fi

# ── 4. Check executor ran recently (within 30 min) ──
if [ -f "$EXECUTOR_LOG" ]; then
  LAST_RUN=$(grep "EXECUTOR WAKE" "$EXECUTOR_LOG" 2>/dev/null | tail -1 | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:]+Z' || true)
  if [ -n "$LAST_RUN" ]; then
    LAST_TS=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$LAST_RUN" "+%s" 2>/dev/null || echo 0)
    NOW_TS=$(date -u +%s)
    AGE=$(( NOW_TS - LAST_TS ))
    if [ "$AGE" -gt 1800 ]; then
      ISSUES+=("executor-stale:${AGE}s")
      STATUS="ALERT"
      echo "[$NOW] AUTO-FIX: executor stale (${AGE}s), kicking launchd" >> "$LOG"
      launchctl kickstart -k gui/$(id -u)/ai.openclaw.claude-executor >> "$LOG" 2>&1 || true
    fi
  fi
fi

# ── 5. Disk space check ──
DISK_PCT=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "${DISK_PCT:-0}" -gt 90 ]; then
  ISSUES+=("disk:${DISK_PCT}%")
  STATUS="ALERT"
  echo "[$NOW] WARN: Disk at ${DISK_PCT}%" >> "$LOG"
fi

# ── 6. Final report ──
if [ "${#ISSUES[@]}" -gt 0 ]; then
  ISSUE_STR=$(IFS=', '; echo "${ISSUES[*]}")
  echo "[$NOW] $STATUS: $ISSUE_STR" >> "$LOG"
else
  echo "[$NOW] HEALTHY: all checks passed" >> "$LOG"
fi
