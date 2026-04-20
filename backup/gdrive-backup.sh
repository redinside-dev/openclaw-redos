#!/bin/bash

# Find Google Drive path (works for any email)
GDRIVE=$(find ~/Library/CloudStorage -maxdepth 1 -name "GoogleDrive-*" -type d 2>/dev/null | head -1)

if [ -z "$GDRIVE" ]; then
  echo "❌ Google Drive not found. Please install Google Drive Desktop."
  echo "   Download: https://www.google.com/drive/download/"
  exit 1
fi

GDRIVE_BACKUP="$GDRIVE/My Drive/OpenClaw/backups"

# Create backup directory if it doesn't exist
mkdir -p "$GDRIVE_BACKUP"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="openclaw-backup-$TIMESTAMP"

echo "🔄 Creating backup: $BACKUP_NAME"
echo "📍 Location: $GDRIVE_BACKUP"

# Create temp backup directory
TEMP_DIR="/tmp/$BACKUP_NAME"
mkdir -p "$TEMP_DIR"

# Backup critical files
echo "📦 Backing up files..."

# Configuration (has all API keys, bot tokens — most critical file)
[ -f ~/.openclaw/openclaw.json ] && cp ~/.openclaw/openclaw.json "$TEMP_DIR/" 2>/dev/null

# Device identity — Ed25519 keypair (cannot be regenerated if lost)
[ -d ~/.openclaw/identity ] && cp -r ~/.openclaw/identity "$TEMP_DIR/" 2>/dev/null

# Device registry — paired device tokens
[ -f ~/.openclaw/devices/paired.json ] && mkdir -p "$TEMP_DIR/devices" && cp ~/.openclaw/devices/paired.json "$TEMP_DIR/devices/" 2>/dev/null

# Exec approvals socket token
[ -f ~/.openclaw/exec-approvals.json ] && cp ~/.openclaw/exec-approvals.json "$TEMP_DIR/" 2>/dev/null

# Agents data
[ -d ~/.openclaw/agents ] && cp -r ~/.openclaw/agents "$TEMP_DIR/" 2>/dev/null

# Workspaces
for workspace in ~/.openclaw/workspace*; do
  [ -d "$workspace" ] && cp -r "$workspace" "$TEMP_DIR/" 2>/dev/null
done

# Enhanced gateway code
[ -d ~/.openclaw/smart-router ] && cp -r ~/.openclaw/smart-router "$TEMP_DIR/" 2>/dev/null
[ -d ~/.openclaw/cost-monitor ] && cp -r ~/.openclaw/cost-monitor "$TEMP_DIR/" 2>/dev/null
[ -d ~/.openclaw/gateway ] && cp -r ~/.openclaw/gateway "$TEMP_DIR/" 2>/dev/null

# Knowledge graph
[ -d ~/.openclaw/knowledge-graph ] && cp -r ~/.openclaw/knowledge-graph "$TEMP_DIR/" 2>/dev/null

# Package.json
[ -f ~/.openclaw/package.json ] && cp ~/.openclaw/package.json "$TEMP_DIR/" 2>/dev/null

echo "✅ Files collected"

# Create archive
echo "🗜️  Creating archive..."
cd /tmp
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME" 2>/dev/null

# Copy to Google Drive (instant upload via sync!)
echo "☁️  Uploading to Google Drive..."
cp "$BACKUP_NAME.tar.gz" "$GDRIVE_BACKUP/"

# Cleanup temp files
rm -rf "$TEMP_DIR" "$BACKUP_NAME.tar.gz"

# Show backup size
if [ -f "$GDRIVE_BACKUP/$BACKUP_NAME.tar.gz" ]; then
  SIZE=$(du -sh "$GDRIVE_BACKUP/$BACKUP_NAME.tar.gz" | cut -f1)
  echo "✅ Backup complete: $SIZE"
  echo "📁 File: $BACKUP_NAME.tar.gz"
else
  echo "❌ Backup failed"
  exit 1
fi

# Cleanup old backups (keep last 30 days)
echo "🗑️  Cleaning up old backups..."
find "$GDRIVE_BACKUP" -name "openclaw-backup-*.tar.gz" -mtime +30 -delete 2>/dev/null

# Count remaining backups
BACKUP_COUNT=$(ls -1 "$GDRIVE_BACKUP"/openclaw-backup-*.tar.gz 2>/dev/null | wc -l)
echo "📊 Total backups: $BACKUP_COUNT"

echo ""
echo "🎉 Backup complete!"
echo "   View at: $GDRIVE_BACKUP"
