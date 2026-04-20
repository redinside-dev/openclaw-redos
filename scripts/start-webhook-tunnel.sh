#!/bin/bash
# start-webhook-tunnel.sh — Start Cloudflare Tunnel for n8n webhook exposure
# Usage: bash ~/.openclaw/scripts/start-webhook-tunnel.sh [--quick]
#
# --quick : Use free temporary trycloudflare.com URL (no account, no DNS)
# default : Use named tunnel with config.yml (requires setup, stable URL)

set -e

QUICK=false
if [[ "$1" == "--quick" ]]; then
  QUICK=true
fi

# Check if cloudflared is installed
if ! command -v cloudflared &>/dev/null; then
  echo "❌ cloudflared not found. Install with: brew install cloudflare/cloudflare/cloudflared"
  exit 1
fi

echo "🌐 Starting Cloudflare Tunnel for n8n webhooks..."
echo "   n8n endpoint: http://localhost:5678"
echo ""

if $QUICK; then
  echo "⚡ Quick mode: temporary trycloudflare.com URL"
  echo "   URL changes on restart — for testing only"
  echo ""
  cloudflared tunnel --url http://localhost:5678
else
  CONFIG="$HOME/.openclaw/infra/cloudflare-tunnel/config.yml"
  echo "🔒 Named tunnel mode — using $CONFIG"
  echo "   URL is stable across restarts"
  echo ""
  echo "📋 After tunnel starts, register these URLs:"
  echo "   GitHub Webhooks: https://<your-hostname>/webhook/github-events"
  echo "   Slack Events:    https://<your-hostname>/webhook/slack-inbound-router"
  echo ""
  cloudflared tunnel --config "$CONFIG" run
fi
