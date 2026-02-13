#!/bin/bash
# AgentOS — Update a task's status in project state.json
# Usage: bash update-task.sh PROJ-20260211-001 T-001 done

set -e

PROJECT_ID=$1
TASK_ID=$2
NEW_STATUS=$3

OPENCLAW_DIR="$HOME/.openclaw"
STATE_FILE="$OPENCLAW_DIR/workspace/projects/$PROJECT_ID/state.json"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

if [ -z "$NEW_STATUS" ]; then
  echo "Usage: update-task.sh <PROJECT_ID> <TASK_ID> <STATUS>"
  echo "  Status: queued|in_progress|in_review|done|blocked|failed|cancelled"
  exit 1
fi

if [ ! -f "$STATE_FILE" ]; then
  echo "ERROR: State file not found: $STATE_FILE"
  exit 1
fi

# Update the task status
if [ "$NEW_STATUS" = "done" ]; then
  jq --arg tid "$TASK_ID" --arg now "$NOW" \
    '(.tasks[] | select(.task_id == $tid)).status = "done" |
     (.tasks[] | select(.task_id == $tid)).completed = $now' \
    "$STATE_FILE" > /tmp/agentos-state-update.json
elif [ "$NEW_STATUS" = "in_progress" ]; then
  jq --arg tid "$TASK_ID" --arg now "$NOW" \
    '(.tasks[] | select(.task_id == $tid)).status = "in_progress" |
     (.tasks[] | select(.task_id == $tid)).started = $now' \
    "$STATE_FILE" > /tmp/agentos-state-update.json
else
  jq --arg tid "$TASK_ID" --arg status "$NEW_STATUS" --arg now "$NOW" \
    '(.tasks[] | select(.task_id == $tid)).status = $status |
     (.tasks[] | select(.task_id == $tid)).updated = $now' \
    "$STATE_FILE" > /tmp/agentos-state-update.json
fi

mv /tmp/agentos-state-update.json "$STATE_FILE"

# Log
echo "{\"ts\":\"$NOW\",\"action\":\"task_status_change\",\"project\":\"$PROJECT_ID\",\"task\":\"$TASK_ID\",\"new_status\":\"$NEW_STATUS\"}" \
  >> "$OPENCLAW_DIR/workspace/logs/audit.jsonl"

echo "✅ $TASK_ID → $NEW_STATUS"
