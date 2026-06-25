#!/bin/bash
# Fix the l0-meta-loop cron job to use absolute path

openclaw cron get l0-meta-loop-2026-06-08-001 2>&1 | jq -r '.payload.message' > /tmp/l0-cron-message.txt

# Replace relative path with absolute
sed -i '' 's|workspace/scripts/l0-heartbeat.sh|/Users/redinside/.openclaw/workspace/scripts/l0-heartbeat.sh|g' /tmp/l0-cron-message.txt
sed -i '' 's|workspace: /Users/redinside/.openclaw/workspace|workspace: /Users/redinside/.openclaw/workspace|g' /tmp/l0-cron-message.txt

NEW_MESSAGE=$(cat /tmp/l0-cron-message.txt)

openclaw cron update l0-meta-loop-2026-06-08-001 --message "$NEW_MESSAGE" && echo "Updated successfully"