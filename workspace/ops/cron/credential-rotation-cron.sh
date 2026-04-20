#!/bin/bash

# Cron Job for Credential Rotation
# Runs credential rotation periodically to keep keys fresh

set -euo pipefail

# Configuration
SCRIPT_DIR="$HOME/.openclaw/workspace/ops/scripts"
LOG_DIR="$HOME/.openclaw/workspace/logs"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Run credential rotation
"$SCRIPT_DIR/credential-rotation.sh" >> "$LOG_DIR/credential-rotation-$(date '+%Y%m%d').log" 2>&1

# Clean up old log files (keep last 30 days)
find "$LOG_DIR" -name "credential-rotation-*.log" -mtime +30 -delete