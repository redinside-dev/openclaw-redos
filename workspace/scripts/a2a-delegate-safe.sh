#!/bin/bash
# Safe A2A delegation with timeout and retry

FROM="$1"
TO="$2"
TASK="$3"
CHANNEL="${4:-C0AEV3MDEDD}"
TIMEOUT="${5:-120}"
MAX_RETRIES="${6:-2}"

# Check if SLACK_TOKEN is set
if [ -z "$SLACK_TOKEN" ]; then
    echo "Error: SLACK_TOKEN environment variable is not set"
    exit 1
fi

if [ -z "$FROM" ] || [ -z "$TO" ] || [ -z "$TASK" ]; then
    echo "Usage: a2a-delegate-safe.sh <from> <to> <task> [channel] [timeout] [retries]"
    exit 1
fi

if [ -z "$SLACK_TOKEN" ]; then
    echo "Error: SLACK_TOKEN environment variable is not set"
    exit 1
fi

# Post delegation request
RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $SLACK_TOKEN" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "channel=$CHANNEL" \
    --data-urlencode "text=🔄 *$FROM* → *$TO*: $TASK" \
    https://slack.com/api/chat.postMessage)

TS=$(echo $RESPONSE | grep -o '"ts":"[^"]*"' | cut -d'"' -f4)

RETRY=0
RESULT=""

while [ $RETRY -le $MAX_RETRIES ]; do
    # Execute with timeout
    RESULT=$(timeout $TIMEOUT openclaw agent --agent "$TO" --message "$TASK" 2>&1 | tail -c 800)
    
    if [ $? -eq 0 ]; then
        break
    else
        RETRY=$((RETRY + 1))
        echo "Retry $RETRY/$MAX_RETRIES..."
        sleep 2
    fi
done

# Post result
curl -s -X POST \
    -H "Authorization: Bearer $SLACK_TOKEN" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "channel=$CHANNEL" \
    --data-urlencode "thread_ts=$TS" \
    --data-urlencode "text=💬 *$TO*: $RESULT" \
    https://slack.com/api/chat.postMessage > /dev/null

# Log to file
echo "{\"ts\":\"$(date -Iseconds)\",\"from\":\"$FROM\",\"to\":\"$TO\",\"task\":\"$TASK\",\"success\":$([ $? -eq 0 ] && echo "true" || echo "false")}" >> /Users/redinside/.openclaw/workspace/logs/a2a-delegations.jsonl

echo "✅ A2A Complete: $FROM → $TO"
