#!/bin/bash

# Cron Job for Health Monitor
# Runs health checks periodically and logs results

set -euo pipefail

# Configuration
SCRIPT_DIR="$HOME/.openclaw/workspace/ops/scripts"
LOG_DIR="$HOME/.openclaw/workspace/logs"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Run health monitor
"$SCRIPT_DIR/health-monitor.sh" >> "$LOG_DIR/health-monitor-$(date '+%Y%m%d').log" 2>&1

# Clean up old log files (keep last 30 days)
find "$LOG_DIR" -name "health-monitor-*.log" -mtime +30 -delete