#!/bin/bash
# Session Overflow Monitor
# Scans all agent session files, warns at 200KB and archives at 500KB
# Extracts last 30 messages to workspace/memory/archived-sessions/ before archiving
# LaunchD runs this every 3 minutes

WARN_BYTES=204800      # 200KB — log warning
ARCHIVE_BYTES=512000   # 500KB — extract context and archive (~57% of overflow point)
AGENTS_DIR="$HOME/.openclaw/agents"
ARCHIVE_ROOT="$HOME/.openclaw/workspace/memory/archived-sessions"
LOG="$HOME/.openclaw/logs/session-overflow-monitor.log"
TELEGRAM_TOKEN="${TELEGRAM_TOKEN:-$(cat "$HOME/.openclaw/workspace/config/telegram-bot-token.txt" 2>/dev/null)}"
TELEGRAM_CHAT="1012034994"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

send_alert() {
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\":\"${TELEGRAM_CHAT}\",\"text\":\"$1\",\"parse_mode\":\"Markdown\"}" \
    > /dev/null 2>&1
}

extract_context() {
  local SESSION_FILE="$1"
  local AGENT_ID="$2"
  local ARCHIVE_PATH="$3"

  mkdir -p "$(dirname "$ARCHIVE_PATH")"

  python3 - "$SESSION_FILE" "$ARCHIVE_PATH" "$AGENT_ID" "$NOW" <<'PYEOF'
import json, sys, os

session_file, archive_path, agent_id, archived_at = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

try:
    with open(session_file) as f:
        lines = f.readlines()[-100:]
    msgs = []
    for l in lines:
        l = l.strip()
        if l:
            try:
                msgs.append(json.loads(l))
            except Exception:
                pass
    # Keep last 30 user/assistant turns
    turns = [m for m in msgs if m.get('role') in ('user', 'assistant')][-30:]
    summary = json.dumps({
        'archived_at': archived_at,
        'agent': agent_id,
        'source_file': session_file,
        'turns': turns
    }, indent=2)
    with open(archive_path, 'w') as f:
        f.write(summary)
    print(f"Extracted {len(turns)} turns to {archive_path}")
except Exception as e:
    print(f"Context extraction error: {e}", file=sys.stderr)
PYEOF
}

update_working_memory() {
  local AGENT_ID="$1"
  local ARCHIVE_PATH="$2"
  local SIZE_KB="$3"
  local WORKING_MEM="$HOME/.openclaw/workspace/memory/working-${AGENT_ID}.json"

  python3 - "$WORKING_MEM" "$ARCHIVE_PATH" "$AGENT_ID" "$NOW" "$SIZE_KB" <<'PYEOF'
import json, sys, os

working_mem, archive_path, agent_id, ts, size_kb = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5]

note = {
    "context_archived_at": ts,
    "context_archive_path": archive_path,
    "note": f"Session was archived at {size_kb}KB. Read {archive_path} to recover last 30 turns of context."
}

try:
    if os.path.exists(working_mem):
        with open(working_mem) as f:
            data = json.load(f)
    else:
        data = {}
    data["_session_overflow"] = note
    with open(working_mem, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Updated working memory for {agent_id}")
except Exception as e:
    print(f"Working memory update error: {e}", file=sys.stderr)
PYEOF
}

ARCHIVED=0
WARNED=0
ARCHIVE_LINES=""

# Find all .jsonl session files across all agents
while IFS= read -r -d '' SESSION_FILE; do
  FILE_SIZE=$(stat -f%z "$SESSION_FILE" 2>/dev/null || echo "0")

  if [ "$FILE_SIZE" -gt "$ARCHIVE_BYTES" ]; then
    SIZE_KB=$(echo "scale=1; $FILE_SIZE / 1024" | bc 2>/dev/null || echo "?")
    AGENT_DIR=$(dirname "$SESSION_FILE")
    SESSIONS_JSON="$AGENT_DIR/sessions.json"
    SESSION_ID=$(basename "$SESSION_FILE" .jsonl)

    # Determine agent name
    AGENT_NAME=$(basename "$(dirname "$AGENT_DIR")" 2>/dev/null || echo "unknown")

    # Extract context before archiving
    ARCHIVE_DIR="${ARCHIVE_ROOT}/${AGENT_NAME}"
    ARCHIVE_PATH="${ARCHIVE_DIR}/${SESSION_ID}-$(date -u +%Y%m%dT%H%M%S).json"
    extract_context "$SESSION_FILE" "$AGENT_NAME" "$ARCHIVE_PATH"

    # Update working memory with pointer to archived context
    update_working_memory "$AGENT_NAME" "$ARCHIVE_PATH" "$SIZE_KB"

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

    echo "[${NOW}] ARCHIVED ${SIZE_KB}KB session: ${SESSION_ID} (agent: ${AGENT_NAME}) → ${ARCHIVE_PATH}" >> "$LOG"
    ARCHIVE_LINES="${ARCHIVE_LINES}• *${AGENT_NAME}*: ${SIZE_KB}KB archived\n"
    ARCHIVED=$((ARCHIVED + 1))

  elif [ "$FILE_SIZE" -gt "$WARN_BYTES" ]; then
    SIZE_KB=$(echo "scale=1; $FILE_SIZE / 1024" | bc 2>/dev/null || echo "?")
    AGENT_DIR=$(dirname "$SESSION_FILE")
    AGENT_NAME=$(basename "$(dirname "$AGENT_DIR")" 2>/dev/null || echo "unknown")
    SESSION_ID=$(basename "$SESSION_FILE" .jsonl)

    echo "[${NOW}] WARNING ${SIZE_KB}KB session: ${SESSION_ID} (agent: ${AGENT_NAME}) — approaching limit" >> "$LOG"
    WARNED=$((WARNED + 1))
  fi
done < <(find "$AGENTS_DIR" -name "*.jsonl" -not -name "*.deleted.*" -print0 2>/dev/null)

# Log heartbeat
echo "[${NOW}] scan complete — archived=${ARCHIVED} warned=${WARNED}" >> "$LOG"

if [ "$ARCHIVED" -gt "0" ]; then
  send_alert "🗂️ *Session Overflow Monitor*: Archived ${ARCHIVED} session(s) (>500KB):
${ARCHIVE_LINES}
Context saved to \`workspace/memory/archived-sessions/\`. Agents will start fresh sessions automatically."
fi
