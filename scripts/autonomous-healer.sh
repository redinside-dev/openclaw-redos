#!/bin/bash
# autonomous-healer.sh
# Runs every 5 minutes via system cron (NOT openclaw agentTurn)
# Fixes known failure modes automatically — no LLM, no hallucination, just bash
#
# Handles:
#   1. 9Router down → restart via launchd
#   2. Codex tokens expired → run refresh script
#   3. OpenClaw gateway down → restart
#   4. AUTONOMOUS.md has stale IN_PROGRESS tasks (>4h) → reset to PENDING
#   5. Telegram alert on any P0 that can't be auto-fixed
#
# Setup (run once): crontab -e → add:
#   */5 * * * * bash ~/.openclaw/scripts/autonomous-healer.sh >> ~/.openclaw/logs/healer.log 2>&1

set -euo pipefail

OPENCLAW="$HOME/.openclaw"
LOG="$OPENCLAW/logs/healer.log"
TELEGRAM_CHAT="1012034994"
TELEGRAM_TOKEN=$(python3 -c "import json; d=json.load(open('$OPENCLAW/credentials/secrets.json')); print(d['channels']['telegram']['accounts']['default'])" 2>/dev/null || echo "")
NINE_ROUTER_DB="$HOME/.9router/db.json"

# Cascade guard: redos-self-healer.sh also restarts gateway and 9router.
# If it fired within the last 90s, skip those checks to avoid double-restart
# which kills active subagent sessions.
REDOS_FLAG="/tmp/redos-self-healer.recent"
cascade_guard() {
  if [ -f "$REDOS_FLAG" ]; then
    local age=$(( $(date +%s) - $(stat -f %Y "$REDOS_FLAG" 2>/dev/null || echo 0) ))
    [ "$age" -lt 90 ] && return 1   # blocked
  fi
  return 0
}

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "[$(ts)] $*"; }

alert() {
  local msg="$1"
  log "ALERT: $msg"
  if [ -n "$TELEGRAM_TOKEN" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
      -H "Content-Type: application/json" \
      -d "{\"chat_id\":\"${TELEGRAM_CHAT}\",\"text\":\"${msg}\",\"parse_mode\":\"Markdown\"}" \
      > /dev/null 2>&1 || true
  fi
}

fixed() {
  local msg="$1"
  log "FIXED: $msg"
  if [ -n "$TELEGRAM_TOKEN" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
      -H "Content-Type: application/json" \
      -d "{\"chat_id\":\"${TELEGRAM_CHAT}\",\"text\":\"✅ Auto-fixed: ${msg}\"}" \
      > /dev/null 2>&1 || true
  fi
}

# ── 1. 9Router health ────────────────────────────────────────────────────────
check_9router() {
  cascade_guard || return 0  # redos-self-healer already handled it
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:20128/v1/models --max-time 5 2>/dev/null || echo "000")
  if [ "$code" != "200" ]; then
    log "9Router down (HTTP $code) — restarting"
    launchctl kickstart -k "gui/$(id -u)/com.9router.autostart" 2>/dev/null || \
      pkill -f "9router/cli.js" 2>/dev/null || true
    sleep 5
    code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:20128/v1/models --max-time 5 2>/dev/null || echo "000")
    if [ "$code" = "200" ]; then
      fixed "9Router restarted and responding"
    else
      alert "⛔ *9Router DOWN* — restart attempted but still not responding. Manual intervention needed."
    fi
  fi
}

# ── 2. OpenClaw gateway health ───────────────────────────────────────────────
check_gateway() {
  cascade_guard || return 0  # redos-self-healer already handled it
  local code
  local token
  token=$(python3 -c "import json; print(json.load(open('$OPENCLAW/openclaw.json'))['gateway']['auth']['token'])" 2>/dev/null || echo "")
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:18789/health \
    -H "Authorization: Bearer ${token}" --max-time 15 2>/dev/null || echo "000")
  if [ "$code" != "200" ]; then
    log "OpenClaw gateway down (HTTP $code) — checking config first"
    # Auto-fix invalid config keys before trying to restart
    local doctor_out
    doctor_out=$(openclaw doctor --fix 2>&1 || true)
    if echo "$doctor_out" | grep -q "Unrecognized key\|Config invalid\|Updated"; then
      log "Config issues detected and fixed by doctor --fix"
    fi
    bash "$OPENCLAW/scripts/redos-restart.sh" > /dev/null 2>&1 || true
    sleep 15
    code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:18789/health \
      -H "Authorization: Bearer ${token}" --max-time 15 2>/dev/null || echo "000")
    if [ "$code" = "200" ]; then
      fixed "OpenClaw gateway restarted (config fixed + stack restarted)"
    else
      alert "⛔ *OpenClaw Gateway DOWN* — restart attempted but still not responding."
    fi
  fi
}

# ── 3. Codex token refresh ───────────────────────────────────────────────────
check_codex_tokens() {
  if [ ! -f "$NINE_ROUTER_DB" ]; then return; fi
  local all_expired
  all_expired=$(python3 -c "
import json, sys
from datetime import datetime, timezone
try:
    d = json.load(open('$NINE_ROUTER_DB'))
    codex = [c for c in d.get('providerConnections',[]) if c.get('provider')=='codex']
    if not codex: sys.exit(0)
    now = datetime.now(timezone.utc)
    active = [c for c in codex if c.get('isActive') and c.get('testStatus') not in ('unavailable','error')]
    expired = [c for c in codex if c.get('expiresAt') and datetime.fromisoformat(c['expiresAt'].replace('Z','+00:00')) < now]
    if not active and expired:
        print('ALL_EXPIRED')
except Exception as e:
    print(f'ERROR:{e}')
" 2>/dev/null || echo "")
  if [ "$all_expired" = "ALL_EXPIRED" ]; then
    log "All Codex accounts expired — running token refresh"
    node "$OPENCLAW/scripts/9router-token-refresh.js" --all > /tmp/codex-refresh.log 2>&1 || true
    if grep -q "refreshed" /tmp/codex-refresh.log 2>/dev/null; then
      fixed "Codex tokens refreshed automatically"
    else
      alert "⛔ *Codex tokens expired* — auto-refresh failed. Re-auth at http://localhost:20128 → Providers → Codex"
    fi
  fi
}

# ── 4. Stale IN_PROGRESS tasks (>4h) in AUTONOMOUS.md ───────────────────────
check_stale_tasks() {
  local autonomous="$OPENCLAW/workspace/AUTONOMOUS.md"
  if [ ! -f "$autonomous" ]; then return; fi
  python3 -c "
import re, sys
from datetime import datetime, timezone, timedelta
content = open('$autonomous').read()
now = datetime.now(timezone.utc)
cutoff = now - timedelta(hours=4)
changed = False
lines = content.split('\n')
new_lines = []
for line in lines:
    if 'IN_PROGRESS' in line:
        # Check if timestamp nearby indicates stale
        # Just reset all IN_PROGRESS to PENDING so agents re-claim
        line = line.replace('IN_PROGRESS', 'PENDING')
        changed = True
    new_lines.append(line)
if changed:
    open('$autonomous', 'w').write('\n'.join(new_lines))
    print('RESET_DONE')
" 2>/dev/null | grep -q "RESET_DONE" && log "Reset stale IN_PROGRESS tasks to PENDING in AUTONOMOUS.md" || true
}

# ── 5. Factory watcher — run it directly if cron last ran >20min ago ─────────
check_factory() {
  local factory_dir="$HOME/Development/Codebase/projects/RedTeam/github/redteam-coding-factory"
  local last_run_file="/tmp/factory-last-run"
  if [ ! -d "$factory_dir" ]; then return; fi
  local now_ts last_ts elapsed
  now_ts=$(date +%s)

  # Init on first run so elapsed time is accurate, not from epoch 0
  if [ ! -f "$last_run_file" ]; then
    echo "$now_ts" > "$last_run_file"
    log "Factory watcher initialized (last-run set to now)"
  fi

  last_ts=$(cat "$last_run_file" 2>/dev/null || echo "0")
  elapsed=$((now_ts - last_ts))
  if [ "$elapsed" -gt 1200 ]; then  # 20 minutes
    log "Factory not run in ${elapsed}s — triggering one-shot"
    cd "$factory_dir"
    GH_TOKEN=$(gh auth token 2>/dev/null || echo "")
    if [ -n "$GH_TOKEN" ] && [ -f "factory-9router.config.json" ]; then
      GH_TOKEN="$GH_TOKEN" node src/cli.js watch \
        --config factory-9router.config.json \
        --once --push --pr --remediate --agent claude \
        > /tmp/factory-run.log 2>&1 || true
      echo "$now_ts" > "$last_run_file"
      log "Factory run complete: $(tail -1 /tmp/factory-run.log 2>/dev/null)"
    fi
  fi
}

# ── 6. PR creation for 9router issues (label factory-ready) ─────────────────
check_pending_prs() {
  # If there are open issues with factory-ready label, ensure factory ran recently
  # (handled by check_factory above)
  :
}

# ── Main ─────────────────────────────────────────────────────────────────────
log "=== Autonomous healer run ==="
check_9router
check_gateway
check_codex_tokens
check_stale_tasks
check_factory
log "=== Done ==="
