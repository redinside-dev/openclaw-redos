#!/bin/bash
# Get current Cloudflare tunnel URL
URL=$(grep "trycloudflare.com" ~/.openclaw/logs/cloudflared.log 2>/dev/null | grep -o 'https://[^ |]*trycloudflare\.com' | tr -d ' |' | tail -1)
if [ -z "$URL" ]; then
  echo "Tunnel not running or URL not found. Check: tail -f ~/.openclaw/logs/cloudflared.log"
  exit 1
fi
echo "$URL"
echo ""
echo "GitHub webhook: $URL/webhook/github-events"
echo "Slack webhook:  $URL/webhook/slack-inbound-router"
