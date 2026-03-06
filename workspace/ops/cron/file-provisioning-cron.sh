#!/bin/bash

# Cron Job for File Provisioning
# Ensures all required files and directories exist

set -euo pipefail

# Configuration
SCRIPT_DIR="$HOME/.openclaw/workspace/ops/scripts"
LOG_DIR="$HOME/.openclaw/workspace/logs"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Run file provisioning
"$SCRIPT_DIR/file-provisioning.sh" >> "$LOG_DIR/file-provisioning-$(date '+%Y%m%d').log" 2>&1

# Clean up old log files (keep last 30 days)
find "$LOG_DIR" -name "file-provisioning-*.log" -mtime +30 -delete