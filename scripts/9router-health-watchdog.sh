#!/bin/bash
# 9Router Health Watchdog
# Detects hung 9router process (alive but unresponsive) and restarts it
# LaunchD KeepAlive will auto-restart after kill

LOG="$HOME/.openclaw/logs/9router-watchdog.log"
FAIL_FILE="/tmp/9router-watchdog-fails"
TELEGRAM_TOKEN="REDACTED_TELEGRAM_BOT_TOKEN"
TELEGRAM_CHAT="1012034994"

send_alert() {
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\":\"${TELEGRAM_CHAT}\",\"text\":\"$1\",\"parse_mode\":\"Markdown\"}" \
    > /dev/null 2>&1
}

# Check if 9router responds on port 20128
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:20128/v1/models \
  -H "Authorization: Bearer test" \
  --max-time 5 2>/dev/null)

if [ "$HTTP_CODE" = "200" ]; then
  # Healthy - reset fail counter and take a rolling backup of db.json
  echo "0" > "$FAIL_FILE"
  DB="$HOME/.9router/db.json"
  BACKUP="$HOME/.9router/db.json.auto-backup"
  # Only backup if db.json is substantive (>5KB = has real provider data)
  DB_SIZE=$(wc -c < "$DB" 2>/dev/null || echo "0")
  if [ "$DB_SIZE" -gt "5000" ]; then
    cp "$DB" "$BACKUP" 2>/dev/null
  fi
  exit 0
fi

# Unresponsive - increment fail counter
FAILS=$(cat "$FAIL_FILE" 2>/dev/null || echo "0")
FAILS=$((FAILS + 1))
echo "$FAILS" > "$FAIL_FILE"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] 9Router check FAILED (${FAILS}/2) HTTP=${HTTP_CODE}" >> "$LOG"

if [ "$FAILS" -ge "2" ]; then
  # 2 consecutive failures (≈4 min) → kill and let launchd restart
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] 9Router unresponsive for ${FAILS} checks — RESTARTING" >> "$LOG"

  send_alert "⚠️ *9Router Watchdog*: Process was hung (${FAILS} failed health checks). Restarting automatically... Agents will recover within 60s."

  # Check if db.json was wiped before killing (wipe = size <1KB)
  DB="$HOME/.9router/db.json"
  BACKUP="$HOME/.9router/db.json.auto-backup"
  DB_SIZE=$(wc -c < "$DB" 2>/dev/null || echo "0")
  if [ "$DB_SIZE" -lt "1000" ] && [ -f "$BACKUP" ]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] db.json wiped (${DB_SIZE}B) — restoring from backup" >> "$LOG"
    cp "$BACKUP" "$DB"
    send_alert "🔧 *9Router db.json was wiped* — auto-restored from backup. All provider connections recovered."
  fi

  pkill -f "9router/cli.js" 2>/dev/null || true

  # Reset counter after restart attempt
  echo "0" > "$FAIL_FILE"

  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Kill signal sent. LaunchD will restart 9Router." >> "$LOG"
fi
