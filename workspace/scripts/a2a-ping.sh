#!/bin/bash
# Simple A2A ping - agents can call this to message each other

FROM_AGENT="$1"
TO_AGENT="$2"
MESSAGE="$3"
CHANNEL="${4:-C0AEV3MDEDD}"

# Check if SLACK_TOKEN is set
if [ -z "$SLACK_TOKEN" ]; then
    echo "Error: SLACK_TOKEN environment variable is not set"
    exit 1
fi

if [ -z "$FROM_AGENT" ] || [ -z "$TO_AGENT" ] || [ -z "$MESSAGE" ]; then
    echo "Usage: a2a-ping.sh <from> <to> <message> [channel]"
    exit 1
fi

if [ -z "$SLACK_TOKEN" ]; then
    echo "Error: SLACK_TOKEN environment variable is not set"
    exit 1
fi

# 1. Post the question
QUESTION_MSG="🔄 *$FROM_AGENT* → *$TO_AGENT*: $MESSAGE"
RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $SLACK_TOKEN" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "channel=$CHANNEL" \
    --data-urlencode "text=$QUESTION_MSG" \
    https://slack.com/api/chat.postMessage)

# Get the timestamp for threading
TS=$(echo $RESPONSE | grep -o '"ts":"[^"]*"' | cut -d'"' -f4)

# 2. Get response from target agent
AGENT_RESPONSE=$(openclaw agent --agent "$TO_AGENT" --message "$MESSAGE" 2>&1 | tail -c 800)

# 3. Post the response as a thread reply
curl -s -X POST \
    -H "Authorization: Bearer $SLACK_TOKEN" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "channel=$CHANNEL" \
    --data-urlencode "thread_ts=$TS" \
    --data-urlencode "text=💬 *$TO_AGENT*: $AGENT_RESPONSE" \
    https://slack.com/api/chat.postMessage > /dev/null

echo "✅ A2A Complete: $FROM_AGENT → $TO_AGENT"
