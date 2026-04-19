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

# ── 0. Guard: openclaw.json must not be empty ──
CONFIG="$REPO/openclaw.json"
CONFIG_SIZE=$(wc -c < "$CONFIG" 2>/dev/null || echo 0)
if [ "$CONFIG_SIZE" -lt 1000 ]; then
  ISSUES+=("config-corrupt:${CONFIG_SIZE}bytes")
  STATUS="ALERT"
  echo "[$NOW] AUTO-FIX: openclaw.json is ${CONFIG_SIZE} bytes — restoring from backup" >> "$LOG"
  BACKUP=$(ls -t "$REPO"/openclaw.json.bak* 2>/dev/null | head -1)
  if [ -n "$BACKUP" ] && [ "$(wc -c < "$BACKUP")" -gt 10000 ]; then
    cp "$BACKUP" "$CONFIG"
    echo "[$NOW] Restored from $BACKUP" >> "$LOG"
    # Fix model to free-unlimited
    python3 -c "
import json
with open('$CONFIG') as f: d=json.load(f)
m={'primary':'9router/free-unlimited','fallbacks':['9router/cc/claude-sonnet-4-6','9router/always-on-premium']}
if isinstance(d.get('agents',{}).get('defaults'),dict): d['agents']['defaults']['model']=m
for a in d.get('agents',{}).get('list',[]):
    if isinstance(a,dict) and 'model' in a: a['model']=m
with open('$CONFIG','w') as f: json.dump(d,f,indent=2)
print('model fixed')
" >> "$LOG" 2>&1 || true
  else
    echo "[$NOW] ERROR: no valid backup found — manual intervention needed" >> "$LOG"
    # Alert via Telegram direct HTTP
    python3 -c "
import http.client, urllib.parse
data=urllib.parse.urlencode({'chat_id':'1012034994','text':'🚨 CRITICAL: openclaw.json is empty/corrupt and no backup found. Manual fix needed.'}).encode()
c=http.client.HTTPSConnection('api.telegram.org')
try:
  import json
  token=json.load(open('/Users/redinside/.openclaw/credentials/secrets.json'))['channels']['telegram']['accounts']['default']
  c.request('POST',f'/bot{token}/sendMessage',data,{'Content-Type':'application/x-www-form-urlencoded'})
  c.getresponse()
except: pass
" 2>/dev/null || true
  fi
fi

# ── 1. Check gateway is alive, restart if down ──
_gw_token=$(python3 -c "import json; print(json.load(open('$REPO/openclaw.json'))['gateway']['auth']['token'])" 2>/dev/null || echo "")
if ! curl -sf --max-time 15 -H "Authorization: Bearer ${_gw_token}" http://127.0.0.1:18789/health > /dev/null 2>&1; then
  ISSUES+=("gateway-down")
  STATUS="ALERT"
  echo "[$NOW] AUTO-FIX: gateway down, restarting stack" >> "$LOG"
  bash "$REPO/scripts/redos-restart.sh" >> "$LOG" 2>&1 || true
fi

# ── 1b. Check agent actually responds (not just port alive) ──
AGENT_TEST=$(curl -sf --max-time 15 -X POST http://127.0.0.1:18789/api/agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(python3 -c "import json; print(json.load(open('$CONFIG'))['gateway']['auth']['token'])" 2>/dev/null || echo '')" \
  -d '{"agentId":"main","channel":"telegram","message":"ping","noReply":true}' \
  2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print('ok' if d.get('status')=='ok' or d.get('ok') else 'fail')" 2>/dev/null || echo "fail")
if [ "$AGENT_TEST" = "fail" ]; then
  # Verify it's a real failure by also checking if config is valid
  CONFIG_OK=$(python3 -c "import json; json.load(open('$CONFIG')); print('ok')" 2>/dev/null || echo "fail")
  if [ "$CONFIG_OK" = "fail" ]; then
    ISSUES+=("config-invalid")
    STATUS="ALERT"
    echo "[$NOW] WARN: openclaw.json invalid JSON after agent test failed" >> "$LOG"
  fi
fi

# ── 2. Check gateway log for channel errors (log only — do NOT restart for this) ──
if [ -f "$GATEWAY_LOG" ]; then
  CHANNEL_ERRORS=$(tail -200 "$GATEWAY_LOG" | grep -c "Channel is required" 2>/dev/null || true)
  if [ "$CHANNEL_ERRORS" -gt 20 ]; then
    ISSUES+=("channel-errors:$CHANNEL_ERRORS")
    STATUS="DEGRADED"
    echo "[$NOW] WARN: $CHANNEL_ERRORS channel errors in gateway log — cron delivery.channel config issue" >> "$LOG"
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

# ── 5. Session bloat check — auto-clear any agent session > 300KB ──
AGENTS_DIR="$REPO/agents"
SESSION_THRESHOLD=307200  # 300KB
for SESSIONS_FILE in "$AGENTS_DIR"/*/sessions/sessions.json; do
  [ -f "$SESSIONS_FILE" ] || continue
  AGENT_NAME=$(echo "$SESSIONS_FILE" | sed 's|.*/agents/\([^/]*\)/.*|\1|')
  FSIZE=$(wc -c < "$SESSIONS_FILE" 2>/dev/null || echo 0)
  if [ "$FSIZE" -gt "$SESSION_THRESHOLD" ]; then
    ISSUES+=("session-bloat:${AGENT_NAME}:${FSIZE}bytes")
    STATUS="ALERT"
    echo "[$NOW] AUTO-FIX: ${AGENT_NAME} session ${FSIZE} bytes > threshold, clearing" >> "$LOG"
    echo '{}' > "$SESSIONS_FILE"
    rm -f "$(dirname "$SESSIONS_FILE")"/*.jsonl 2>/dev/null || true
    echo "[$NOW] Cleared ${AGENT_NAME} sessions" >> "$LOG"
  fi
done

# ── 5b. AUTONOMOUS.md bloat check — clear consultant spam if > 50KB ──
AUTONOMOUS="$REPO/workspace/AUTONOMOUS.md"
if [ -f "$AUTONOMOUS" ]; then
  ASIZE=$(wc -c < "$AUTONOMOUS" 2>/dev/null || echo 0)
  if [ "$ASIZE" -gt 51200 ]; then
    ISSUES+=("autonomous-bloat:${ASIZE}bytes")
    STATUS="ALERT"
    echo "[$NOW] AUTO-FIX: AUTONOMOUS.md ${ASIZE} bytes — truncating consultant spam" >> "$LOG"
    # Keep only the first 200 lines (real task queue), strip consultant spam below
    python3 -c "
import re
with open('$AUTONOMOUS') as f: content = f.read()
# Remove all CONSULTANT TASK blocks
clean = re.sub(r'## CONSULTANT TASK.*?(?=## |\Z)', '', content, flags=re.DOTALL)
# Remove duplicate blank lines
clean = re.sub(r'\n{3,}', '\n\n', clean).strip() + '\n'
with open('$AUTONOMOUS', 'w') as f: f.write(clean)
print(f'Trimmed to {len(clean)} bytes')
" >> "$LOG" 2>&1 || true
  fi
fi

# ── 6. Disk space check ──
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
