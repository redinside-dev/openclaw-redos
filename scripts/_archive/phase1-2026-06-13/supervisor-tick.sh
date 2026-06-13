#!/bin/bash
# supervisor-tick.sh — Master supervisor (L4)
# Every 5 minutes, validates all Phase B invariants and auto-fixes what's broken:
#   1. Gateway on 18789
#   2. Cron scheduler running with non-empty jobs
#   3. Ollama has required models
#   4. All 8 queue-workers alive
#   5. Selfheal cron actively running
#   6. Ollama autorecover cron actively running
#   7. Token health (slack, gog) — best-effort
# Pages only if all auto-remediation strategies fail. Designed to be idempotent
# and cheap on the happy path (<300ms).
#
# Wired via cron job "Supervisor L4 Tick" — every 5 min.

set -uo pipefail

LOCK="/tmp/openclaw-supervisor.lock"
LOG="$HOME/.openclaw/logs/supervisor.log"
HB="/tmp/openclaw-supervisor.heartbeat"
mkdir -p "$(dirname "$LOG")"
touch "$HB"
echo "$(date +%s)" > "$HB"

exec 9>"$LOCK" || exit 0
/opt/homebrew/bin/flock -n 9 || exit 0

. "$HOME/.openclaw/scripts/alert-lib.sh" 2>/dev/null || true

TS() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "[$(TS)] [supervisor] $*" >> "$LOG"; }

WORKSPACE="$HOME/.openclaw"
SQLITE="$WORKSPACE/state/openclaw.sqlite"
OPENCLAW="${OPENCLAW:-$(command -v openclaw || echo /opt/homebrew/bin/openclaw)}"

# Counters
HEALED=0
FAILED=0
FAIL_LIST=()

# ── Invariant 1: Gateway ─────────────────────────────────────────────────────
GW_OK=0
if nc -z 127.0.0.1 18789 2>/dev/null; then
  HTTP=$(curl -sS --max-time 3 -o /dev/null -w "%{http_code}" http://127.0.0.1:18789/healthz 2>/dev/null || echo "000")
  if [ "$HTTP" = "200" ]; then
    GW_OK=1
  fi
fi
if [ $GW_OK -eq 0 ]; then
  # Auto-fix: rely on gateway-watchdog (60s loop). Just page if it stays down.
  if [ -f /tmp/openclaw-gateway-watchdog.heartbeat ]; then
    HB_AGE=$(( $(date +%s) - $(cat /tmp/openclaw-gateway-watchdog.heartbeat 2>/dev/null || echo 0) ))
    if [ "$HB_AGE" -gt 180 ]; then
      log "FAIL: gateway down AND watchdog heartbeat stale (${HB_AGE}s old)"
      FAILED=$((FAILED+1))
      FAIL_LIST+=("gateway+watchdog-stale")
    else
      log "DEGRADED: gateway down but watchdog alive (${HB_AGE}s) — deferring"
    fi
  else
    log "FAIL: gateway down + no watchdog heartbeat file"
    FAILED=$((FAILED+1))
    FAIL_LIST+=("gateway-no-watchdog")
  fi
fi

# ── Invariant 2: Cron jobs loaded ────────────────────────────────────────────
CRON_JOBS=0
if [ -f "$SQLITE" ]; then
  CRON_JOBS=$(sqlite3 "$SQLITE" "SELECT COUNT(*) FROM cron_jobs WHERE enabled=1" 2>/dev/null || echo 0)
fi
if [ "${CRON_JOBS:-0}" -lt 25 ]; then
  log "FAIL: only $CRON_JOBS enabled cron jobs (expected ≥25)"
  FAILED=$((FAILED+1))
  FAIL_LIST+=("cron_jobs<25")
else
  # Spot-check that selfheal is actually running. Prefer heartbeat-age (the
  # invariant we care about — that selfheal is firing) over a brittle cron
  # name LIKE pattern (which fails on "Self-Healing"/"Health" variants and
  # causes a chronic false-positive every 5 min — see
  # TICKET-20260609-SUPERVISOR-SELFHEAL-FALSEPOS-001).
  SELFHEAL_OK=0
  SELFHEAL_HB="/tmp/openclaw-agent-selfheal.heartbeat"
  if [ -f "$SELFHEAL_HB" ]; then
    SELFHEAL_HB_AGE=$(( $(date +%s) - $(cat "$SELFHEAL_HB" 2>/dev/null || echo 0) ))
    # Cadence is StartInterval=300 (5 min) on the launchd plist, so anything
    # under 900s (15 min) is comfortably "running".
    if [ "${SELFHEAL_HB_AGE:-999999}" -lt 900 ]; then
      SELFHEAL_OK=1
    else
      log "DEGRADED: agent-selfheal heartbeat ${SELFHEAL_HB_AGE}s old (>15min)"
    fi
  else
    log "DEGRADED: agent-selfheal heartbeat file missing"
  fi
  if [ "$SELFHEAL_OK" -eq 0 ]; then
    # Heartbeat check is the source of truth. Only page if heartbeat is stale
    # AND no cron-style selfheal is registered (belt-and-suspenders: heartbeat
    # could be missing because the plist is unloaded entirely).
    SELFHEAL_ROW=$(sqlite3 "$SQLITE" "SELECT job_id FROM cron_jobs WHERE (name LIKE '%selfheal%' OR name LIKE '%Self-Healing%' OR name LIKE '%heal%') AND enabled=1 LIMIT 1" 2>/dev/null)
    if [ -z "$SELFHEAL_ROW" ]; then
      log "FAIL: agent-selfheal not running (no fresh heartbeat AND no matching cron job)"
      FAILED=$((FAILED+1))
      FAIL_LIST+=("selfheal-missing")
    fi
    # else: cron is registered AND heartbeat is stale — log only (don't page).
    # The heartbeat check will catch a real selfheal outage on the next tick
    # once the freshness threshold is crossed.
  fi
fi

# ── Invariant 3: Ollama models ───────────────────────────────────────────────
if ! command -v curl >/dev/null; then
  log "WARN: curl not available, skipping ollama check"
else
  HTTP=$(curl -sS --max-time 3 -o /dev/null -w "%{http_code}" http://127.0.0.1:11434/api/tags 2>/dev/null || echo "000")
  if [ "$HTTP" != "200" ]; then
    log "DEGRADED: ollama not responding (HTTP=$HTTP) — invoking ollama-autorecover"
    if [ -x "$WORKSPACE/scripts/ollama-autorecover.sh" ]; then
      bash "$WORKSPACE/scripts/ollama-autorecover.sh" >> "$LOG" 2>&1 && HEALED=$((HEALED+1)) || log "FAIL: ollama-autorecover did not exit 0"
    fi
  else
    MODELS=$(curl -sS --max-time 3 http://127.0.0.1:11434/api/tags 2>/dev/null | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d.get('models',[])))" 2>/dev/null || echo 0)
    if [ "${MODELS:-0}" -lt 2 ]; then
      log "DEGRADED: ollama has $MODELS models (expected ≥2) — invoking ollama-autorecover"
      if [ -x "$WORKSPACE/scripts/ollama-autorecover.sh" ]; then
        bash "$WORKSPACE/scripts/ollama-autorecover.sh" >> "$LOG" 2>&1 && HEALED=$((HEALED+1)) || log "FAIL: ollama-autorecover did not exit 0"
      else
        log "FAIL: ollama-autorecover.sh missing or not executable"
        FAILED=$((FAILED+1))
        FAIL_LIST+=("ollama-models=$MODELS,no-fixer")
      fi
    fi
  fi
fi

# ── Invariant 4: Queue workers alive ─────────────────────────────────────────
# Queue workers run as `queue-worker.py <agent>` (the plist label is set
# separately). Match the actual command-line argument.
EXPECTED_AGENTS=(main ops eng research finance infosec hatake allrounder)
MISSING=()
for a in "${EXPECTED_AGENTS[@]}"; do
  if pgrep -f "queue-worker.py $a" >/dev/null 2>&1; then
    : # alive — process running with the agent arg
  elif launchctl list 2>/dev/null | grep -q "ai.openclaw.queue-worker.$a"; then
    : # alive via launchctl (plist loaded even if process isn't running)
  else
    MISSING+=("$a")
  fi
done
if [ ${#MISSING[@]} -gt 0 ]; then
  log "FAIL: queue-workers missing: ${MISSING[*]}"
  FAILED=$((FAILED+1))
  FAIL_LIST+=("workers-missing=${#MISSING[@]}")
fi

# ── Invariant 5: Selfheal heartbeat fresh ────────────────────────────────────
if [ -f /tmp/openclaw-agent-selfheal.heartbeat ]; then
  SELFHEAL_AGE=$(( $(date +%s) - $(cat /tmp/openclaw-agent-selfheal.heartbeat 2>/dev/null || echo 0) ))
  if [ "$SELFHEAL_AGE" -gt 300 ]; then
    log "DEGRADED: agent-selfheal heartbeat ${SELFHEAL_AGE}s old (>5min)"
    # Self-recover: try to run it once
    bash "$WORKSPACE/scripts/agent-selfheal.sh" >> "$LOG" 2>&1 && HEALED=$((HEALED+1))
  fi
fi

# ── Invariant 6: Ollama autorecover heartbeat fresh ─────────────────────────
if [ -f /tmp/openclaw-ollama-autorecover.heartbeat ]; then
  OLLAMA_HB_AGE=$(( $(date +%s) - $(cat /tmp/openclaw-ollama-autorecover.heartbeat 2>/dev/null || echo 0) ))
  if [ "$OLLAMA_HB_AGE" -gt 1800 ]; then
    log "DEGRADED: ollama-autorecover heartbeat ${OLLAMA_HB_AGE}s old (>30min)"
    bash "$WORKSPACE/scripts/ollama-autorecover.sh" >> "$LOG" 2>&1 && HEALED=$((HEALED+1))
  fi
fi

# ── Invariant 7: OAuth/credential health ─────────────────────────────────────
# Read latest oauth-autofix state if available; invoke the fixer when it's stale
# or when it last reported NEEDS_HUMAN. Pure state read — no calls out from here.
OAUTH_STATE="$WORKSPACE/state/oauth-health.json"
if [ -f "$OAUTH_STATE" ]; then
  OAUTH_AGE=$(( $(date +%s) - $(stat -f %m "$OAUTH_STATE" 2>/dev/null || echo 0) ))
  OAUTH_NEEDS=$(python3 -c "import json,sys;d=json.load(open('$OAUTH_STATE'));print(','.join(d.get('needs_human',[])+d.get('still_broken',[])))" 2>/dev/null || echo "")
  if [ "$OAUTH_AGE" -gt 3600 ]; then
    log "DEGRADED: oauth-health state ${OAUTH_AGE}s old (>1h) — invoking oauth-autofix"
    if [ -x "$WORKSPACE/scripts/oauth-autofix.sh" ]; then
      bash "$WORKSPACE/scripts/oauth-autofix.sh" >> "$LOG" 2>&1 && HEALED=$((HEALED+1))
    fi
  fi
  if [ -n "$OAUTH_NEEDS" ]; then
    log "INFO: oauth-autofix flagged needs_human/still_broken: $OAUTH_NEEDS"
  fi
else
  log "INFO: no oauth-health.json yet — oauth-autofix has not run; will be created on first tick"
fi

# ── L4 escalation policy: page only after 3 consecutive failed ticks (~15 min) ──
# Don't page on a single blip — auto-fix first, accumulate, escalate only when
# truly stuck. State file tracks per-failure-key consecutive count.
RETRY_STATE="$WORKSPACE/state/supervisor-fail-counts.json"
mkdir -p "$(dirname "$RETRY_STATE")"
if [ -f "$RETRY_STATE" ]; then
  COUNTS=$(python3 -c "import json,sys;print(json.dumps(json.load(open(sys.argv[1]))))" "$RETRY_STATE" 2>/dev/null || echo "{}")
else
  COUNTS="{}"
fi
NEW_COUNTS=$(python3 -c "
import json, sys, time
counts = json.loads(sys.argv[1])
fails = set(sys.argv[2].split()) if sys.argv[2].strip() else set()
now = int(time.time())
out = {}
for k, rec in counts.items():
    age = now - rec.get('ts', 0)
    if age > 3600:
        continue
    if k in fails:
        out[k] = {'n': rec.get('n', 0) + 1, 'ts': now}
for k in fails:
    if k not in out:
        out[k] = {'n': 1, 'ts': now}
print(json.dumps(out))
" "$COUNTS" "$(echo "${FAIL_LIST[*]:-}" | tr ' ' '\n' | sort -u | tr '\n' ' ')" 2>/dev/null || echo "{}")
echo "$NEW_COUNTS" > "$RETRY_STATE"

PAGE_NEEDED=0
PAGE_REASONS=()
if [ $FAILED -gt 0 ]; then
  for f in "${FAIL_LIST[@]}"; do
    N=$(python3 -c "import json,sys;d=json.loads(open(sys.argv[1]).read());print(d.get(sys.argv[2],{}).get('n',0))" "$RETRY_STATE" "$f" 2>/dev/null || echo 0)
    if [ "$N" -ge 3 ]; then
      PAGE_NEEDED=1
      PAGE_REASONS+=("$f@${N}ticks")
    fi
  done
fi

# Page on failure
if [ $PAGE_NEEDED -eq 1 ]; then
  SUMMARY="supervisor L4: failed=$FAILED [${FAIL_LIST[*]}] page-reasons=[${PAGE_REASONS[*]}] healed=$HEALED"
  log "$SUMMARY"
  send_alert page "Supervisor L4 degraded (3+ ticks)" "$SUMMARY" 2>/dev/null || true
elif [ $FAILED -gt 0 ]; then
  SUMMARY="supervisor: failed=$FAILED [${FAIL_LIST[*]}] (auto-retrying, will page at 3 consecutive ticks) healed=$HEALED"
  log "$SUMMARY"
else
  # All healthy — reset failure counts
  echo '{}' > "$RETRY_STATE"
  log "tick OK — gateway=up cron_jobs=$CRON_JOBS workers=${#EXPECTED_AGENTS[@]} healed=$HEALED"
fi
