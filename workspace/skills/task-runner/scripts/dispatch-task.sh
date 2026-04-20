#!/bin/bash
# AgentOS — Dispatch a task to an agent and track it
# Usage: bash dispatch-task.sh PROJ-20260211-001 T-001 eng "Build the React scaffold"

set -e

PROJECT_ID=$1
TASK_ID=$2
AGENT=$3
MESSAGE=$4

OPENCLAW_DIR="$HOME/.openclaw"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

if [ -z "$MESSAGE" ]; then
  echo "Usage: dispatch-task.sh <PROJECT_ID> <TASK_ID> <AGENT> <MESSAGE>"
  exit 1
fi

# Update task status to in_progress
bash "$OPENCLAW_DIR/workspace/skills/ta[REDACTED] \
  "$PROJECT_ID" "$TASK_ID" "in_progress"

# Send to agent via openclaw CLI
openclaw message --agent "$AGENT" --text "$MESSAGE" 2>/dev/null || \
  echo "WARNING: Could not send message to $AGENT via CLI. Check gateway."

# Log dispatch
echo "{\"ts\":\"$NOW\",\"action\":\"task_dispatched\",\"project\":\"$PROJECT_ID\",\"task\":\"$TASK_ID\",\"agent\":\"$AGENT\"}" \
  >> "$OPENCLAW_DIR/workspace/logs/audit.jsonl"

echo "✅ Dispatched $TASK_ID to $AGENT"
