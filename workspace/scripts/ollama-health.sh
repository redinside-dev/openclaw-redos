#!/bin/bash
# AgentOS — Ollama Health Monitor
# Checks if Ollama is running, models are loaded, and logs status changes.
# Run via cron every 5 minutes.

OPENCLAW_DIR="$HOME/.openclaw"
STATUS_FILE="$OPENCLAW_DIR/workspace/tmp/ollama-status.json"
AUDIT_LOG="$OPENCLAW_DIR/workspace/logs/audit.jsonl"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Read previous status
PREV_STATUS="unknown"
[ -f "$STATUS_FILE" ] && PREV_STATUS=$(jq -r '.status // "unknown"' "$STATUS_FILE" 2>/dev/null)

# Check Ollama API
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  --connect-timeout 3 --max-time 5 \
  http://127.0.0.1:11434/api/tags 2>/dev/null || echo "000")

MODELS_LOADED=0

if [ "$HTTP_CODE" = "200" ]; then
  # Server is up — check if any models are loaded in memory
  MODELS_LOADED=$(curl -s --max-time 5 http://127.0.0.1:11434/api/ps 2>/dev/null | \
    jq '.models | length' 2>/dev/null || echo "0")
  
  # Get memory usage
  MEM_USAGE=$(curl -s --max-time 5 http://127.0.0.1:11434/api/ps 2>/dev/null | \
    jq '[.models[].size] | add // 0' 2>/dev/null || echo "0")
  
  if [ "$MODELS_LOADED" -gt "0" ]; then
    STATUS="up:loaded"
  else
    STATUS="up:idle"
  fi
else
  STATUS="down"
  MEM_USAGE=0
fi

# Write current status
cat > "$STATUS_FILE" << EOF
{
  "status": "$STATUS",
  "http_code": "$HTTP_CODE",
  "models_loaded": $MODELS_LOADED,
  "memory_bytes": $MEM_USAGE,
  "checked_at": "$NOW",
  "previous_status": "$PREV_STATUS"
}
EOF

# Detect status change
if [ "$STATUS" != "$PREV_STATUS" ] && [ "$PREV_STATUS" != "unknown" ]; then
  echo "{\"ts\":\"$NOW\",\"action\":\"ollama_status_change\",\"from\":\"$PREV_STATUS\",\"to\":\"$STATUS\"}" \
    >> "$AUDIT_LOG"
  
  if [[ "$STATUS" == "down" ]]; then
    echo "⚠️ Ollama went DOWN. Z.AI fallback now active."
  elif [[ "$STATUS" == up:* ]] && [[ "$PREV_STATUS" == "down" ]]; then
    echo "✅ Ollama is back UP ($STATUS)."
  fi
fi

echo "$STATUS"
