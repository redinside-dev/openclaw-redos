#!/bin/bash
# Session Overflow Monitor
# Scans all agent session files, archives any exceeding SIZE_LIMIT_MB
# Removes stale session mapping from sessions.json to force fresh session
# LaunchD runs this every 10 minutes

SIZE_LIMIT_MB=50
SIZE_LIMIT_BYTES=$((SIZE_LIMIT_MB * 1024 * 1024))
AGENTS_DIR="$HOME/.openclaw/agents"
LOG="$HOME/.openclaw/logs/session-overflow-monitor.log"
TELEGRAM_TOKEN="7992329203:AAHjLzW1o13ey3wMniim_LNfVEgcNtXMxio"
TELEGRAM_CHAT="1012034994"

send_alert() {
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\":\"${TELEGRAM_CHAT}\",\"text\":\"$1\",\"parse_mode\":\"Markdown\"}" \
    > /dev/null 2>&1
}

ARCHIVED=0
ALERT_LINES=""

# Find all .jsonl session files across all agents
while IFS= read -r -d '' SESSION_FILE; do
  FILE_SIZE=$(stat -f%z "$SESSION_FILE" 2>/dev/null || echo "0")

  if [ "$FILE_SIZE" -gt "$SIZE_LIMIT_BYTES" ]; then
    SIZE_MB=$(echo "scale=1; $FILE_SIZE / 1048576" | bc 2>/dev/null || echo "?")
    AGENT_DIR=$(dirname "$SESSION_FILE")
    SESSIONS_JSON="$AGENT_DIR/sessions.json"
    SESSION_ID=$(basename "$SESSION_FILE" .jsonl)

    # Archive the bloated file
    ARCHIVED_NAME="${SESSION_FILE}.deleted.$(date -u +%Y-%m-%dT%H-%M-%S)Z"
    mv "$SESSION_FILE" "$ARCHIVED_NAME" 2>/dev/null

    # Remove from sessions.json so a fresh session is created on next message
    if [ -f "$SESSIONS_JSON" ]; then
      python3 - "$SESSIONS_JSON" "$SESSION_ID" <<'PYEOF'
import json, sys
path, sid = sys.argv[1], sys.argv[2]
try:
    with open(path) as f:
        d = json.load(f)
    removed = [k for k, v in d.items() if isinstance(v, dict) and v.get('sessionId') == sid]
    for k in removed:
        del d[k]
    with open(path, 'w') as f:
        json.dump(d, f)
    if removed:
        print(f"Removed session mappings: {removed}")
except Exception as e:
    print(f"Error updating sessions.json: {e}")
PYEOF
    fi

    AGENT_NAME=$(basename "$(dirname "$AGENT_DIR")" 2>/dev/null || echo "unknown")
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ARCHIVED ${SIZE_MB}MB session: ${SESSION_ID} (agent: ${AGENT_NAME})" >> "$LOG"
    ALERT_LINES="${ALERT_LINES}• ${AGENT_NAME}: ${SIZE_MB}MB session archived\n"
    ARCHIVED=$((ARCHIVED + 1))
  fi
done < <(find "$AGENTS_DIR" -name "*.jsonl" -not -name "*.deleted.*" -print0 2>/dev/null)

if [ "$ARCHIVED" -gt "0" ]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Archived ${ARCHIVED} bloated session(s)" >> "$LOG"
  send_alert "🗂️ *Session Overflow Monitor*: Archived ${ARCHIVED} bloated session(s) (>${SIZE_LIMIT_MB}MB each):
${ALERT_LINES}
Agents will start fresh sessions automatically. No action needed."
fi
