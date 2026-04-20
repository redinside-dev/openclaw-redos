#!/bin/bash
# ============================================================
# OpenClaw Upgrade Script
# Safely upgrades both Official CLI and RedOS without breaking anything
# Usage: bash upgrade.sh [cli|redos|all|check]
# ============================================================

set -e
export PATH="/opt/homebrew/bin:$PATH"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REDOS_DIR="$HOME/.openclaw"
BACKUP_DIR="$HOME/openclaw-backups"

echo ""
echo "🦞 OpenClaw Upgrade Manager"
echo "==========================="
echo ""

# ---- CHECK MODE ----
check_versions() {
  echo -e "${BLUE}=== Current Versions ===${NC}"
  
  # CLI version
  CLI_VERSION=$(openclaw --version 2>/dev/null || echo "not installed")
  echo -e "Official CLI:  ${GREEN}${CLI_VERSION}${NC}"
  
  # RedOS version
  REDOS_VERSION=$(node -e "console.log(require('$REDOS_DIR/package.json').version)" 2>/dev/null || echo "not found")
  echo -e "RedOS:         ${GREEN}${REDOS_VERSION}${NC}"
  
  echo ""
  echo -e "${BLUE}=== Available Updates ===${NC}"
  
  # Check CLI updates
  CLI_LATEST=$(npm view openclaw version 2>/dev/null || echo "unknown")
  if [ "$CLI_VERSION" = "$CLI_LATEST" ]; then
    echo -e "Official CLI:  ${GREEN}✅ Up to date (${CLI_LATEST})${NC}"
  else
    echo -e "Official CLI:  ${YELLOW}⬆️  Update available: ${CLI_VERSION} → ${CLI_LATEST}${NC}"
  fi
  
  # Check RedOS git updates
  cd "$REDOS_DIR"
  git fetch origin main --quiet 2>/dev/null
  LOCAL=$(git rev-parse HEAD 2>/dev/null)
  REMOTE=$(git rev-parse origin/main 2>/dev/null)
  if [ "$LOCAL" = "$REMOTE" ]; then
    echo -e "RedOS:         ${GREEN}✅ Up to date${NC}"
  else
    BEHIND=$(git rev-list HEAD..origin/main --count 2>/dev/null)
    echo -e "RedOS:         ${YELLOW}⬆️  ${BEHIND} commits behind origin/main${NC}"
  fi
  
  echo ""
  echo -e "${BLUE}=== System Health ===${NC}"
  
  # Gateway check
  if curl -s http://localhost:19000/health > /dev/null 2>&1; then
    echo -e "Gateway:       ${GREEN}✅ Running on port 19000${NC}"
  else
    echo -e "Gateway:       ${RED}❌ Not running${NC}"
  fi
  
  # Telegram check
  if pgrep -f "telegram-bridge" > /dev/null 2>&1; then
    echo -e "Telegram:      ${GREEN}✅ Bridge running${NC}"
  else
    echo -e "Telegram:      ${RED}❌ Bridge not running${NC}"
  fi
  
  echo ""
}

# ---- BACKUP ----
backup_redos() {
  echo -e "${BLUE}📦 Creating backup...${NC}"
  mkdir -p "$BACKUP_DIR"
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  tar --exclude='.openclaw/node_modules' \
      --exclude='.openclaw/browser' \
      --exclude='.openclaw/media' \
      --exclude='.openclaw/sandboxes' \
      -czf "$BACKUP_DIR/redos-${TIMESTAMP}.tar.gz" \
      -C "$HOME" .openclaw
  echo -e "${GREEN}✅ Backup saved: $BACKUP_DIR/redos-${TIMESTAMP}.tar.gz${NC}"
  
  # Keep only last 5 backups
  ls -t "$BACKUP_DIR"/redos-*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null
}

# ---- UPGRADE CLI ----
upgrade_cli() {
  echo -e "${BLUE}=== Upgrading Official OpenClaw CLI ===${NC}"
  
  CLI_CURRENT=$(openclaw --version 2>/dev/null || echo "not installed")
  CLI_LATEST=$(npm view openclaw version 2>/dev/null || echo "unknown")
  
  if [ "$CLI_CURRENT" = "$CLI_LATEST" ]; then
    echo -e "${GREEN}✅ Already on latest version: ${CLI_CURRENT}${NC}"
    return
  fi
  
  echo -e "Upgrading: ${CLI_CURRENT} → ${CLI_LATEST}"
  echo ""
  echo -e "${YELLOW}⚠️  This ONLY updates /opt/homebrew/lib/node_modules/openclaw/${NC}"
  echo -e "${YELLOW}    Your RedOS at ~/.openclaw/ is NOT touched${NC}"
  echo ""
  
  npm update -g openclaw
  
  CLI_NEW=$(openclaw --version 2>/dev/null)
  echo ""
  echo -e "${GREEN}✅ CLI upgraded to: ${CLI_NEW}${NC}"
  
  # Verify RedOS still works
  echo -e "${BLUE}Verifying RedOS still works...${NC}"
  if curl -s http://localhost:19000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ RedOS gateway still healthy${NC}"
  else
    echo -e "${YELLOW}⚠️  Gateway not running (was it running before?)${NC}"
  fi
}

# ---- UPGRADE REDOS ----
upgrade_redos() {
  echo -e "${BLUE}=== Upgrading RedOS ===${NC}"
  cd "$REDOS_DIR"
  
  # Check for uncommitted changes
  if ! git diff --quiet 2>/dev/null; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes:${NC}"
    git diff --stat
    echo ""
    read -p "Stash changes and continue? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      git stash
      echo -e "${GREEN}Changes stashed${NC}"
    else
      echo -e "${RED}Upgrade cancelled${NC}"
      return 1
    fi
  fi
  
  # Backup first
  backup_redos
  
  # Check if there are remote updates
  git fetch origin main --quiet
  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse origin/main)
  
  if [ "$LOCAL" = "$REMOTE" ]; then
    echo -e "${GREEN}✅ Already up to date${NC}"
    return
  fi
  
  BEHIND=$(git rev-list HEAD..origin/main --count)
  echo -e "Pulling ${BEHIND} new commits..."
  
  # Stop services before updating code
  echo -e "${BLUE}Stopping services...${NC}"
  pkill -f "gateway/server.js" 2>/dev/null || true
  pkill -f "telegram-bridge.js" 2>/dev/null || true
  sleep 2
  
  # Pull updates
  git pull origin main
  
  # Install any new dependencies
  npm install --production 2>/dev/null
  
  # Restart services
  echo -e "${BLUE}Restarting services...${NC}"
  npm start > /tmp/openclaw-gateway.log 2>&1 &
  sleep 3
  npm run telegram > /tmp/telegram-bridge.log 2>&1 &
  sleep 2
  
  # Verify
  if curl -s http://localhost:19000/health > /dev/null 2>&1; then
    VERSION=$(curl -s http://localhost:19000/api/status | python3 -c "import sys,json; print(json.load(sys.stdin)['version'])" 2>/dev/null)
    echo -e "${GREEN}✅ RedOS upgraded and running (v${VERSION})${NC}"
  else
    echo -e "${RED}❌ Gateway failed to start after upgrade!${NC}"
    echo -e "${YELLOW}Rolling back...${NC}"
    git reset --hard HEAD~${BEHIND}
    npm start > /tmp/openclaw-gateway.log 2>&1 &
    sleep 3
    npm run telegram > /tmp/telegram-bridge.log 2>&1 &
    echo -e "${GREEN}✅ Rolled back to previous version${NC}"
    return 1
  fi
  
  # Restore stashed changes if any
  if git stash list | grep -q "stash@{0}"; then
    echo -e "${BLUE}Restoring stashed changes...${NC}"
    git stash pop || echo -e "${YELLOW}⚠️  Stash pop had conflicts, resolve manually${NC}"
  fi
}

# ---- MAIN ----
case "${1:-check}" in
  check)
    check_versions
    ;;
  cli)
    upgrade_cli
    ;;
  redos)
    upgrade_redos
    ;;
  all)
    check_versions
    echo "---"
    backup_redos
    echo "---"
    upgrade_cli
    echo "---"
    upgrade_redos
    echo ""
    echo -e "${GREEN}🦞 All upgrades complete!${NC}"
    ;;
  *)
    echo "Usage: bash upgrade.sh [check|cli|redos|all]"
    echo ""
    echo "  check  - Show current versions and available updates (default)"
    echo "  cli    - Upgrade official OpenClaw CLI only"
    echo "  redos  - Upgrade RedOS code (git pull + restart)"
    echo "  all    - Upgrade everything safely"
    ;;
esac

echo ""
