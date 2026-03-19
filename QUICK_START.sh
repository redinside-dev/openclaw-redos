#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║         🚀 OpenClaw Enhanced - Quick Start Setup 🚀           ║"
echo "║                                                                ║"
echo "║     Smart Routing + Cost Monitoring + Google Drive Backup     ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Change to openclaw directory
cd ~/.openclaw

# Check if we're in the right place
if [ ! -f "package.json" ]; then
  echo "❌ Error: Not in OpenClaw directory"
  exit 1
fi

echo "📍 Working directory: $(pwd)"
echo ""

# Step 1: Install Node.js dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Installing dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm install
if [ $? -ne 0 ]; then
  echo "❌ Failed to install dependencies"
  exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Step 2: Setup Google Drive backup
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Setting up Google Drive backup..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

GDRIVE=$(find ~/Library/CloudStorage -maxdepth 1 -name "GoogleDrive-*" -type d 2>/dev/null | head -1)

if [ -z "$GDRIVE" ]; then
  echo "⚠️  Google Drive not found"
  echo "   Install Google Drive Desktop for automatic backups:"
  echo "   https://www.google.com/drive/download/"
  echo ""
  read -p "   Skip Google Drive setup? (y/n): " SKIP
  if [ "$SKIP" != "y" ]; then
    exit 1
  fi
else
  echo "✅ Google Drive found: $GDRIVE"

  # Create OpenClaw folders
  mkdir -p "$GDRIVE/MyDrive/OpenClaw/backups"
  mkdir -p "$GDRIVE/MyDrive/OpenClaw/reports"
  mkdir -p "$GDRIVE/MyDrive/OpenClaw/shared-files"

  echo "✅ Created OpenClaw folders in Google Drive"

  # Run first backup
  echo "📦 Creating first backup..."
  bash backup/gdrive-backup.sh
  echo ""
fi

# Step 3: Instructions
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║                    ✅ SETUP COMPLETE! ✅                       ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🚀 Start the enhanced gateway:"
echo "   npm start"
echo ""
echo "📊 Open dashboard in browser:"
echo "   http://localhost:19000/"
echo ""
echo "💬 Test the API:"
echo "   curl -X POST http://localhost:19000/api/chat \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"agentId\":\"main\",\"message\":\"Hello!\"}'"
echo ""
echo "💰 Check costs:"
echo "   curl http://localhost:19000/api/cost"
echo ""
echo "📦 Manual backup:"
echo "   npm run backup"
echo ""
echo "🔄 Restore from backup:"
echo "   npm run restore"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Ready to start? Run: npm start"
echo ""
