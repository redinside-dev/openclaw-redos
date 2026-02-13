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

# Step 2: Check Ollama
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Checking Ollama models..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ! command -v ollama &> /dev/null; then
  echo "⚠️  Ollama not found. Please install:"
  echo "   https://ollama.ai"
  exit 1
fi

echo "Checking required models..."

# Check for llama3.1:8b
if ! ollama list | grep -q "llama3.1:8b"; then
  echo "📥 Pulling llama3.1:8b..."
  ollama pull llama3.1:8b
fi

# Check for llama3.1:70b
if ! ollama list | grep -q "llama3.1:70b"; then
  echo "📥 Pulling llama3.1:70b (large, ~40GB)..."
  echo "   This may take a while..."
  ollama pull llama3.1:70b
fi

echo "✅ Ollama models ready"
echo ""

# Step 3: Setup Google Drive backup
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

# Step 4: Test the system
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Testing system..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test ollama
echo "Testing Ollama..."
echo "What is 2+2?" | ollama run llama3.1:8b > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Ollama working"
else
  echo "⚠️  Ollama test failed"
fi

echo ""

# Step 5: Instructions
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
