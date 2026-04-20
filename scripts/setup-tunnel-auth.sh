#!/usr/bin/env bash
# setup-tunnel-auth.sh — ONE-TIME setup for fully automated tunnel+webhook sync.
#
# This stores a GitHub PAT (from redinside-dev account) so every reboot can
# automatically update the GitHub webhook URL without any manual intervention.
#
# Usage: bash ~/.openclaw/scripts/setup-tunnel-auth.sh

set -euo pipefail
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }

REPO="redinside-dev/openclaw-redos"
WEBHOOK_ID_FILE="$HOME/.openclaw/workspace/config/github-webhook-id.txt"
PAT_FILE="$HOME/.openclaw/workspace/config/github-webhook-pat.txt"

echo ""
echo "=== OpenClaw Tunnel Auth Setup (one-time) ==="
echo ""
echo "This needs a GitHub Personal Access Token from the 'redinside-dev' account."
echo ""
echo "Steps to create the PAT (takes 2 minutes):"
echo "  1. Open: https://github.com/settings/tokens/new"
echo "     (make sure you're logged in as redinside-dev)"
echo "  2. Note: 'OpenClaw webhook sync'"
echo "  3. Expiration: No expiration"
echo "  4. Scopes: check 'admin:repo_hook'"
echo "  5. Click 'Generate token' → copy the token"
echo ""
echo -n "Paste the token here: "
read -rs GH_PAT
echo ""

if [ -z "$GH_PAT" ]; then
  echo -e "${RED}✗ No token entered. Exiting.${NC}"
  exit 1
fi

# Verify token works
echo "Verifying token..."
VERIFY=$(curl -s -H "Authorization: Bearer $GH_PAT" \
  "https://api.github.com/repos/$REPO/hooks" 2>/dev/null)

HOOK_COUNT=$(echo "$VERIFY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null || echo "0")

if [ "$HOOK_COUNT" = "0" ]; then
  warn "Could not verify token (no hooks found or token invalid)"
  echo "Check that the PAT has 'admin:repo_hook' scope and is from redinside-dev"
  echo -n "Save anyway? (y/n): "
  read -r CONFIRM
  [[ "$CONFIRM" != "y" ]] && exit 1
fi

# Save PAT (gitignored)
echo "$GH_PAT" > "$PAT_FILE"
chmod 600 "$PAT_FILE"
ok "PAT saved to $PAT_FILE"

# Find webhook ID
echo "Looking up webhook ID..."
WEBHOOK_ID=$(echo "$VERIFY" | python3 -c "
import json, sys
hooks = json.load(sys.stdin)
if isinstance(hooks, list):
    for h in hooks:
        if 'github-events' in h.get('config',{}).get('url',''):
            print(h['id'])
            break
" 2>/dev/null || echo "")

if [ -z "$WEBHOOK_ID" ]; then
  warn "Webhook not found automatically."
  echo -n "Enter webhook ID from github.com/$REPO/settings/hooks: "
  read -r WEBHOOK_ID
fi

echo "$WEBHOOK_ID" > "$WEBHOOK_ID_FILE"
ok "Webhook ID saved: $WEBHOOK_ID"

# Run immediate sync
echo ""
echo "Running immediate webhook sync..."
bash "$HOME/.openclaw/scripts/sync-github-webhook.sh"

echo ""
ok "Setup complete. Every reboot will now auto-update the GitHub webhook."
echo "Check any time: bash ~/.openclaw/scripts/tunnel-url.sh"
