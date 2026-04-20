#!/bin/bash
# hourly-snapshot.sh — run hourly via OPS cron
# Snapshots workspace to git + rotates openclaw.json config backups
# Tier: L2 (pre-approved, no approval needed)
set -e

WORKSPACE="$HOME/.openclaw/workspace"
BACKUP_DIR="$HOME/.openclaw/workspace/backups"
LOG="$WORKSPACE/logs/self-healing-ops.jsonl"
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# ── 1. Workspace git snapshot ──────────────────────────────────────────────
cd "$WORKSPACE"

if ! git rev-parse --git-dir > /dev/null 2>&1; then
  git init
  git config user.name "anuragg-saxenaa"
  git config user.email "anuragg.saxenaa@gmail.com"
  git add -A
  git commit -m "init workspace versioning"
  echo "{\"ts\":\"$TS\",\"event\":\"workspace_git_init\",\"status\":\"ok\"}" >> "$LOG"
fi

git add -A

if ! git diff --cached --quiet; then
  SNAPSHOT_MSG="hourly snapshot $TS"
  git commit -m "$SNAPSHOT_MSG"
  COMMIT=$(git rev-parse --short HEAD)
  echo "{\"ts\":\"$TS\",\"event\":\"workspace_snapshot\",\"commit\":\"$COMMIT\",\"status\":\"ok\"}" >> "$LOG"
else
  echo "{\"ts\":\"$TS\",\"event\":\"workspace_snapshot\",\"status\":\"no_changes\"}" >> "$LOG"
fi

# ── 2. Config backup ───────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"
CONFIG_SRC="$HOME/.openclaw/openclaw.json"
BACKUP_FILE="$BACKUP_DIR/openclaw-$(date +%Y%m%d-%H%M).json"

if [ -f "$CONFIG_SRC" ]; then
  cp "$CONFIG_SRC" "$BACKUP_FILE"
  echo "{\"ts\":\"$TS\",\"event\":\"config_backup\",\"file\":\"$BACKUP_FILE\",\"status\":\"ok\"}" >> "$LOG"
fi

# Keep last 72 backups (3 days × 24 hours)
ls -t "$BACKUP_DIR"/openclaw-*.json 2>/dev/null | tail -n +73 | xargs rm -f 2>/dev/null || true

echo "{\"ts\":\"$TS\",\"event\":\"hourly_snapshot_complete\",\"status\":\"ok\"}" >> "$LOG"
