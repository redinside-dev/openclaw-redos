#!/bin/bash
# alert-lib.sh — Shared alert helpers. SOURCE this, do NOT execute directly.
# Usage: . "$HOME/.openclaw/scripts/alert-lib.sh"
# Provides: send_telegram_direct(), send_slack_direct()

TELEGRAM_CHAT="${TELEGRAM_CHAT:-1012034994}"
TOKEN_FILE="${TOKEN_FILE:-$HOME/.openclaw/workspace/config/telegram-bot-token.txt}"
N8N_SLACK_WEBHOOK="${N8N_SLACK_WEBHOOK:-http://127.0.0.1:5678/webhook/slack-post}"
OPS_SLACK_CHANNEL="${OPS_SLACK_CHANNEL:-C0AGFA9417T}"
# Resolve live token from credentials/secrets.json (authoritative source)
TELEGRAM_TOKEN=$(python3 -c "import json; d=json.load(open('$HOME/.openclaw/credentials/secrets.json')); print(d['channels']['telegram']['accounts']['default'])" 2>/dev/null || cat "$TOKEN_FILE" 2>/dev/null | tr -d '\n' || echo "")

send_telegram_direct() {
  local msg="$1"
  local token
  token="${TELEGRAM_TOKEN:-}"
  [[ -z "$token" ]] && return 1
  local tmpfile
  tmpfile=$(mktemp /tmp/tg-alert-XXXXXX.json)
  printf '{"chat_id":"%s","text":"%s","parse_mode":"HTML"}' \
    "$TELEGRAM_CHAT" \
    "$(echo "$msg" | sed 's/"/\\"/g; s/$/\\n/' | tr -d '\n' | sed 's/\\n$//')" \
    > "$tmpfile"
  curl -s --max-time 10 -X POST \
    "https://api.telegram.org/bot${token}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "@$tmpfile" > /dev/null 2>&1
  local rc=$?
  rm -f "$tmpfile"
  return $rc
}

send_slack_direct() {
  # Posts via n8n slack-post webhook — best effort (n8n may also be down)
  local msg="$1"
  curl -s --max-time 5 -X POST "$N8N_SLACK_WEBHOOK" \
    -H "Content-Type: application/json" \
    -d "{\"channel\":\"${OPS_SLACK_CHANNEL}\",\"text\":\"$(echo "$msg" | sed 's/"/\\"/g')\"}" \
    > /dev/null 2>&1 || true
}
