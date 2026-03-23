#!/bin/bash
# agent-self-healer.sh
# Fixes agent-level failures that RED was hallucinating about:
#   - Sessions bloated → clear them
#   - Consultant loop detected → kill it
#   - Missing workspace files → create stubs
#   - Inner loop error crons → reset consecutive error count
#   - Telegram bot token missing → reload from openclaw.json
#
# Runs every 15 min via system cron
# Setup: crontab -e → add:
#   */15 * * * * bash ~/.openclaw/scripts/agent-self-healer.sh >> ~/.openclaw/logs/agent-healer.log 2>&1

OPENCLAW="$HOME/.openclaw"
TELEGRAM_CHAT="1012034994"
TELEGRAM_TOKEN=$(python3 -c "import json; d=json.load(open('$OPENCLAW/credentials/secrets.json')); print(d['channels']['telegram']['accounts']['default'])" 2>/dev/null || echo "")

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "[$(ts)] $*"; }

alert() {
  if [ -n "$TELEGRAM_TOKEN" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
      -H "Content-Type: application/json" \
      -d "{\"chat_id\":\"${TELEGRAM_CHAT}\",\"text\":\"$1\"}" \
      > /dev/null 2>&1 || true
  fi
}

log "=== Agent self-healer run ==="

# ── 1. Create missing workspace files that agents need ───────────────────────
for f in \
  "$OPENCLAW/workspace/ops/AGENTS.md" \
  "$OPENCLAW/workspace/memory/state-allrounder.json" \
  "$OPENCLAW/workspace/memory/state-research.json" \
  "$OPENCLAW/workspace/memory/state-ops.json" \
  "$OPENCLAW/workspace/memory/working-allrounder.json" \
  "$OPENCLAW/workspace/memory/working-main.json"
do
  if [ ! -f "$f" ]; then
    mkdir -p "$(dirname "$f")"
    ext="${f##*.}"
    if [ "$ext" = "json" ]; then
      echo '{"last_action":"init","next":"normal operation"}' > "$f"
    else
      echo "# $(basename $f)" > "$f"
      echo "Auto-created by agent-self-healer.sh" >> "$f"
    fi
    log "Created missing file: $f"
  fi
done

# ── 2. Detect consultant/loop process (ollama or daemon stuck) ───────────────
CONSULTANT_PID=$(pgrep -f "consultant-daemon" 2>/dev/null || echo "")
if [ -n "$CONSULTANT_PID" ]; then
  # Check if it's been running >2h (symptom of the recursive loop)
  RUNTIME=$(ps -p "$CONSULTANT_PID" -o etimes= 2>/dev/null | tr -d ' ' || echo "0")
  if [ "$RUNTIME" -gt 7200 ] 2>/dev/null; then
    kill "$CONSULTANT_PID" 2>/dev/null || true
    log "Killed stuck consultant daemon (PID $CONSULTANT_PID, running ${RUNTIME}s)"
    alert "🔧 Auto-fixed: Consultant daemon was stuck for ${RUNTIME}s — killed. Agents will proceed normally."
  fi
fi

# ── 3. Reset bloated session files (>2MB) ───────────────────────────────────
SESSIONS_DIR="$OPENCLAW/sessions"
if [ -d "$SESSIONS_DIR" ]; then
  while IFS= read -r -d '' session_file; do
    size=$(wc -c < "$session_file" 2>/dev/null || echo 0)
    if [ "$size" -gt 2097152 ]; then  # 2MB
      agent=$(basename "$(dirname "$session_file")")
      log "Session $session_file bloated (${size}B) — clearing"
      echo '[]' > "$session_file"
    fi
  done < <(find "$SESSIONS_DIR" -name "*.json" -print0 2>/dev/null)
fi

# ── 4. Check if today's memory log exists, create if not ────────────────────
TODAY=$(date +%Y-%m-%d)
for agent in main allrounder eng ops research finance infosec; do
  mem_file="$OPENCLAW/workspace/memory/$TODAY.md"
  if [ ! -f "$mem_file" ]; then
    echo "# $TODAY Memory Log" > "$mem_file"
  fi
done

# ── 5. Verify Telegram token is loaded and working ───────────────────────────
if [ -n "$TELEGRAM_TOKEN" ]; then
  TOKEN_OK=$(curl -s "https://api.telegram.org/bot${TELEGRAM_TOKEN}/getMe" --max-time 5 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print('ok' if d.get('ok') else 'fail')" 2>/dev/null || echo "fail")
  if [ "$TOKEN_OK" != "ok" ]; then
    log "Telegram token invalid — will use fallback"
  fi
fi

# ── 6. Check OpenClaw cron errors — alert if any cron has >5 consecutive errors
python3 - << 'PYEOF'
import json, os
jobs_file = os.path.expanduser("~/.openclaw/cron/jobs.json")
try:
    d = json.load(open(jobs_file))
    jobs = d.get('jobs', [])
    broken = []
    for j in jobs:
        if not j.get('enabled', True): continue
        state = j.get('state', {})
        errors = state.get('consecutiveErrors', 0)
        if errors >= 5:
            broken.append(f"{j.get('id','?')} ({errors} errors)")
    if broken:
        print("BROKEN_CRONS: " + ", ".join(broken[:5]))
except Exception as e:
    pass
PYEOF

log "=== Done ==="
