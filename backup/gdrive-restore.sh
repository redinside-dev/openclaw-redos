#!/bin/bash

# Find Google Drive
GDRIVE=$(find ~/Library/CloudStorage -maxdepth 1 -name "GoogleDrive-*" -type d 2>/dev/null | head -1)

if [ -z "$GDRIVE" ]; then
  echo "❌ Google Drive not found"
  exit 1
fi

GDRIVE_BACKUP="$GDRIVE/MyDrive/OpenClaw/backups"

echo "📋 Available backups:"
echo ""
ls -lht "$GDRIVE_BACKUP"/*.tar.gz 2>/dev/null | head -10 | awk '{print $9}' | xargs -n1 basename
echo ""

read -p "Enter backup filename (or 'latest' for most recent): " BACKUP

if [ "$BACKUP" = "latest" ]; then
  BACKUP_FILE=$(ls -t "$GDRIVE_BACKUP"/*.tar.gz 2>/dev/null | head -1)
  echo "Selected: $(basename $BACKUP_FILE)"
else
  BACKUP_FILE="$GDRIVE_BACKUP/$BACKUP"
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup not found: $BACKUP_FILE"
  exit 1
fi

echo ""
echo "📦 Restoring from: $(basename $BACKUP_FILE)"
echo ""
read -p "⚠️  This will overwrite current files. Continue? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
  echo "Cancelled"
  exit 0
fi

# Stop gateway if running
echo "⏸️  Stopping gateway..."
pkill -f "node gateway/server.js" 2>/dev/null
sleep 2

# Extract to temp
echo "📂 Extracting backup..."
TEMP_DIR="/tmp/openclaw-restore"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Find the backup directory name
BACKUP_DIR=$(ls "$TEMP_DIR" | head -1)

if [ -z "$BACKUP_DIR" ]; then
  echo "❌ Failed to extract backup"
  exit 1
fi

# Restore files
echo "📋 Restoring files..."

# Backup current state first (just in case)
if [ -d ~/.openclaw ]; then
  echo "💾 Creating safety backup of current state..."
  SAFETY_BACKUP="/tmp/openclaw-pre-restore-$(date +%Y%m%d-%H%M%S).tar.gz"
  tar -czf "$SAFETY_BACKUP" -C ~ .openclaw 2>/dev/null
  echo "   Safety backup: $SAFETY_BACKUP"
fi

# Restore
cp -r "$TEMP_DIR/$BACKUP_DIR/"* ~/.openclaw/

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✅ Restore complete!"
echo ""
echo "Next steps:"
echo "1. Install dependencies: cd ~/.openclaw && npm install"
echo "2. Start gateway: npm start"
echo ""
