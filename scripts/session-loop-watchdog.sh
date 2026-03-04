#!/bin/bash
# session-loop-watchdog.sh — detect and kill looping agent sessions
# Called by OPS session-loop-watchdog-0001 cron every 5 minutes (Tier L2 — pre-approved)
# Pure bash + inline Python. No LLM. Zero API cost.

set -uo pipefail

TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
AGENTS_DIR="$HOME/.openclaw/agents"
LOG="$HOME/.openclaw/workspace/logs/loop-watchdog.log"
PY_SCRIPT=$(mktemp /tmp/loop-watchdog-XXXXXX.py)

LOOP_THRESHOLD=10       # same command ≥10 times in last 50 calls = loop
SIZE_THRESHOLD_KB=20    # sessions <20KB are brand-new; skip
ACTIVE_WINDOW_MINS=15   # only inspect sessions modified in last 15 minutes

kill_count=0

# Write Python parser to temp file (heredoc in $() subshell doesn't work)
cat > "$PY_SCRIPT" << 'PYEOF'
import sys, json
from collections import Counter
calls = []
for l in sys.stdin:
    try:
        d = json.loads(l)
        if d.get('type') == 'message':
            for c in (d.get('message', {}).get('content') or []):
                if isinstance(c, dict) and c.get('type') == 'toolCall':
                    calls.append(c.get('name','?') + '|' + str(c.get('arguments',''))[:60])
    except:
        pass
calls = calls[-50:]
if calls:
    top = Counter(calls).most_common(1)[0]
    print(top[1], top[0])
PYEOF

trap 'rm -f "$PY_SCRIPT"' EXIT

# ── Scan all agent sessions ────────────────────────────────────────────────────
for session_file in "$AGENTS_DIR"/*/sessions/*.jsonl; do
  [ -f "$session_file" ] || continue

  # Skip archived sessions
  [[ "$session_file" == *.archived ]] && continue

  # Skip if not recently active
  if ! find "$session_file" -mmin -"$ACTIVE_WINDOW_MINS" -maxdepth 0 2>/dev/null | grep -q .; then
    continue
  fi

  # Skip small files (new sessions, not yet looping)
  file_kb=$(( $(wc -c < "$session_file") / 1024 ))
  [ "$file_kb" -lt "$SIZE_THRESHOLD_KB" ] && continue

  # Parse last 50 tool calls via temp Python script
  parse_result=$(tail -c 200000 "$session_file" | python3 "$PY_SCRIPT" 2>/dev/null) || continue
  [[ -z "$parse_result" ]] && continue

  top_count=$(echo "$parse_result" | awk '{print $1}')
  top_cmd=$(echo "$parse_result" | cut -d' ' -f2-)

  [[ "$top_count" =~ ^[0-9]+$ ]] || continue
  [ "$top_count" -lt "$LOOP_THRESHOLD" ] && continue

  # Loop detected — archive the session
  agent_name=$(echo "$session_file" | sed 's|.*/agents/\([^/]*\)/.*|\1|')
  session_id=$(basename "$session_file" .jsonl)
  archived_file="${session_file}.archived"

  mv "$session_file" "$archived_file" 2>/dev/null || continue

  log_msg="LOOP KILLED: ${agent_name}/${session_id} — ${top_count}x: ${top_cmd:0:80}"
  echo "[${TS}] ${log_msg}" >> "$LOG"
  echo "$log_msg"

  kill_count=$(( kill_count + 1 ))
done

# ── Alert if any sessions killed ──────────────────────────────────────────────
if [ "$kill_count" -gt 0 ]; then
  curl -s --max-time 5 -X POST "http://127.0.0.1:5678/webhook/slack-post" \
    -H "Content-Type: application/json" \
    -d "{\"channel\":\"C0AEV3MDEDD\",\"text\":\"🔁 Loop watchdog killed ${kill_count} session(s). See logs/loop-watchdog.log\"}" \
    > /dev/null 2>&1 || true
  exit 2
fi

exit 0
