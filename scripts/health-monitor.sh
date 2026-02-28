#!/bin/bash
# OpenClaw Health Monitor
# Checks every 2 minutes and auto-restarts if needed

LOG_FILE="/Users/redinside/.openclaw/logs/health-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check if node process is running
if ! pgrep -f "openclaw.*node.*run" > /dev/null; then
    echo "[$DATE] Node process missing - restarting..." >> $LOG_FILE
    launchctl kickstart -k gui/$(id -u)/ai.openclaw.node
    sleep 3
    
    # Check if restart worked
    if pgrep -f "openclaw.*node.*run" > /dev/null; then
        echo "[$DATE] Node process restarted successfully" >> $LOG_FILE
    else
        echo "[$DATE] ERROR: Node process failed to restart" >> $LOG_FILE
    fi
fi

# Check if gateway is running
if ! pgrep -f "openclaw.*gateway" > /dev/null; then
    echo "[$DATE] Gateway process missing - restarting..." >> $LOG_FILE
    launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway
    sleep 3
fi

echo "[$DATE] Health check complete" >> $LOG_FILE
