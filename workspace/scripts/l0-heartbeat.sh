#!/bin/bash
# L0 OPS Heartbeat — runs every 5 min via cron
# Checks: gateway process, gateway port, cron jobs loaded, OPEN tickets with breached SLA
# Writes a single alert line to workspace/ops/alerts/<UTC-timestamp>.txt if any check fails.
# Always exits 0 — this script itself must never page.

set -u
WORKSPACE="/Users/redinside/.openclaw/workspace"
TICKET_FILE="$WORKSPACE/ops/TICKET-TRACKER.md"
ALERT_DIR="$WORKSPACE/ops/alerts"
NOW_UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)
NOW_SHORT=$(date -u +%Y%m%d_%H%M%S)
mkdir -p "$ALERT_DIR"

alerts=()

# ── 1. Gateway process alive ────────────────────────────────────────────────
if pgrep -f "openclaw" >/dev/null 2>&1; then
  : # ok
else
  alerts+=("CRITICAL: openclaw process not running")
fi

# ── 2. Gateway port listening ───────────────────────────────────────────────
GW_PORT_FILE="/Users/redinside/.openclaw/openclaw.json"
GW_PORT=18789
if [ -f "$GW_PORT_FILE" ]; then
  GW_PORT=$(python3 -c "import json; d=json.load(open('$GW_PORT_FILE')); print(d.get('gateway',{}).get('port',18789))" 2>/dev/null || echo 18789)
fi
if ! lsof -nP -iTCP:"$GW_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  alerts+=("CRITICAL: gateway port $GW_PORT not listening")
fi

# ── 3. Cron jobs loaded (not zero) ──────────────────────────────────────────
# Reads ~/.openclaw/cron/jobs.json (file-based snapshot). Two new checks added
# 2026-06-09 (LEARNINGS): file mtime staleness + file vs CLI count divergence.
# Both fire WARNING (not CRITICAL) — silent rot, no live failure.
JOB_COUNT=$(python3 -c "
import json, os
p = '/Users/redinside/.openclaw/cron/jobs.json'
try:
    d = json.load(open(p))
    j = d.get('jobs',[]) if isinstance(d,dict) else d
    print(len([x for x in j if not x.get('disabled')]))
except Exception as e:
    print('ERR')
" 2>/dev/null)
if [ "$JOB_COUNT" = "0" ] || [ "$JOB_COUNT" = "ERR" ]; then
  alerts+=("CRITICAL: cron jobs count = $JOB_COUNT (expected >0)")
elif [ -z "$JOB_COUNT" ]; then
  alerts+=("CRITICAL: cron jobs count query returned empty")
fi

# 3a. jobs.json mtime staleness (L1: fire WARNING if file > 1h old)
JOBS_FILE="/Users/redinside/.openclaw/cron/jobs.json"
if [ -f "$JOBS_FILE" ]; then
  FILE_MTIME_EPOCH=$(stat -f %m "$JOBS_FILE" 2>/dev/null || stat -c %Y "$JOBS_FILE" 2>/dev/null)
  NOW_EPOCH=$(date -u +%s)
  if [ -n "$FILE_MTIME_EPOCH" ] && [ -n "$NOW_EPOCH" ]; then
    AGE_SEC=$((NOW_EPOCH - FILE_MTIME_EPOCH))
    AGE_HR=$((AGE_SEC / 3600))
    if [ "$AGE_HR" -gt 1 ]; then
      alerts+=("WARNING: jobs.json is ${AGE_HR}h old (staleness rot — see LEARNINGS 2026-06-09 03:33Z)")
    fi
  fi
fi

# 3b. file vs CLI enabled-count divergence (L1: cross-check via openclaw cron list)
# Only fires if openclaw CLI is reachable. Delta > 5 = file is over/under-reporting.
if command -v openclaw >/dev/null 2>&1; then
  CLI_COUNT=$(openclaw cron list --json 2>/dev/null | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    j = d.get('jobs',[]) if isinstance(d,dict) else d
    print(sum(1 for x in j if not x.get('disabled')))
except Exception:
    pass
" 2>/dev/null)
  if [ -n "$CLI_COUNT" ] && [ -n "$JOB_COUNT" ] && [ "$JOB_COUNT" != "ERR" ]; then
    DELTA=$((JOB_COUNT - CLI_COUNT))
    DELTA_ABS=${DELTA#-}
    if [ "$DELTA_ABS" -gt 5 ]; then
      alerts+=("WARNING: jobs.json says $JOB_COUNT enabled, CLI says $CLI_COUNT (delta=$DELTA, stale-snapshot rot)")
    fi
  fi
fi

# ── 4. TICKET-TRACKER SLA breaches (OPEN with breached SLA) ─────────────────
# Parse with BSD-safe awk using index() to extract field values.
BREACHES=$(LC_ALL=C /usr/bin/awk -v now_epoch="$(date -u +%s)" '
function strip_emoji(s,   i, c, out) {
  out = ""
  for (i=1; i<=length(s); i++) {
    c = substr(s,i,1)
    if (c >= " " && c <= "~") out = out c
  }
  return out
}
function trim(s) { gsub(/^ +| +$/, "", s); return s }
function flush(ticket_id, status, priority, sla_deadline, now_epoch,    d, epoch, breach_amt) {
  if (ticket_id == "" || status !~ /OPEN/) return ""
  if (sla_deadline == "") return ""
  d = substr(sla_deadline, 1, 19)
  cmd = "date -u -j -f \"%Y-%m-%dT%H:%M:%S\" \"" d "\" \"+%s\" 2>/dev/null"
  cmd | getline epoch
  close(cmd)
  if (epoch != "" && epoch+0 < now_epoch+0) {
    breach_amt = now_epoch - epoch
    return sprintf("%s | %s | %s | breached by %dd%dh", ticket_id, priority, sla_deadline, int(breach_amt/86400), int((breach_amt%86400)/3600))
  }
  return ""
}
BEGIN { ticket_id=""; status=""; priority=""; sla_deadline="" }
/^###[[:space:]]+TICKET-/ {
  out = flush(ticket_id, status, priority, sla_deadline, now_epoch)
  if (out != "") print out
  ticket_id = $0
  sub(/^###[[:space:]]+/, "", ticket_id)
  status=""; priority=""; sla_deadline=""
  next
}
{
  if (ticket_id == "") next
  s = index($0, ":** ")
  if (s == 0) next
  field = substr($0, 1, s-1)
  val = substr($0, s+4)
  p = index(field, "**")
  if (p == 0) next
  fname = trim(substr(field, p+2))
  val = trim(strip_emoji(val))
  if (fname == "Status") status = val
  else if (fname == "Priority") priority = val
  else if (fname == "SLA" || fname == "SLA Deadline" || fname == "SLA Breach") {
    if (sla_deadline == "" && match(val, /[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/)) {
      sla_deadline = substr(val, RSTART, RLENGTH)
    }
  }
}
END {
  out = flush(ticket_id, status, priority, sla_deadline, now_epoch)
  if (out != "") print out
}
' "$TICKET_FILE" 2>/dev/null)

if [ -n "$BREACHES" ]; then
  while IFS= read -r line; do
    [ -n "$line" ] && alerts+=("SLA-BREACH: $line")
  done <<< "$BREACHES"
fi

# ── 5. Write alert file (or skip silently if all green) ─────────────────────
if [ ${#alerts[@]} -gt 0 ]; then
  ALERT_FILE="$ALERT_DIR/${NOW_SHORT}_L0.txt"
  {
    echo "L0-heartbeat @ $NOW_UTC"
    echo "workspace: $WORKSPACE"
    echo "alerts: ${#alerts[@]}"
    echo "---"
    for a in "${alerts[@]}"; do
      echo "$a"
    done
  } > "$ALERT_FILE"
  # Mirror to stderr for cron log visibility
  echo "[L0] ${#alerts[@]} alert(s) -> $ALERT_FILE" >&2
  for a in "${alerts[@]}"; do
    echo "  - $a" >&2
  done
else
  # Touch a heartbeat sentinel so we can prove it ran (once per hour to avoid noise)
  MIN=$(date -u +%M)
  if [ "$MIN" = "00" ] || [ "$MIN" = "30" ]; then
    echo "L0-heartbeat OK @ $NOW_UTC | jobs=$JOB_COUNT | port=$GW_PORT" > "$ALERT_DIR/_heartbeat.log"
  fi
fi

exit 0
