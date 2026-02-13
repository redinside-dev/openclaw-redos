#!/bin/bash
# AgentOS — Create a new project directory from template
# Usage: bash create-project.sh PROJ-20260211-001 "Build a portfolio website"

set -e

PROJECT_ID=$1
BRIEF_TEXT=$2
OPENCLAW_DIR="$HOME/.openclaw"
PROJECT_DIR="$OPENCLAW_DIR/workspace/projects/$PROJECT_ID"
TEMPLATE_DIR="$OPENCLAW_DIR/workspace/projects/_template"

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: create-project.sh <PROJECT_ID> <BRIEF_TEXT>"
  exit 1
fi

if [ -d "$PROJECT_DIR" ]; then
  echo "ERROR: Project $PROJECT_ID already exists at $PROJECT_DIR"
  exit 1
fi

# Create project structure
mkdir -p "$PROJECT_DIR"/{src,deliverables,docs}

# Copy template files
cp "$TEMPLATE_DIR/state.json" "$PROJECT_DIR/"
cp "$TEMPLATE_DIR/BRIEF.md" "$PROJECT_DIR/"

NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Update state.json
jq --arg id "$PROJECT_ID" --arg now "$NOW" --arg brief "$BRIEF_TEXT" \
  '.project_id = $id | .created = $now | .status = "planning" | .brief = $brief' \
  "$PROJECT_DIR/state.json" > /tmp/agentos-state-tmp.json
mv /tmp/agentos-state-tmp.json "$PROJECT_DIR/state.json"

# Update BRIEF.md
sed -i '' "s/{project_id}/$PROJECT_ID/g" "$PROJECT_DIR/BRIEF.md" 2>/dev/null || \
sed -i "s/{project_id}/$PROJECT_ID/g" "$PROJECT_DIR/BRIEF.md"
echo "" >> "$PROJECT_DIR/BRIEF.md"
echo "## Objective" >> "$PROJECT_DIR/BRIEF.md"
echo "$BRIEF_TEXT" >> "$PROJECT_DIR/BRIEF.md"

# Log
echo "{\"ts\":\"$NOW\",\"action\":\"project_created\",\"project\":\"$PROJECT_ID\",\"brief\":\"$BRIEF_TEXT\"}" \
  >> "$OPENCLAW_DIR/workspace/logs/audit.jsonl"

echo "✅ Created project: $PROJECT_DIR"
