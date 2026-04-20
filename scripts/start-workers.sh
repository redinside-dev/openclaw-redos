#!/usr/bin/env bash
# start-workers.sh — Load all 3 autonomous worker LaunchAgents
# Called by redos-restart.sh. Safe to run multiple times (idempotent).

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }

AGENTS=(eng ops research)
NODE_PATH=$(which node 2>/dev/null || echo "/usr/local/bin/node")

for agent in "${AGENTS[@]}"; do
  PLIST="$HOME/Library/LaunchAgents/ai.openclaw.worker.${agent}.plist"
  LABEL="ai.openclaw.worker.${agent}"

  if [[ ! -f "$PLIST" ]]; then
    warn "Worker plist not found: $PLIST — skipping"
    continue
  fi

  # Update node path in plist to match current system
  if [[ -n "$NODE_PATH" ]]; then
    sed -i '' "s|/usr/local/bin/node|${NODE_PATH}|g" "$PLIST" 2>/dev/null || true
  fi

  # Unload if already running (for restart)
  if launchctl list "$LABEL" > /dev/null 2>&1; then
    launchctl unload "$PLIST" 2>/dev/null || true
    sleep 1
  fi

  launchctl load "$PLIST"
  ok "Worker ${agent} loaded (${LABEL})"
done

echo ""
echo "Worker status:"
for agent in "${AGENTS[@]}"; do
  LABEL="ai.openclaw.worker.${agent}"
  if launchctl list "$LABEL" > /dev/null 2>&1; then
    ok "  ${LABEL} running"
  else
    warn "  ${LABEL} not running — check plist"
  fi
done
