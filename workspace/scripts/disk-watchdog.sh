#!/bin/bash
# AgentOS — Disk Space Watchdog
# Monitors disk usage, auto-cleans old files, alerts on critical levels.
# Run via cron every 4 hours.

OPENCLAW_DIR="$HOME/.openclaw"
AUDIT_LOG="$OPENCLAW_DIR/workspace/logs/audit.jsonl"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
AVAIL=$(df -h / | awk 'NR==2 {print $4}')

echo "{\"ts\":\"$NOW\",\"action\":\"disk_check\",\"usage_pct\":$USAGE,\"available\":\"$AVAIL\"}" >> "$AUDIT_LOG"

if [ "$USAGE" -gt 85 ]; then
  echo "$(date): Disk at ${USAGE}% ($AVAIL free). Running auto-cleanup..."

  # 1. Compress old session files (>30 days)
  COMPRESSED=0
  find "$OPENCLAW_DIR/agents/"*/sessions/ -name "*.jsonl" -mtime +30 2>/dev/null | while read f; do
    gzip "$f" 2>/dev/null && COMPRESSED=$((COMPRESSED + 1))
  done

  # 2. Clean Docker unused images, containers, volumes
  docker system prune -f --volumes 2>/dev/null

  # 3. Archive old memory files (>90 days)
  mkdir -p "$OPENCLAW_DIR/workspace/memory/archive"
  find "$OPENCLAW_DIR/workspace/memory/" -maxdepth 1 -name "*.md" -mtime +90 2>/dev/null | while read f; do
    mv "$f" "$OPENCLAW_DIR/workspace/memory/archive/"
  done

  # 4. Compress old logs (>7 days, skip current)
  find "$OPENCLAW_DIR/workspace/logs/" -name "*.jsonl" -mtime +7 2>/dev/null | while read f; do
    gzip "$f" 2>/dev/null
  done

  # 5. Clean /tmp
  find /tmp -name "agentos-*" -mtime +1 -delete 2>/dev/null

  NEW_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
  echo "$(date): Cleanup done. Disk: ${USAGE}% → ${NEW_USAGE}%"
  
  echo "{\"ts\":\"$NOW\",\"action\":\"disk_cleanup\",\"before_pct\":$USAGE,\"after_pct\":$NEW_USAGE}" >> "$AUDIT_LOG"
fi

if [ "$USAGE" -gt 95 ]; then
  echo "🔴 CRITICAL: Disk at ${USAGE}%. Manual intervention required!"
  echo "{\"ts\":\"$NOW\",\"action\":\"disk_critical\",\"usage_pct\":$USAGE}" >> "$AUDIT_LOG"
fi
