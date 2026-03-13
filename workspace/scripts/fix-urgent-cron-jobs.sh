#!/bin/bash
# Fix urgent cron jobs - 3 jobs with consecutive errors

# Backup current jobs.json
cp /Users/redinside/.openclaw/cron/jobs.json /Users/redinside/.openclaw/cron/jobs.json.backup-urgent-fix

echo "Fixing cron jobs with consecutive errors..."

# Fix telegram-approval-monitor-0001 (model not allowed error)
# Change model to free-unlimited and increase timeout
jq '.jobs[] | select(.id=="telegram-approval-monitor-0001") | .payload.timeoutSeconds = 120 | .payload.model = "free-unlimited"' /Users/redinside/.openclaw/cron/jobs.json > /tmp/fixed-approval.json

# Fix a7862717-4e67-421f-9aa4-ee2131cf56c6 (SLA enforcement timeout)
# Increase timeout from 60 to 300 seconds
jq '.jobs[] | select(.id=="a7862717-4e67-421f-9aa4-ee2131cf56c6") | .payload.timeoutSeconds = 300' /Users/redinside/.openclaw/cron/jobs.json > /tmp/fixed-sla.json

# Fix session-loop-watchdog-0001 (model not allowed error)
# Change model to free-unlimited and increase timeout
jq '.jobs[] | select(.id=="session-loop-watchdog-0001") | .payload.timeoutSeconds = 120 | .payload.model = "free-unlimited"' /Users/redinside/.openclaw/cron/jobs.json > /tmp/fixed-watchdog.json

# Merge the fixes back into jobs.json
# Using a simple approach since jq doesn't support in-place editing easily
cp /Users/redinside/.openclaw/cron/jobs.json /tmp/jobs.json.original

# Apply approval monitor fix
jq '.jobs[] | select(.id=="telegram-approval-monitor-0001") |= (.payload.timeoutSeconds = 120 | .payload.model = "free-unlimited")' /tmp/jobs.json.original > /tmp/jobs.json.step1

# Apply SLA enforcement fix
jq '.jobs[] | select(.id=="a7862717-4e67-421f-9aa4-ee2131cf56c6") |= (.payload.timeoutSeconds = 300)' /tmp/jobs.json.step1 > /tmp/jobs.json.step2

# Apply watchdog fix
jq '.jobs[] | select(.id=="session-loop-watchdog-0001") |= (.payload.timeoutSeconds = 120 | .payload.model = "free-unlimited")' /tmp/jobs.json.step2 > /tmp/jobs.json.fixed

# Replace original with fixed version
cp /tmp/jobs.json.fixed /Users/redinside/.openclaw/cron/jobs.json

# Verify the changes
echo "=== Verification ==="
echo "Approval monitor:"
jq '.jobs[] | select(.id=="telegram-approval-monitor-0001") | {id, payload}' /Users/redinside/.openclaw/cron/jobs.json

echo ""
echo "SLA enforcement:"
jq '.jobs[] | select(.id=="a7862717-4e67-421f-9aa4-ee2131cf56c6") | {id, payload}' /Users/redinside/.openclaw/cron/jobs.json

echo ""
echo "Watchdog:"
jq '.jobs[] | select(.id=="session-loop-watchdog-0001") | {id, payload}' /Users/redinside/.openclaw/cron/jobs.json

echo ""
echo "=== Summary ==="
echo "Fixed 3 cron jobs with consecutive errors:"
echo "1. telegram-approval-monitor-0001: timeout increased to 120s, model set to free-unlimited"
echo "2. a7862717-4e67-421f-9aa4-ee2131cf56c6: timeout increased to 300s"
echo "3. session-loop-watchdog-0001: timeout increased to 120s, model set to free-unlimited"
echo ""
echo "Backup created at: /Users/redinside/.openclaw/cron/jobs.json.backup-urgent-fix"
echo "Restart cron daemon to apply changes immediately:"
echo "openclaw cron restart"