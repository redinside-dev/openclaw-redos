#!/usr/bin/env bash
# sync-github-webhook.sh — Runs at boot after cloudflared starts.
# Waits for the tunnel URL to appear in logs, then updates the GitHub webhook
# and saves the current URL to workspace/config/tunnel-url.txt.
#
# Prerequisites (one-time setup):
#   bash ~/.openclaw/scripts/setup-tunnel-auth.sh
#
# Called by: launchd ai.openclaw.tunnel-sync (RunAtLoad, KeepAlive=false)

set -euo pipefail

LOG_FILE="$HOME/.openclaw/logs/tunnel-sync.log"
CLOUDFLARED_LOG="$HOME/.openclaw/logs/cloudflared.log"
WEBHOOK_ID_FILE="$HOME/.openclaw/workspace/config/github-webhook-id.txt"
TUNNEL_URL_FILE="$HOME/.openclaw/workspace/config/tunnel-url.txt"
REPO="redinside-dev/openclaw-redos"
TIMEOUT=120

ts() { date -u '+%Y-%m-%dT%H:%M:%SZ'; }
log() { echo "$(ts): $*" | tee -a "$LOG_FILE"; }

log "=== tunnel-sync starting ==="

# ── Wait for cloudflared to establish the tunnel URL ──────────────────────────
elapsed=0
URL=""
while [ $elapsed -lt $TIMEOUT ]; do
  URL=$(grep "trycloudflare.com" "$CLOUDFLARED_LOG" 2>/dev/null \
    | grep -o 'https://[^ |]*trycloudflare\.com' | tr -d ' |' | tail -1)
  if [ -n "$URL" ]; then
    break
  fi
  sleep 5
  elapsed=$((elapsed + 5))
done

if [ -z "$URL" ]; then
  log "ERROR: No tunnel URL after ${TIMEOUT}s. Cloudflared may not be running."
  exit 1
fi

log "Tunnel URL: $URL"
echo "$URL" > "$TUNNEL_URL_FILE"

# ── Update GitHub webhook ──────────────────────────────────────────────────────
if [ ! -f "$WEBHOOK_ID_FILE" ]; then
  log "ERROR: Webhook ID file not found at $WEBHOOK_ID_FILE"
  log "Run: bash ~/.openclaw/scripts/setup-tunnel-auth.sh"
  exit 1
fi

WEBHOOK_ID=$(cat "$WEBHOOK_ID_FILE" | tr -d '[:space:]')
WEBHOOK_URL="$URL/webhook/github-events"

PAT_FILE="$HOME/.openclaw/workspace/config/github-webhook-pat.txt"

if [ ! -f "$PAT_FILE" ]; then
  log "ERROR: GitHub PAT not found at $PAT_FILE"
  log "Run: bash ~/.openclaw/scripts/setup-tunnel-auth.sh"
  exit 1
fi

GH_PAT=$(cat "$PAT_FILE" | tr -d '[:space:]')

RESULT=$(curl -s -X PATCH \
  -H "Authorization: Bearer $GH_PAT" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/$REPO/hooks/$WEBHOOK_ID" \
  -d "{\"config\":{\"url\":\"$WEBHOOK_URL\",\"content_type\":\"json\"}}" 2>&1 || true)

if echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); exit(0 if 'id' in d else 1)" 2>/dev/null; then
  log "GitHub webhook updated → $WEBHOOK_URL"
else
  log "WARNING: Could not update GitHub webhook: $RESULT"
  log "Check PAT at: $PAT_FILE (needs admin:repo_hook or webhook write scope)"
fi

log "=== tunnel-sync complete ==="
