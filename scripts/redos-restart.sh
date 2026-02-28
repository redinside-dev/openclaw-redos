#!/usr/bin/env bash
# redos-restart.sh — Single command to restart the entire RedOS stack
#
# Use this after any config changes (openclaw.json edits, skill updates, etc.)
# On a fresh Mac Mini boot, nothing needs to run — launchd handles auto-start.
#
# Usage:
#   bash scripts/redos-restart.sh           # restart everything
#   bash scripts/redos-restart.sh --status  # show status without restarting
#
# Services managed:
#   - Ollama          (brew/launchd: homebrew.mxcl.ollama)
#   - OpenClaw node   (launchd: ai.openclaw.node)
#   - OpenClaw gateway (launchd: ai.openclaw.gateway)
#   - Dashboard       (launchd: ai.openclaw.dashboard)
#   - 9Router         (launchd: ai.openclaw.9router, if installed)

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; }
info() { echo -e "${BLUE}→${NC} $*"; }

STATUS_ONLY=false
[[ "${1:-}" == "--status" ]] && STATUS_ONLY=true

# ------- Status check -------

check_status() {
  echo ""
  echo "=== RedOS Stack Status ==="
  echo ""

  # Ollama
  if curl -sf http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    ok "Ollama         → http://127.0.0.1:11434 (running)"
  else
    fail "Ollama         → not responding"
  fi

  # OpenClaw gateway
  if curl -sf http://127.0.0.1:18789/health > /dev/null 2>&1 || \
     launchctl list ai.openclaw.node > /dev/null 2>&1; then
    ok "OpenClaw node  → http://127.0.0.1:18789 (running)"
  else
    fail "OpenClaw node  → not running"
  fi

  # Dashboard
  if curl -sf http://127.0.0.1:19000 > /dev/null 2>&1; then
    ok "Dashboard      → http://127.0.0.1:19000 (running)"
  else
    warn "Dashboard      → http://127.0.0.1:19000 (not responding — may still be starting)"
  fi

  # 9Router — uses /v1/models (Next.js app: /health returns 404)
  if curl -sf http://127.0.0.1:20128/v1/models > /dev/null 2>&1; then
    ok "9Router        → http://127.0.0.1:20128 (running)"
  elif launchctl list com.9router.autostart > /dev/null 2>&1; then
    warn "9Router        → launchd registered but API not responding on port 20128"
  elif [[ -f "$HOME/Library/LaunchAgents/com.9router.autostart.plist" ]]; then
    warn "9Router        → plist exists but not loaded (run: launchctl load ~/Library/LaunchAgents/com.9router.autostart.plist)"
  else
    warn "9Router        → not installed (run setup-eng-tools.sh to add)"
  fi

  echo ""
}

if [[ "$STATUS_ONLY" == "true" ]]; then
  check_status
  exit 0
fi

# ------- Restart sequence -------

echo ""
echo "=== Restarting RedOS Stack ==="
echo ""

# 1. Ollama — managed by brew, just ensure it's running
info "Checking Ollama..."
if ! curl -sf http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
  info "Ollama not responding — starting via brew services..."
  brew services start ollama 2>/dev/null || launchctl load "$HOME/Library/LaunchAgents/homebrew.mxcl.ollama.plist" 2>/dev/null || true
  sleep 3
fi
ok "Ollama ready"

# 2. OpenClaw node (main process)
info "Restarting OpenClaw node..."
if launchctl list ai.openclaw.node > /dev/null 2>&1; then
  launchctl unload "$HOME/Library/LaunchAgents/ai.openclaw.node.plist" 2>/dev/null || true
  sleep 1
fi
launchctl load "$HOME/Library/LaunchAgents/ai.openclaw.node.plist"
sleep 2
ok "OpenClaw node restarted"

# 3. OpenClaw gateway (only if plist exists — e.g. after "openclaw doctor --fix" cleanup)
GATEWAY_PLIST="$HOME/Library/LaunchAgents/ai.openclaw.gateway.plist"
info "Restarting OpenClaw gateway..."
if [[ -f "$GATEWAY_PLIST" ]]; then
  if launchctl list ai.openclaw.gateway > /dev/null 2>&1; then
    launchctl unload "$GATEWAY_PLIST" 2>/dev/null || true
    sleep 1
  fi
  launchctl load "$GATEWAY_PLIST"
  sleep 2
  ok "OpenClaw gateway restarted"
else
  warn "Gateway plist not found ($GATEWAY_PLIST). Run: openclaw gateway install"
  warn "If you start the gateway another way, ensure it is running on port 18789."
fi

# 4. Dashboard
info "Restarting dashboard..."
if launchctl list ai.openclaw.dashboard > /dev/null 2>&1; then
  launchctl unload "$HOME/Library/LaunchAgents/ai.openclaw.dashboard.plist" 2>/dev/null || true
  sleep 1
fi
launchctl load "$HOME/Library/LaunchAgents/ai.openclaw.dashboard.plist"
ok "Dashboard restarted"

# 5. 9Router (if plist exists)
NINE_ROUTER_PLIST="$HOME/Library/LaunchAgents/ai.openclaw.9router.plist"
if [[ -f "$NINE_ROUTER_PLIST" ]]; then
  info "Restarting 9Router..."
  launchctl unload "$NINE_ROUTER_PLIST" 2>/dev/null || true
  sleep 1
  launchctl load "$NINE_ROUTER_PLIST"
  ok "9Router restarted"
else
  warn "9Router plist not found — skipping (run setup-eng-tools.sh to install)"
fi

# 6. 9Router post-start: refresh auto-managed tokens FIRST, then watchdog
sleep 3
if [[ -f "$HOME/.9router/db.json" ]]; then
  # Refresh Kiro tokens before the watchdog runs so they aren't falsely disabled
  if [[ -f "$HOME/.openclaw/scripts/9router-token-refresh.js" ]]; then
    info "Refreshing 9Router OAuth tokens (Kiro + Cursor)..."
    node "$HOME/.openclaw/scripts/9router-token-refresh.js" --all > /dev/null 2>&1 || true
  fi

  info "Running 9Router watchdog (normalize names + check expiry)..."
  ALERT=$(bash "$HOME/.openclaw/scripts/9router-watchdog.sh" --fix 2>/dev/null || true)
  if [[ -n "$ALERT" ]]; then
    warn "9Router Auth Alert:"
    echo "$ALERT" | sed 's/^/   /'
    warn "Re-authenticate via: http://localhost:20128 → Providers"
  fi
fi

# 7. Final status
check_status

echo "Done. If any service shows ✗ above, check logs:"
echo "  tail -f ~/.openclaw/logs/gateway.err.log"
echo "  tail -f ~/.openclaw/logs/9router.err.log"
