#!/bin/bash
# ═══════════════════════════════════════════════════════════
# AgentOS — Gateway Wrapper
# Keeps the OpenClaw gateway alive and prevents Mac from sleeping.
# Used by the launchd plist for auto-restart on crash.
# ═══════════════════════════════════════════════════════════

OPENCLAW_DIR="$HOME/.openclaw"
LOG_DIR="$OPENCLAW_DIR/logs"
mkdir -p "$LOG_DIR"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') [gateway-wrapper] $1" | tee -a "$LOG_DIR/gateway.log"
}

log "Starting AgentOS gateway wrapper..."

# Prevent system sleep while gateway runs
caffeinate -s -w $$ &
CAFFEINATE_PID=$!
log "Caffeinate started (PID: $CAFFEINATE_PID) — Mac will not sleep"

# Cleanup on exit
trap "kill $CAFFEINATE_PID 2>/dev/null; log 'Gateway wrapper stopped.'" EXIT

# Retry loop with backoff
RETRY_COUNT=0
MAX_RETRIES=50
BACKOFF=10

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  log "Starting openclaw gateway (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)..."
  
  openclaw gateway 2>&1 | tee -a "$LOG_DIR/gateway.log"
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -eq 0 ]; then
    log "Gateway exited cleanly (code 0). Not restarting."
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  log "Gateway crashed (exit code: $EXIT_CODE). Restarting in ${BACKOFF}s... (retry $RETRY_COUNT/$MAX_RETRIES)"
  
  # Log crash to audit
  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"action\":\"gateway_crash\",\"exit_code\":$EXIT_CODE,\"retry\":$RETRY_COUNT}" \
    >> "$OPENCLAW_DIR/workspace/logs/audit.jsonl" 2>/dev/null
  
  sleep $BACKOFF
  
  # Increase backoff (cap at 120 seconds)
  BACKOFF=$((BACKOFF * 2))
  [ $BACKOFF -gt 120 ] && BACKOFF=120
  
  # Reset backoff after 10 successful minutes
  if [ $RETRY_COUNT -gt 5 ]; then
    BACKOFF=10
  fi
done

if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
  log "CRITICAL: Gateway failed $MAX_RETRIES times. Giving up. Manual intervention needed."
  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"action\":\"gateway_max_retries\",\"retries\":$MAX_RETRIES}" \
    >> "$OPENCLAW_DIR/workspace/logs/audit.jsonl" 2>/dev/null
fi
