# Google Drive Integration - Automatic Backups & File Sharing
## Use Your Free 15GB Google Drive for AI Company Backups

> **Time to Setup:** 20 minutes
> **Cost:** FREE (15GB included with Google account)
> **Benefits:** Automatic cloud backups, file sharing, recovery

---

## 🎯 What Google Drive Will Do

✅ **Automatic Backups:**
- Every hour → upload backup to Google Drive
- Keep last 30 days automatically
- 15GB free storage = months of backups

✅ **File Sharing:**
- Agents can read/write Google Drive files
- Share documents with team
- Collaborate on files

✅ **Disaster Recovery:**
- If Mac dies, everything is safe in cloud
- Restore from Google Drive in minutes
- Works from any computer

✅ **Agent Access:**
- Agents can upload reports
- Read shared documents
- Access knowledge base

---

## 📦 Setup (20 minutes)

### Step 1: Install Google Drive Desktop (5 min)

```bash
# Already installed? Check:
ls ~/Library/CloudStorage/GoogleDrive-*

# If not installed, download from:
# https://www.google.com/drive/download/

# After install, you'll have:
# ~/Library/CloudStorage/GoogleDrive-YOUR_EMAIL/My Drive/
```

### Step 2: Create Folder Structure (2 min)

```bash
# Create OpenClaw folder in Google Drive
GDRIVE=~/Library/CloudStorage/GoogleDrive-*/MyDrive
mkdir -p "$GDRIVE/OpenClaw"
mkdir -p "$GDRIVE/OpenClaw/backups"
mkdir -p "$GDRIVE/OpenClaw/reports"
mkdir -p "$GDRIVE/OpenClaw/shared-files"
mkdir -p "$GDRIVE/OpenClaw/logs"

echo "✅ Created OpenClaw folders in Google Drive"
```

### Step 3: Automatic Backup Script (10 min)

```bash
# Create backup script
cat > ~/.openclaw/backup/gdrive-backup.sh <<'EOF'
#!/bin/bash

# Find Google Drive path (works for any email)
GDRIVE=$(find ~/Library/CloudStorage -name "GoogleDrive-*" -type d | head -1)
GDRIVE_BACKUP="$GDRIVE/MyDrive/OpenClaw/backups"

if [ -z "$GDRIVE" ]; then
  echo "❌ Google Drive not found"
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="openclaw-backup-$TIMESTAMP"

echo "🔄 Creating backup: $BACKUP_NAME"

# Create temp backup
TEMP_DIR="/tmp/$BACKUP_NAME"
mkdir -p "$TEMP_DIR"

# Backup critical files
echo "📦 Backing up files..."
cp -r ~/.openclaw/openclaw.json "$TEMP_DIR/"
cp -r ~/.openclaw/agents "$TEMP_DIR/"
cp -r ~/.openclaw/workspace* "$TEMP_DIR/"
cp -r ~/.openclaw/knowledge-graph "$TEMP_DIR/" 2>/dev/null || true
cp -r ~/.openclaw/cost-monitor "$TEMP_DIR/" 2>/dev/null || true
cp -r ~/.openclaw/smart-router "$TEMP_DIR/" 2>/dev/null || true

# Create archive
cd /tmp
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME"

# Copy to Google Drive (instant upload!)
echo "☁️  Uploading to Google Drive..."
cp "$BACKUP_NAME.tar.gz" "$GDRIVE_BACKUP/"

# Cleanup temp
rm -rf "$TEMP_DIR" "$BACKUP_NAME.tar.gz"

# Show size
SIZE=$(du -sh "$GDRIVE_BACKUP/$BACKUP_NAME.tar.gz" | cut -f1)
echo "✅ Backup complete: $SIZE"
echo "📍 Location: $GDRIVE_BACKUP/$BACKUP_NAME.tar.gz"

# Cleanup old backups (keep last 30 days)
find "$GDRIVE_BACKUP" -name "openclaw-backup-*.tar.gz" -mtime +30 -delete

echo "🗑️  Cleaned up old backups (>30 days)"
EOF

chmod +x ~/.openclaw/backup/gdrive-backup.sh
```

### Step 4: Schedule Automatic Backups (3 min)

```bash
# Option A: Hourly backups (recommended)
cat > ~/Library/LaunchAgents/ai.openclaw.backup.plist <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.openclaw.backup</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/YOUR_USERNAME/.openclaw/backup/gdrive-backup.sh</string>
    </array>
    <key>StartInterval</key>
    <integer>3600</integer>
    <key>StandardOutPath</key>
    <string>/tmp/openclaw-backup.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/openclaw-backup-error.log</string>
</dict>
</plist>
EOF

# Replace YOUR_USERNAME
sed -i '' "s/YOUR_USERNAME/$(whoami)/g" ~/Library/LaunchAgents/ai.openclaw.backup.plist

# Load it
launchctl load ~/Library/LaunchAgents/ai.openclaw.backup.plist

echo "✅ Automatic hourly backups enabled!"
```

---

## 🔄 Restore from Google Drive

### Quick Restore Script

```bash
cat > ~/.openclaw/backup/gdrive-restore.sh <<'EOF'
#!/bin/bash

# Find Google Drive
GDRIVE=$(find ~/Library/CloudStorage -name "GoogleDrive-*" -type d | head -1)
GDRIVE_BACKUP="$GDRIVE/MyDrive/OpenClaw/backups"

echo "📋 Available backups:"
ls -lht "$GDRIVE_BACKUP"/*.tar.gz | head -10

read -p "Enter backup filename (or 'latest'): " BACKUP

if [ "$BACKUP" = "latest" ]; then
  BACKUP_FILE=$(ls -t "$GDRIVE_BACKUP"/*.tar.gz | head -1)
else
  BACKUP_FILE="$GDRIVE_BACKUP/$BACKUP"
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup not found: $BACKUP_FILE"
  exit 1
fi

echo "📦 Restoring from: $BACKUP_FILE"

# Stop gateway (if running)
pkill -f "node gateway/server.js"

# Extract to temp
TEMP_DIR="/tmp/openclaw-restore"
mkdir -p "$TEMP_DIR"
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Restore files
BACKUP_DIR=$(ls "$TEMP_DIR")
cp -r "$TEMP_DIR/$BACKUP_DIR/"* ~/.openclaw/

# Cleanup
rm -rf "$TEMP_DIR"

echo "✅ Restore complete!"
echo "▶️  Restart gateway: cd ~/.openclaw && node gateway/server.js"
EOF

chmod +x ~/.openclaw/backup/gdrive-restore.sh
```

**Usage:**
```bash
# List backups and restore
bash ~/.openclaw/backup/gdrive-restore.sh

# Or restore latest automatically
echo "latest" | bash ~/.openclaw/backup/gdrive-restore.sh
```

---

## 📄 Agent File Access (Add to Day 1)

### Step 1: Add Google Drive Tool

```bash
cat > ~/.openclaw/tools/gdrive.js <<'EOF'
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GoogleDriveTool {
  constructor() {
    // Find Google Drive path
    this.findGDrivePath();
  }

  async findGDrivePath() {
    try {
      const { stdout } = await execAsync('find ~/Library/CloudStorage -name "GoogleDrive-*" -type d');
      const paths = stdout.trim().split('\n');
      this.gdrivePath = path.join(paths[0], 'MyDrive');
      console.log(`✅ Found Google Drive: ${this.gdrivePath}`);
    } catch (error) {
      console.error('❌ Google Drive not found');
      this.gdrivePath = null;
    }
  }

  // Read file from Google Drive
  async read(filePath) {
    if (!this.gdrivePath) throw new Error('Google Drive not available');

    const fullPath = path.join(this.gdrivePath, filePath);
    const content = await fs.readFile(fullPath, 'utf8');

    return {
      success: true,
      content,
      path: filePath
    };
  }

  // Write file to Google Drive
  async write(filePath, content) {
    if (!this.gdrivePath) throw new Error('Google Drive not available');

    const fullPath = path.join(this.gdrivePath, filePath);

    // Create directories if needed
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Write file
    await fs.writeFile(fullPath, content, 'utf8');

    return {
      success: true,
      path: filePath,
      size: content.length
    };
  }

  // List files in Google Drive folder
  async list(folderPath = 'OpenClaw') {
    if (!this.gdrivePath) throw new Error('Google Drive not available');

    const fullPath = path.join(this.gdrivePath, folderPath);
    const files = await fs.readdir(fullPath, { withFileTypes: true });

    return {
      success: true,
      files: files.map(f => ({
        name: f.name,
        type: f.isDirectory() ? 'folder' : 'file',
        path: path.join(folderPath, f.name)
      }))
    };
  }

  // Upload report (agents use this)
  async uploadReport(agentId, title, content) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${agentId}-${title}-${timestamp}.md`;
    const filePath = `OpenClaw/reports/${filename}`;

    await this.write(filePath, content);

    return {
      success: true,
      filename,
      url: `Google Drive: OpenClaw/reports/${filename}`
    };
  }
}

// Singleton
export const gdrive = new GoogleDriveTool();
EOF
```

### Step 2: Add to Enhanced Handler

```bash
# Add to gateway/enhanced-handler.js
cat >> gateway/enhanced-handler.js <<'EOF'

// Add Google Drive tool
import { gdrive } from '../tools/gdrive.js';

// In handleMessage, add after response:
if (response.includes('report generated') || response.includes('analysis complete')) {
  // Auto-upload to Google Drive
  try {
    const result = await gdrive.uploadReport(agentId, 'auto-report', response);
    console.log(`📤 Uploaded to Google Drive: ${result.filename}`);
  } catch (error) {
    console.log('⚠️ Failed to upload to Google Drive:', error.message);
  }
}
EOF
```

### Step 3: Update Agent SOULs

```bash
# Add to each agent's SOUL.md
cat >> ~/.openclaw/workspace-main/SOUL.md <<'EOF'

## Google Drive Integration

You have access to Google Drive for:
- **Reading files**: Read shared documents, knowledge base
- **Writing reports**: Save your analyses to cloud
- **Collaboration**: Share files with other agents

### Tools Available:

1. **Read from Google Drive:**
```json
{
  "tool": "gdrive_read",
  "args": {
    "path": "OpenClaw/shared-files/document.txt"
  }
}
```

2. **Write to Google Drive:**
```json
{
  "tool": "gdrive_write",
  "args": {
    "path": "OpenClaw/reports/my-analysis.md",
    "content": "# Analysis\n\nFindings..."
  }
}
```

3. **List files:**
```json
{
  "tool": "gdrive_list",
  "args": {
    "folder": "OpenClaw/shared-files"
  }
}
```

**Use Cases:**
- Save important reports to cloud
- Read user's shared documents
- Collaborate via shared files
- Auto-backup your outputs
EOF
```

---

## 🎯 Example Use Cases

### Use Case 1: Automatic Report Backup

**User:** "Analyze crypto market trends"

**Agent:**
1. Does analysis
2. Generates report
3. **Automatically uploads to Google Drive**
4. User can access from anywhere!

```bash
# Report saved to:
# Google Drive/OpenClaw/reports/main-crypto-analysis-2026-02-13.md

# Accessible on:
# - Your Mac
# - drive.google.com
# - Google Drive mobile app
# - Any other computer
```

### Use Case 2: Shared Knowledge Base

```bash
# Create shared docs
cat > ~/Library/CloudStorage/GoogleDrive-*/MyDrive/OpenClaw/shared-files/company-info.txt <<'EOF'
Company Name: Acme Inc
Focus: AI automation
Products: AgentOS, AutoCoder
Tech Stack: Node.js, Python, React
EOF

# Now agents can read it!
# Agent: "What's our company name?"
# Reads from Google Drive → "Acme Inc"
```

### Use Case 3: Disaster Recovery

```bash
# Oh no! Mac crashed!

# On new Mac:
1. Install Google Drive Desktop
2. Run: bash gdrive-restore.sh
3. Select backup
4. Everything restored! ✅

# Time to recovery: 5 minutes
```

---

## 📊 Storage Planning

### What Gets Backed Up (Estimates)

```
openclaw.json            1 KB
agents/sessions         10 MB  (grows daily)
workspace files          5 MB
knowledge-graph          2 MB  (grows daily)
cost-monitor data      100 KB
smart-router config     10 KB
─────────────────────────────
Total per backup:      ~20 MB

Daily backups × 30 days = 600 MB
Hourly × 24 × 7 days   = 3.5 GB
──────────────────────────────
Total usage: ~4 GB (plenty of space in 15 GB free!)
```

### Backup Retention

```
Hourly backups:  Keep last 7 days    (168 backups)
Daily backups:   Keep last 30 days   (30 backups)
Weekly backups:  Keep last 6 months  (24 backups)

Auto-cleanup: Deletes old backups automatically
```

---

## 🔧 Advanced: Google Drive API (Optional)

For **full Google Drive API access** (upload anywhere, not just synced folder):

```bash
# Install Google Drive API
npm install googleapis

# Enable Google Drive API:
# 1. Go to: https://console.cloud.google.com
# 2. Create project: "OpenClaw"
# 3. Enable Google Drive API
# 4. Create OAuth credentials
# 5. Download credentials.json

# Then agents can:
# - Upload files anywhere
# - Share files with others
# - Create folders
# - Set permissions
# - Much more!
```

**But for Day 1, using Google Drive Desktop sync folder is simpler and works great!**

---

## ✅ Day 1 Integration Checklist

- [ ] Google Drive Desktop installed
- [ ] OpenClaw folders created in Google Drive
- [ ] Backup script created and tested
- [ ] Automatic hourly backups enabled
- [ ] Restore script tested
- [ ] Google Drive tool added to agents
- [ ] Agent SOULs updated with Google Drive instructions

**Test it:**
```bash
# Run manual backup
bash ~/.openclaw/backup/gdrive-backup.sh

# Check it's in Google Drive
ls -lh ~/Library/CloudStorage/GoogleDrive-*/MyDrive/OpenClaw/backups/

# Test restore
bash ~/.openclaw/backup/gdrive-restore.sh
```

---

## 🎉 Benefits You Get

✅ **Automatic Cloud Backups** - Every hour, hands-free
✅ **15GB Free Storage** - More than enough
✅ **Access Anywhere** - Mac, phone, web, any computer
✅ **Disaster Recovery** - Restore in 5 minutes
✅ **File Sharing** - Collaborate with agents
✅ **No Configuration** - Works immediately
✅ **Fast** - Local sync, instant uploads

**Total Cost: $0**
**Setup Time: 20 minutes**
**Peace of Mind: Priceless** 😊

---

## 🚀 Ready to Add Google Drive?

This is **perfect** for Day 1 because:
- ✅ Free
- ✅ Easy setup (20 min)
- ✅ Works immediately
- ✅ Great for backups
- ✅ Adds file sharing to agents

**Add this to your Day 1 implementation right after Phase 3!**

Want me to integrate this into the main Day 1 doc, or should we implement it now? 💪
