#!/bin/bash
# create-project-repo.sh — ENG uses this to bootstrap a new OSS project
# Usage: bash scripts/create-project-repo.sh <slug> "<description>"
# Creates: GitHub repo + local clone + PM-LOG.md + SPEC.md scaffold

set -euo pipefail

SLUG="${1:?Usage: $0 <slug> <description>}"
DESC="${2:?Usage: $0 <slug> <description>}"
PROJECTS_DIR="$HOME/.openclaw/workspace/projects"
TEMPLATE_DIR="$PROJECTS_DIR/_template"
LOG="$HOME/.openclaw/logs/project-create.log"

TS() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "[$(TS)] $*" | tee -a "$LOG"; }

log "=== Creating project: $SLUG ==="

# 1. Create GitHub repo
log "Creating GitHub repo: anuragg-saxenaa/$SLUG"
gh repo create "anuragg-saxenaa/$SLUG" \
  --public \
  --description "$DESC" \
  --add-readme \
  --license mit 2>&1 | tee -a "$LOG" || {
    log "ERROR: gh repo create failed"
    exit 1
  }

# 2. Clone to workspace
CLONE_DIR="$PROJECTS_DIR/$SLUG/repo"
mkdir -p "$CLONE_DIR"
gh repo clone "anuragg-saxenaa/$SLUG" "$CLONE_DIR" 2>&1 | tee -a "$LOG"

# 3. Create PM-LOG.md from template
PROJECT_DIR="$PROJECTS_DIR/$SLUG"
mkdir -p "$PROJECT_DIR"

REPO_URL="https://github.com/anuragg-saxenaa/$SLUG"
TODAY=$(date +%Y-%m-%d)

sed "s|<slug>|$SLUG|g; s|\[PROJECT NAME\]|$SLUG|g; s|\[date\]|$TODAY|g; s|redinside-dev/<slug>|anuragg-saxenaa/$SLUG|g" \
  "$TEMPLATE_DIR/PM-LOG.md" > "$PROJECT_DIR/PM-LOG.md"

log "Created: $PROJECT_DIR/PM-LOG.md"

# 4. Update pr-log.md backlog status board
echo "| $TODAY | $SLUG | repo created | $REPO_URL | 🏗️ building |" \
  >> "$PROJECTS_DIR/pr-log.md"

# 5. Append to tasks-log
echo "$(TS) | ENG | PRJ-create-$SLUG | eng | P1 | Create GitHub repo for $SLUG | DONE | repo: $REPO_URL" \
  >> "$HOME/.openclaw/workspace/tasks-log.md"

log "=== Done: $SLUG ==="
log "Repo: $REPO_URL"
log "Local: $CLONE_DIR"
echo ""
echo "Next steps for ENG:"
echo "  1. cd $CLONE_DIR"
echo "  2. Implement MVP per $PROJECT_DIR/SPEC.md"
echo "  3. git checkout -b feat/mvp && git commit && gh pr create"
echo "  4. Append PR to workspace/projects/pr-log.md"
