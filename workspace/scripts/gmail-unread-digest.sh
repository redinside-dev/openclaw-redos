#!/bin/bash
# Gmail Unread Digest Script
# Sends Telegram summary of new unread emails

set -e

STATE_FILE="/Users/redinside/.openclaw/workspace/tmp/gmail-unread-digest.json"
ACCOUNT="anorag.saxena@gmail.com"
TELEGRAM_USER_ID="1012034994"

# Ensure state file exists
if [ ! -f "$STATE_FILE" ]; then
    echo '{"seenThreadIds":[]}' > "$STATE_FILE"
fi

# Load seen thread IDs
SEEN_IDS=$(cat "$STATE_FILE" | jq -r '.seenThreadIds // [] | .[]' 2>/dev/null || true)

# Fetch unread inbox threads (max 15)
THREADS_JSON=$(gog gmail search "in:inbox is:unread" --account "$ACCOUNT" --json --max 15 2>/dev/null) || {
    echo "Failed to fetch Gmail threads"
    exit 1
}

# Check if no threads returned
if [ -z "$THREADS_JSON" ] || [ "$THREADS_JSON" = "[]" ] || [ "$THREADS_JSON" = "null" ]; then
    echo "No unread threads found"
    exit 0
fi

# Build list of new threads
NEW_THREADS=""
NEW_COUNT=0
ALL_THREAD_IDS=""

# Process threads - format is newline-delimited JSON objects
while IFS= read -r thread; do
    [ -z "$thread" ] && continue
    
    THREAD_ID=$(echo "$thread" | jq -r '.id // empty' 2>/dev/null)
    [ -z "$THREAD_ID" ] && continue
    
    # Add to all thread IDs for state update
    if [ -z "$ALL_THREAD_IDS" ]; then
        ALL_THREAD_IDS="\"$THREAD_ID\""
    else
        ALL_THREAD_IDS="$ALL_THREAD_IDS, \"$THREAD_ID\""
    fi
    
    # Check if this is a new thread
    IS_NEW=true
    for seen_id in $SEEN_IDS; do
        if [ "$seen_id" = "$THREAD_ID" ]; then
            IS_NEW=false
            break
        fi
    done
    
    if [ "$IS_NEW" = true ]; then
        DATE=$(echo "$thread" | jq -r '.date // .internalDate // "Unknown"' 2>/dev/null)
        FROM=$(echo "$thread" | jq -r '.from // "Unknown"' 2>/dev/null | sed 's/"//g')
        SUBJECT=$(echo "$thread" | jq -r '.subject // "(no subject)"' 2>/dev/null | sed 's/"//g')
        
        # Truncate long fields
        FROM=$(echo "$FROM" | cut -c1-50)
        SUBJECT=$(echo "$SUBJECT" | cut -c1-80)
        
        if [ $NEW_COUNT -lt 8 ]; then
            if [ -n "$NEW_THREADS" ]; then
                NEW_THREADS="$NEW_THREADS
"
            fi
            NEW_THREADS="${NEW_THREADS}• $DATE | $FROM | $SUBJECT"
        fi
        ((NEW_COUNT++)) || true
    fi
done <<< "$(echo "$THREADS_JSON" | jq -c '.[]' 2>/dev/null)"

# If no new threads, exit
if [ $NEW_COUNT -eq 0 ]; then
    echo "No new unread threads since last check"
    # Still update state with current threads
    echo "{\"seenThreadIds\": [$ALL_THREAD_IDS]}" | jq -c '.' > "$STATE_FILE"
    exit 0
fi

# Build message
MESSAGE="📧 Unread Gmail (since last check)

$NEW_THREADS"

if [ $NEW_COUNT -gt 8 ]; then
    MORE=$((NEW_COUNT - 8))
    MESSAGE="$MESSAGE

(+ $MORE more)"
fi

MESSAGE="$MESSAGE

Provider: cron | Model: automated"

# Send Telegram message
openclaw message send --target "$TELEGRAM_USER_ID" --message "$MESSAGE" --channel telegram 2>/dev/null || {
    echo "Failed to send Telegram message"
    exit 1
}

# Update state file
echo "{\"seenThreadIds\": [$ALL_THREAD_IDS]}" | jq -c '.' > "$STATE_FILE"

echo "Sent summary of $NEW_COUNT new unread threads"
