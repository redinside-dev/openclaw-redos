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

  # 9Router
  if curl -sf http://127.0.0.1:20128/health > /dev/null 2>&1; then
    ok "9Router        → http://127.0.0.1:20128 (running)"
  elif [[ -f "$HOME/Library/LaunchAgents/ai.openclaw.9router.plist" ]]; then
    warn "9Router        → plist installed but not responding"
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

# 3. OpenClaw gateway
info "Restarting OpenClaw gateway..."
if launchctl list ai.openclaw.gateway > /dev/null 2>&1; then
  launchctl unload "$HOME/Library/LaunchAgents/ai.openclaw.gateway.plist" 2>/dev/null || true
  sleep 1
fi
launchctl load "$HOME/Library/LaunchAgents/ai.openclaw.gateway.plist"
sleep 2
ok "OpenClaw gateway restarted"

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

# 6. Final status
sleep 3
check_status

echo "Done. If any service shows ✗ above, check logs:"
echo "  tail -f ~/.openclaw/logs/gateway.err.log"
echo "  tail -f ~/.openclaw/logs/9router.err.log"
