#!/usr/bin/env bash
# setup-eng-tools.sh — One-time setup: 9Router + CCS + DevContext
#
# Run ONCE to configure the Tier 5 coding backend stack.
# After this runs, everything is automatic:
#   - 9Router starts on login via launchd
#   - provider-quota.json refreshed every 30min by cron (OPS agent)
#   - Smart Router reads quota and selects backend automatically
#
# Usage: bash scripts/setup-eng-tools.sh

set -euo pipefail

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

log()  { echo -e "${GREEN}[setup]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
fail() { echo -e "${RED}[fail]${NC} $*" >&2; }

# ---- 1. Check prerequisites ----
log "Checking prerequisites..."
command -v node &>/dev/null || { fail "Node.js not found. Install: brew install node"; exit 1; }
log "Node.js: $(node --version)"

command -v claude &>/dev/null && log "Claude Code: $(claude --version 2>/dev/null || echo 'installed')" \
  || warn "Claude Code CLI not found. Install: npm install -g @anthropic-ai/claude-code"

# ---- 2. Install CCS ----
log "Installing CCS (Claude Code Subscription proxy)..."
if ! command -v ccs &>/dev/null; then
  npm install -g ccs || warn "npm install failed for ccs — try manually: npm install -g ccs"
else
  log "CCS already installed: $(ccs --version 2>/dev/null || echo 'ok')"
fi

# ---- 3. Install 9Router ----
log "Installing 9Router..."
if ! command -v 9router &>/dev/null; then
  npm install -g 9router || warn "9router install failed — try manually: npm install -g 9router"
else
  log "9Router already installed: $(9router --version 2>/dev/null || echo 'ok')"
fi

# ---- 4. Install DevContext MCP ----
log "Installing DevContext..."
command -v devctx &>/dev/null && log "DevContext already installed" \
  || npm install -g @devctx/cli || warn "DevContext install failed — skip if not needed"

# ---- 5. Register DevContext MCP in Claude Code ----
log "Registering DevContext MCP server..."
MCP_SETTINGS="$HOME/.claude/mcp_settings.json"
if [[ -f "$MCP_SETTINGS" ]]; then
  python3 - <<'PYEOF'
import json, os
path = os.path.expanduser("~/.claude/mcp_settings.json")
with open(path) as f:
    s = json.load(f)
s.setdefault("mcpServers", {})["devctx"] = {
    "command": "devctx",
    "args": ["mcp"],
    "description": "DevContext — saves/restores coding session context across backend switches"
}
with open(path, "w") as f:
    json.dump(s, f, indent=2)
print("DevContext MCP registered.")
PYEOF
else
  warn "~/.claude/mcp_settings.json not found — run 'claude' once to initialize, then re-run this script"
fi

# ---- 6. Install 9Router launchd plist (auto-start on login) ----
log "Installing 9Router launchd service (ai.openclaw.9router)..."
PLIST_PATH="$HOME/Library/LaunchAgents/ai.openclaw.9router.plist"
NINE_ROUTER_BIN="$(command -v 9router 2>/dev/null || echo '/opt/homebrew/bin/9router')"

cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.openclaw.9router</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NINE_ROUTER_BIN}</string>
        <string>start</string>
        <string>--port</string>
        <string>20128</string>
        <string>--foreground</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${OPENCLAW_HOME}/logs/9router.log</string>
    <key>StandardErrorPath</key>
    <string>${OPENCLAW_HOME}/logs/9router.err.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>HOME</key>
        <string>${HOME}</string>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
PLIST

launchctl load "$PLIST_PATH" 2>/dev/null && log "9Router launchd service installed and started" \
  || warn "launchctl load failed — 9Router plist written but not loaded; run: launchctl load $PLIST_PATH"

# ---- 7. Create initial provider-quota.json ----
log "Creating initial provider-quota.json..."
QUOTA_DIR="$OPENCLAW_HOME/workspace/tmp"
mkdir -p "$QUOTA_DIR"
if [[ ! -f "$QUOTA_DIR/provider-quota.json" ]]; then
  cat > "$QUOTA_DIR/provider-quota.json" <<'JSON'
{
  "updated": "1970-01-01T00:00:00Z",
  "_note": "Stale placeholder — refreshed every 30min by 9router-quota-sync cron",
  "9router_running": false,
  "claude-code": { "available": true, "remaining": "unknown" },
  "cursor":      { "available": true, "remaining": "unknown" },
  "gemini":      { "available": true, "remaining": "unknown" },
  "codex":       { "available": true, "remaining": "unknown" },
  "iflow":       { "available": true, "remaining": "unlimited" },
  "qwen":        { "available": true, "remaining": "unknown" }
}
JSON
  log "Created $QUOTA_DIR/provider-quota.json"
fi

# ---- 8. Make scripts executable ----
chmod +x "$OPENCLAW_HOME/scripts/ccs-smart.sh"
log "Made ccs-smart.sh executable"

# ---- Done ----
echo ""
log "One-time setup complete. All automation is now running:"
echo "  - 9Router: auto-starts on login via launchd (ai.openclaw.9router)"
echo "  - provider-quota.json: refreshed every 30min by 9router-quota-sync cron"
echo "  - Smart Router: reads quota automatically; selects backend without intervention"
echo "  - DevContext MCP: context auto-saved/restored on backend switches"
echo ""
log "One-time authentication (do once per provider):"
echo "  9router auth add gemini    # Google OAuth — free ~1000/day"
echo "  9router auth add codex     # ChatGPT Plus subscription"
echo "  ccs auth create cursor     # Cursor Pro subscription backend"
echo ""
