#!/bin/bash
# AgentOS — Daily Cloud Backup to iCloud Drive
# Backs up all critical config, skills, memory, and project files.
# Run daily at 3 AM via cron.

OPENCLAW_DIR="$HOME/.openclaw"
BACKUP_DATE=$(date +%Y-%m-%d)
BACKUP_DEST="$HOME/Library/Mobile Documents/com~apple~CloudDocs/AgentOS-Backups"
AUDIT_LOG="$OPENCLAW_DIR/workspace/logs/audit.jsonl"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

mkdir -p "$BACKUP_DEST"

echo "$(date): Starting AgentOS backup..."

tar -czf "$BACKUP_DEST/agentos-${BACKUP_DATE}.tar.gz" \
  "$OPENCLAW_DIR/openclaw.json" \
  "$OPENCLAW_DIR/workspace/config/" \
  "$OPENCLAW_DIR/workspace/skills/" \
  "$OPENCLAW_DIR/workspace/scripts/" \
  "$OPENCLAW_DIR/workspace/projects/" \
  "$OPENCLAW_DIR/workspace/memory/" \
  "$OPENCLAW_DIR/workspace/knowledge/" \
  "$OPENCLAW_DIR/workspace/POLICY.md" \
  "$OPENCLAW_DIR/workspace/AI_COMPANY_OS.md" \
  "$OPENCLAW_DIR/workspace/ORG_STRUCTURE.md" \
  "$OPENCLAW_DIR/workspace/SOUL.md" \
  "$OPENCLAW_DIR/workspace/USER.md" \
  "$OPENCLAW_DIR/cron/" \
  2>/dev/null

if [ $? -eq 0 ]; then
  SIZE=$(ls -lh "$BACKUP_DEST/agentos-${BACKUP_DATE}.tar.gz" | awk '{print $5}')
  echo "$(date): Backup saved: agentos-${BACKUP_DATE}.tar.gz ($SIZE)"
  echo "{\"ts\":\"$NOW\",\"action\":\"backup_ok\",\"file\":\"agentos-${BACKUP_DATE}.tar.gz\",\"size\":\"$SIZE\"}" >> "$AUDIT_LOG"
else
  echo "$(date): ERROR: Backup failed!"
  echo "{\"ts\":\"$NOW\",\"action\":\"backup_failed\"}" >> "$AUDIT_LOG"
fi

# Keep only last 7 backups
ls -t "$BACKUP_DEST"/agentos-*.tar.gz 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null

echo "$(date): Backup complete. Retained last 7 daily backups."
