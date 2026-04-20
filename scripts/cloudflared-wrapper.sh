#!/usr/bin/env bash
# cloudflared-wrapper.sh — Start Cloudflare Quick Tunnel to the dashboard.
# Waits for the dashboard (port 19000) to be ready before launching cloudflared.
# Managed by: com.cloudflare.tunnel.dashboard LaunchAgent (KeepAlive=true)

set -euo pipefail

LOG_DIR="$HOME/.openclaw/logs"
mkdir -p "$LOG_DIR"

DASHBOARD_URL="http://localhost:19000"
CLOUDFLARED="$(command -v cloudflared 2>/dev/null || echo /opt/homebrew/bin/cloudflared)"

# ── Wait for dashboard ──────────────────────────────────────────────────────
echo "$(date -u +%FT%TZ) [cloudflared-wrapper] Waiting for dashboard on port 19000..."
MAX_WAIT=120   # seconds
WAITED=0
while ! curl -sf --connect-timeout 2 --max-time 3 "$DASHBOARD_URL" > /dev/null 2>&1; do
  if [[ $WAITED -ge $MAX_WAIT ]]; then
    echo "$(date -u +%FT%TZ) [cloudflared-wrapper] Dashboard not ready after ${MAX_WAIT}s — starting tunnel anyway"
    break
  fi
  sleep 5
  WAITED=$((WAITED + 5))
done
echo "$(date -u +%FT%TZ) [cloudflared-wrapper] Dashboard ready after ${WAITED}s. Starting cloudflared..."

# ── Launch tunnel ───────────────────────────────────────────────────────────
exec "$CLOUDFLARED" tunnel --url "$DASHBOARD_URL"
