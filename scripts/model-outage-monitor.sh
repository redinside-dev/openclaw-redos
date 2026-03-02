#!/bin/bash
# Model Outage Monitor
# Watches gateway.err.log for "All models failed" - sends Telegram alert directly
# bypassing agents (no AI needed to send an alert that AI is down)

LOG_FILE="$HOME/.openclaw/logs/gateway.err.log"
STATE_FILE="/tmp/model-outage-alert-sent"
TELEGRAM_TOKEN="${TELEGRAM_TOKEN:-$(cat "$HOME/.openclaw/workspace/config/telegram-bot-token.txt" 2>/dev/null)}"
TELEGRAM_CHAT="1012034994"

send_telegram() {
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\":\"${TELEGRAM_CHAT}\",\"text\":\"$1\",\"parse_mode\":\"Markdown\"}" \
    > /dev/null 2>&1
}

# Count "All models failed" in the last 5 minutes
RECENT_FAILURES=$(tail -200 "$LOG_FILE" 2>/dev/null | \
  grep "All models failed\|LLM request timed out\|No credentials for provider" | \
  grep "$(date -u +'%Y-%m-%dT%H:%M' | cut -c1-15)" | wc -l | tr -d ' ')

if [ "$RECENT_FAILURES" -ge "5" ]; then
  # Check if we already sent an alert in the last 30 min
  if [ -f "$STATE_FILE" ]; then
    LAST_SENT=$(cat "$STATE_FILE")
    NOW=$(date +%s)
    AGE=$((NOW - LAST_SENT))
    if [ "$AGE" -lt "1800" ]; then
      exit 0  # Already alerted, wait
    fi
  fi

  # Send alert
  date +%s > "$STATE_FILE"

  SAMPLE=$(tail -50 "$LOG_FILE" 2>/dev/null | \
    grep "All models failed" | tail -1 | \
    sed 's/.*error=//;s/\"//g' | cut -c1-120)

  send_telegram "🚨 *Agent Outage Detected*

All AI models are failing. Agents cannot respond.

*Error:* \`${SAMPLE}\`

*Auto-actions taken:*
• 9Router watchdog running (will restart if hung)
• Fallback chain has 5 providers

*Check:* \`openclaw logs --follow\`"

elif [ "$RECENT_FAILURES" -eq "0" ] && [ -f "$STATE_FILE" ]; then
  # Recovery - notify if we had sent an alert
  LAST_SENT=$(cat "$STATE_FILE")
  NOW=$(date +%s)
  AGE=$((NOW - LAST_SENT))
  if [ "$AGE" -lt "3600" ]; then
    send_telegram "✅ *Agents Recovered*

All models responding normally again.
Downtime was approximately $((AGE / 60)) minutes."
    rm -f "$STATE_FILE"
  fi
fi
