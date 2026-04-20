#!/bin/bash
# Gateway restart script for OpenClaw health monitoring
# This script is called by the health monitor system to restart the gateway service

# Exit immediately if any command fails

set -e

# Log the restart attempt
log_file="/Users/redinside/.openclaw/logs/gateway-restart.log"
echo "$(date): Gateway restart initiated" >> "$log_file"

# Check if gateway is running
if pgrep -f "openclaw gateway" > /dev/null; then
    echo "$(date): Gateway is running, no restart needed" >> "$log_file"
    exit 0
fi

# Try to restart gateway using the installed openclaw CLI
if command -v openclaw &> /dev/null; then
    echo "$(date): Using openclaw CLI to restart gateway" >> "$log_file"
    openclaw gateway restart
else
    # Fallback: try to find and kill any gateway processes, then restart
    echo "$(date): Using fallback method to restart gateway" >> "$log_file"
    
    # Kill any existing gateway processes
    if pgrep -f "openclaw gateway" > /dev/null; then
        pkill -f "openclaw gateway"
        sleep 2
    fi
    
    # Start gateway in background
    # Note: This assumes the gateway binary is in the PATH or current directory
    nohup openclaw gateway start &> /dev/null &
    sleep 5
fi

# Verify gateway started successfully
if pgrep -f "openclaw gateway" > /dev/null; then
    echo "$(date): Gateway restarted successfully" >> "$log_file"
    exit 0
else
    echo "$(date): Failed to restart gateway" >> "$log_file"
    exit 1
fi