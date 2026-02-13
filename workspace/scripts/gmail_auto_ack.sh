#!/usr/bin/env bash
set -euo pipefail

# Auto-ack replies for a specific thread.
# Safety rails:
# - only for THREAD_ID
# - only if latest message is from TARGET_SENDER (or contains it)
# - only send once (state file)

ACCOUNT="anorag.saxena@gmail.com"
THREAD_ID="19c30a9ce99658b3"
TARGET_SENDER="anuragsaxena.ai@gmail.com"
STATE_FILE="/Users/redinside/.openclaw/workspace/tmp/gmail-auto-ack-state.json"

mkdir -p "$(dirname "$STATE_FILE")"

if [[ -f "$STATE_FILE" ]] && grep -q '"replied"\s*:\s*true' "$STATE_FILE"; then
  exit 0
fi

# Pull latest message in thread (metadata) and check sender.
# Using JSON makes this robust.
LATEST_JSON=$(gog gmail thread get "$THREAD_ID" --account "$ACCOUNT" --format metadata --json 2>/dev/null || true)
if [[ -z "$LATEST_JSON" ]]; then
  exit 0
fi

# Extract last message headers: From + Message-Id (best-effort).
FROM_HDR=$(python3 - <<'PY'
import json,sys
j=json.load(sys.stdin)
msgs=j.get('messages') or []
if not msgs:
  print('')
  raise SystemExit
m=msgs[-1]
headers=(m.get('payload') or {}).get('headers') or []
for h in headers:
  if (h.get('name') or '').lower()=='from':
    print(h.get('value') or '')
    break
else:
  print('')
PY
<<<"$LATEST_JSON")

# Don't reply to our own sent message.
if echo "$FROM_HDR" | grep -qi "$ACCOUNT"; then
  exit 0
fi

# Only ack if it is from target sender.
if ! echo "$FROM_HDR" | grep -qi "$TARGET_SENDER"; then
  exit 0
fi

# Send reply within the same thread.
BODY="Acknowledged — thanks for your reply."

gog gmail send --account "$ACCOUNT" --thread-id "$THREAD_ID" --reply-all --subject "Re: Testing from Mac mini (OpenClaw)" --body "$BODY" >/dev/null

cat > "$STATE_FILE" <<JSON
{"threadId":"$THREAD_ID","replied":true}
JSON
