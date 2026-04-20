#!/bin/bash
# Keep agent sessions warm so A2A doesn't timeout

AGENTS="main allrounder ops eng research finance infosec"

for agent in $AGENTS; do
    # Send a simple ping to warm up the session
    openclaw agent --agent "$agent" --message "ping" > /dev/null 2>&1 &
done

echo "Session warmup triggered for: $AGENTS"
