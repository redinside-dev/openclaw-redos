#!/bin/bash

# Episodes Seeder Script - Runs every 5 minutes to capture system episodes
# Creates episode logs for system health monitoring and autonomy scoring

set -euo pipefail

# Configuration
EPISODES_DIR="/Users/redinside/.openclaw/episodes"
LOG_FILE="/Users/redinside/.openclaw/workspace/ops/logs/episodes-seeder.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Create episodes directory if it doesn't exist
mkdir -p "$EPISODES_DIR"

# Capture system state
echo "[$TIMESTAMP] Episodes Seeder - Starting capture..." >> "$LOG_FILE"

# Capture system metrics
CPU_USAGE=$(ps aux | awk 'BEGIN {sum=0} {sum+=$3} END {print sum}')
MEMORY_USAGE=$(ps aux | awk 'BEGIN {sum=0} {sum+=$4} END {print sum}')
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')

# Capture running services
SERVICES=$(ps aux | grep -E "(openclaw|gateway|next-server)" | grep -v grep | wc -l)

# Capture recent errors
ERRORS=$(tail -20 /Users/redinside/.openclaw/logs/gateway.err.log | wc -l)

# Create episode entry
EPISODE_FILE="$EPISODES_DIR/episode-$TIMESTAMP.json"
cat > "$EPISODE_FILE" << EOF
{
  "timestamp": "$TIMESTAMP",
  "cpu_usage": $CPU_USAGE,
  "memory_usage": $MEMORY_USAGE,
  "disk_usage": $DISK_USAGE,
  "services_running": $SERVICES,
  "recent_errors": $ERRORS,
  "gateway_pid": $(pgrep -f "openclaw-gateway" | head -1),
  "next_server_pid": $(pgrep -f "next-server" | head -1)
}
EOF

echo "[$TIMESTAMP] Episodes Seeder - Captured episode to $EPISODE_FILE" >> "$LOG_FILE"

# Update autonomy score
AUTONOMY_SCORE=$(python3 /Users/redinside/.openclaw/workspace/scripts/calculate_autonomy.py 2>/dev/null || echo "0")

echo "[$TIMESTAMP] Episodes Seeder - Autonomy Score: $AUTONOMY_SCORE" >> "$LOG_FILE"

# Clean up old episodes (keep last 1000)
cd "$EPISODES_DIR"
ls -t | tail -n +1001 | xargs -r rm

echo "[$TIMESTAMP] Episodes Seeder - Completed successfully" >> "$LOG_FILE"

echo "Episodes Seeder run completed at $TIMESTAMP"
