#!/usr/bin/env bash
# start-cloudflared.sh — Wrapper for cloudflared that clears the log on each start
# so sync-github-webhook.sh always reads the current session's URL, not a stale one.
# Called by launchd plist ai.openclaw.cloudflared

LOG="$HOME/.openclaw/logs/cloudflared.log"

# Truncate log so URL extraction is always from this session
> "$LOG"

exec /opt/homebrew/bin/cloudflared tunnel \
  --url http://localhost:5678 \
  --no-autoupdate \
  2>&1
