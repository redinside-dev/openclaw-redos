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
#   - OpenClaw node   (launchd: ai.openclaw.node)
#   - OpenClaw gateway (launchd: ai.openclaw.gateway)
#   - Dashboard       (launchd: ai.openclaw.dashboard)
#   - n8n             (launchd: ai.openclaw.n8n)
#   - 9Router         (launchd: com.9router.autostart)
#   - Cloudflared     (launchd: com.cloudflare.tunnel.dashboard)

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; }
info() { echo -e "${BLUE}→${NC} $*"; }

STATUS_ONLY=false
[[ "${1:-}" == "--status" ]] && STATUS_ONLY=true

# ------- Config validation guard -------
if [[ "$STATUS_ONLY" == "false" ]]; then
  VALIDATE_OUT=$(openclaw config validate 2>&1)
  if echo "$VALIDATE_OUT" | grep -q "Config valid"; then
    ok "Config valid"
  else
    fail "Config validation FAILED — aborting restart to prevent crash loop"
    echo "$VALIDATE_OUT"
    echo ""
    echo "Fix with: openclaw doctor"
    echo "Then re-run: bash scripts/redos-restart.sh"
    exit 1
  fi
fi

# ------- Status check -------

check_status() {
  echo ""
  echo "=== RedOS Stack Status ==="
  echo ""

  # OpenClaw
  _gw_tok=$(python3 -c "import json; print(json.load(open('$HOME/.openclaw/openclaw.json'))['gateway']['auth']['token'])" 2>/dev/null || echo "")
  if curl -sf --max-time 15 -H "Authorization: Bearer ${_gw_tok}" http://127.0.0.1:18789/health > /dev/null 2>&1 || \
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

  # n8n
  if curl -sf http://127.0.0.1:5678 > /dev/null 2>&1; then
    ok "n8n            → http://127.0.0.1:5678 (running)"
  elif launchctl list ai.openclaw.n8n > /dev/null 2>&1; then
    warn "n8n            → launchd registered but port 5678 not responding"
  else
    warn "n8n            → not running"
  fi

  # 9Router
  if curl -sf http://127.0.0.1:20128/v1/models > /dev/null 2>&1; then
    ok "9Router        → http://127.0.0.1:20128 (running)"
  elif launchctl list com.9router.autostart > /dev/null 2>&1; then
    warn "9Router        → launchd registered but API not responding on port 20128"
  elif [[ -f "$HOME/Library/LaunchAgents/com.9router.autostart.plist" ]]; then
    warn "9Router        → plist exists but not loaded"
  else
    warn "9Router        → not installed"
  fi

  # Cloudflared
  if launchctl list com.cloudflare.tunnel.dashboard > /dev/null 2>&1; then
    ok "Cloudflared    → tunnel active (check logs/cloudflared-tunnel.log for URL)"
  else
    warn "Cloudflared    → not running"
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

# 1. OpenClaw node (main process)
info "Restarting OpenClaw node..."
if launchctl list ai.openclaw.node > /dev/null 2>&1; then
  launchctl unload "$HOME/Library/LaunchAgents/ai.openclaw.node.plist" 2>/dev/null || true
  sleep 1
fi
launchctl load "$HOME/Library/LaunchAgents/ai.openclaw.node.plist"
sleep 2
ok "OpenClaw node restarted"

# 3. OpenClaw gateway
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
fi

# 4. Dashboard
info "Restarting dashboard..."
if launchctl list ai.openclaw.dashboard > /dev/null 2>&1; then
  launchctl unload "$HOME/Library/LaunchAgents/ai.openclaw.dashboard.plist" 2>/dev/null || true
  sleep 1
fi
launchctl load "$HOME/Library/LaunchAgents/ai.openclaw.dashboard.plist"
ok "Dashboard restarted"

# 5. n8n
N8N_PLIST="$HOME/Library/LaunchAgents/ai.openclaw.n8n.plist"
if [[ -f "$N8N_PLIST" ]]; then
  info "Restarting n8n..."
  if launchctl list ai.openclaw.n8n > /dev/null 2>&1; then
    launchctl unload "$N8N_PLIST" 2>/dev/null || true
    sleep 1
  fi
  launchctl load "$N8N_PLIST"
  ok "n8n restarted"
else
  warn "n8n plist not found — skipping"
fi

# 6. 9Router
NINE_ROUTER_PLIST="$HOME/Library/LaunchAgents/com.9router.autostart.plist"
if [[ -f "$NINE_ROUTER_PLIST" ]]; then
  info "Restarting 9Router..."
  if launchctl list com.9router.autostart > /dev/null 2>&1; then
    launchctl unload "$NINE_ROUTER_PLIST" 2>/dev/null || true
    sleep 1
  fi
  launchctl load "$NINE_ROUTER_PLIST"
  ok "9Router restarted"
else
  warn "9Router plist not found — skipping"
fi

# 7. Cloudflared tunnel
CLOUDFLARED_PLIST="$HOME/Library/LaunchAgents/com.cloudflare.tunnel.dashboard.plist"
if [[ -f "$CLOUDFLARED_PLIST" ]]; then
  info "Restarting Cloudflared tunnel..."
  if launchctl list com.cloudflare.tunnel.dashboard > /dev/null 2>&1; then
    launchctl unload "$CLOUDFLARED_PLIST" 2>/dev/null || true
    sleep 1
  fi
  launchctl load "$CLOUDFLARED_PLIST"
  ok "Cloudflared restarted"
else
  warn "Cloudflared plist not found — skipping"
fi

# 8. 9Router post-start: refresh tokens then watchdog
sleep 3
if [[ -f "$HOME/.9router/db.json" ]]; then
  if [[ -f "$HOME/.openclaw/scripts/9router-token-refresh.js" ]]; then
    info "Refreshing 9Router OAuth tokens (Kiro only — skipping --all to avoid refresh_token_reused race)..."
    node "$HOME/.openclaw/scripts/9router-token-refresh.js" > /dev/null 2>&1 || true
  fi

  info "Running 9Router watchdog (normalize names + check expiry)..."
  ALERT=$(bash "$HOME/.openclaw/scripts/9router-watchdog.sh" --fix 2>/dev/null || true)
  if [[ -n "$ALERT" ]]; then
    warn "9Router Auth Alert:"
    echo "$ALERT" | sed 's/^/   /'
    warn "Re-authenticate via: http://localhost:20128 → Providers"
  fi
fi

# 9. Autonomous workers
WORKERS_SCRIPT="$HOME/.openclaw/scripts/start-workers.sh"
if [[ -f "$WORKERS_SCRIPT" ]]; then
  info "Starting autonomous workers..."
  bash "$WORKERS_SCRIPT" || warn "Some workers failed to start — check ~/Library/LaunchAgents/ai.openclaw.worker.*.plist"
else
  warn "start-workers.sh not found — skipping workers"
fi

# 10. Final status
check_status

echo "Done. If any service shows ✗ above, check logs:"
echo "  tail -f ~/.openclaw/logs/gateway.err.log"
echo "  tail -f ~/.openclaw/logs/boot-sequence.log"
