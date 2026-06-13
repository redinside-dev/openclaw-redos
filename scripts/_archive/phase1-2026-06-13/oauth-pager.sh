#!/usr/bin/env bash
# scripts/oauth-pager.sh
#
# Pages Anurag with a one-tap OAuth re-auth request when the rotator
# needs human action (i.e. the callback file was just written).
#
# Channels (in order of preference; first one that exists wins):
#   1. Slack DM to Anurag (most reliable, least nag-friction)
#   2. Telegram DM to user id 1012034994 (works when Slack is also broken)
#   3. Append to workspace-main/inbox/tasks.md (always works, no notification)
#   4. Exit 4 so the caller can decide what to do
#
# This script does NOT do the rotation itself. Read gog-oauth-callback.txt,
# format a one-tap-friendly message, and dispatch.
#
# Usage:
#   oauth-pager.sh                    # detect pending state, page
#   oauth-pager.sh --dry-run          # print the message, don't send
#   oauth-pager.sh --test             # send "test page" to verify wiring
#
# Exit codes:
#   0 = page sent (or written to inbox.md fallback)
#   1 = no pending state (nothing to page about)
#   4 = page failed AND no fallback channel available

set -euo pipefail

STATE_DIR="workspace-finance/ops"
CALLBACK_FILE="$STATE_DIR/gog-oauth-callback.txt"
PENDING_FILE="$STATE_DIR/gog-oauth-pending-step1.json"
INBOX="workspace-main/inbox/tasks.md"
SLACK_BOT_TOKEN_ENV="${SLACK_BOT_TOKEN:-}"
ANURAG_SLACK_ID="${ANURAG_SLACK_ID:-U01ANURAG0}"  # placeholder; resolved at runtime
ANURAG_TELEGRAM_ID="1012034994"

DRY_RUN=0
TEST=0
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --test) TEST=1; shift ;;
    -h|--help)
      sed -n '2,25p' "$0" | sed 's/^# //;s/^#//'
      exit 0
      ;;
    *) echo "unknown arg: $1" >&2; exit 4 ;;
  esac
done

# --- 1) Detect pending state ---
PAGE_REASON=""
if [ "$TEST" -eq 1 ]; then
  PAGE_REASON="test"
elif [ -s "$PENDING_FILE" ]; then
  PAGE_REASON=$(python3 -c "import json,sys; d=json.load(open('$PENDING_FILE')); print(d.get('reason','unknown'))" 2>/dev/null || echo "pending")
else
  echo "[pager] no pending rotation in $PENDING_FILE, nothing to page"
  exit 1
fi

# --- 2) Compose message ---
NOW_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
AUTH_URL=""
if [ -s "$PENDING_FILE" ] && [ "$TEST" -eq 0 ]; then
  AUTH_URL=$(python3 -c "import json,sys; d=json.load(open('$PENDING_FILE')); print(d.get('auth_url',''))" 2>/dev/null || echo "")
fi

if [ "$TEST" -eq 1 ]; then
  MSG="🔐 [oauth-pager test] One-tap re-auth would land here at $NOW_ISO. If you see this, pager wiring works."
else
  SHORT_URL="${AUTH_URL:0:80}..."
  MSG="🔐 *gog OAuth re-auth needed* (reason: \`$PAGE_REASON\`)

Open this URL in any browser, sign in as \`anorag.saxena@gmail.com\`, click Allow:

\`$SHORT_URL\`

(URL is in \`workspace-finance/ops/gog-oauth-callback.txt\` — full length.)

After redirect, paste the full URL back to me, or it'll be picked up on the next 5-min cron tick. Filed $NOW_ISO."
fi

# --- 3) Dispatch ---
if [ "$DRY_RUN" -eq 1 ]; then
  echo "----- [pager DRY-RUN] would send: -----"
  echo "$MSG"
  echo "----- end -----"
  exit 0
fi

# Try Slack first (most reliable)
if [ -n "$SLACK_BOT_TOKEN_ENV" ] && command -v curl >/dev/null 2>&1; then
  echo "[pager] sending Slack DM to Anurag..."
  set +e
  RESP=$(curl -s --max-time 10 -X POST "https://slack.com/api/chat.postMessage" \
    -H "Authorization: Bearer $SLACK_BOT_TOKEN_ENV" \
    -H "Content-type: application/json; charset=utf-8" \
    -d "$(python3 -c "import json,sys; print(json.dumps({'channel': sys.argv[1], 'text': sys.argv[2]}))" "$ANURAG_SLACK_ID" "$MSG")" 2>&1)
  RC=$?
  set -e
  if [ $RC -eq 0 ] && echo "$RESP" | grep -q '"ok":true'; then
    echo "[pager] Slack DM sent"
    exit 0
  else
    echo "[pager] Slack DM failed: $RESP" >&2
  fi
fi

# Try Telegram second
if command -v curl >/dev/null 2>&1 && [ -n "${TELEGRAM_BOT_TOKEN:-}" ]; then
  echo "[pager] sending Telegram DM..."
  set +e
  RESP=$(curl -s --max-time 10 -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${ANURAG_TELEGRAM_ID}" \
    -d "text=${MSG}" \
    -d "parse_mode=Markdown" 2>&1)
  RC=$?
  set -e
  if [ $RC -eq 0 ] && echo "$RESP" | grep -q '"ok":true'; then
    echo "[pager] Telegram DM sent"
    exit 0
  else
    echo "[pager] Telegram DM failed: $RESP" >&2
  fi
fi

# Fall back to inbox.md (silent — Anurag sees it on his next session)
echo "[pager] no real-time channel available; appending to $INBOX"
mkdir -p "$(dirname "$INBOX")"
cat >> "$INBOX" <<EOF

## [PENDING] gog OAuth re-auth needed — $NOW_ISO

- **Reason:** \`$PAGE_REASON\`
- **File:** \`workspace-finance/ops/gog-oauth-callback.txt\`
- **Auth URL (truncated):** \`${AUTH_URL:0:120}...\`
- **Steps for Anurag:** open URL, sign in, click Allow, paste redirect URL back.

Filed by: scripts/oauth-pager.sh
EOF

echo "[pager] appended to inbox.md (silent — will be seen on next session)"
exit 0
