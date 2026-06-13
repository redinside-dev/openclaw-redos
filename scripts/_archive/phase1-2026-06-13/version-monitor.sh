#!/bin/sh
# version-monitor.sh — upgrade openclaw if config version > npm version
# Idempotency + 30-min cooldown (2026-06-12: was bootout/load-cycling the gateway 7+ times in 20 min)
set -eu
OPENCLAW="/opt/homebrew/bin/openclaw"
NPM="/opt/homebrew/opt/node/bin/npm"
LOCK="/tmp/openclaw-upgrade.lock"
COOLDOWN_S=1800
LOG="$HOME/.openclaw/logs/version-monitor.log"
TS() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "[$(TS)] $*" | tee -a "$LOG"; }

while true; do
  sleep 300
  # Cooldown guard — skip if we upgraded in the last 30 min
  if [ -f "$LOCK" ]; then
    LOCK_AGE=$(( $(date +%s) - $(stat -f %m "$LOCK") ))
    if [ "$LOCK_AGE" -lt "$COOLDOWN_S" ]; then
      log "[version-monitor] Cooldown active (${LOCK_AGE}s < ${COOLDOWN_S}s); skipping."
      continue
    fi
    rm -f "$LOCK"
  fi

  CONFIG_VER=$("${OPENCLAW}" config get version 2>/dev/null | tr -d "[:space:]" || echo "0")
  NPM_VER=$("${NPM}" view /opt/homebrew/bin/openclaw version 2>/dev/null | tr -d "[:space:]" || echo "0")
  [ -z "${CONFIG_VER}" ] && CONFIG_VER="0"
  [ -z "${NPM_VER}" ] && NPM_VER="0"
  log "[version-monitor] config=${CONFIG_VER} npm=${NPM_VER}"
  CONFIG_NUM=$(echo "${CONFIG_VER}" | awk -F. '{print $1*100000 + $2*1000 + $3}')
  NPM_NUM=$(echo "${NPM_VER}" | awk -F. '{print $1*100000 + $2*1000 + $3}')
  if [ "${CONFIG_NUM}" -gt "${NPM_NUM}" ] 2>/dev/null; then
    log "[version-monitor] Upgrading /opt/homebrew/bin/openclaw ${NPM_VER} -> ${CONFIG_VER}..."
    PRE_BIN_VER=$("${OPENCLAW}" --version 2>/dev/null | tr -d "[:space:]" || echo "0")
    "${NPM}" install -g /opt/homebrew/bin/openclaw 2>&1 | tail -3 | while read line; do log "$line"; done
    POST_BIN_VER=$("${OPENCLAW}" --version 2>/dev/null | tr -d "[:space:]" || echo "0")
    if [ "${POST_BIN_VER}" = "${PRE_BIN_VER}" ] || [ -z "${POST_BIN_VER}" ]; then
      log "[version-monitor] Binary unchanged (${PRE_BIN_VER}); skipping bootout/load."
      continue
    fi
    log "[version-monitor] Binary ${PRE_BIN_VER} -> ${POST_BIN_VER}; cycling gateway. Setting 30-min cooldown."
    date -u +%Y-%m-%dT%H:%M:%SZ > "$LOCK"
    launchctl bootout gui/501/ai.openclaw.gateway 2>/dev/null || true
    sleep 3
    launchctl load ~/Library/LaunchAgents/ai.openclaw.gateway.plist 2>/dev/null || true
    sleep 10
    for svc in gateway-watchdog config-drift-watchdog; do
      launchctl bootout gui/501/ai.openclaw.${svc}.plist 2>/dev/null || true
      sleep 1
      launchctl load ~/Library/LaunchAgents/ai.openclaw.${svc}.plist 2>/dev/null || true
    done
  fi
done