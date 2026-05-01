#!/bin/bash
# ops-health-check.sh — periodic OPS health check, injects findings into AUTONOMOUS.md
# Scheduled hourly via launchd. Owned by OPS.
# Findings → RAG-indexed incident log + optional AUTONOMOUS.md task injection.

set -euo pipefail

OPS_WS="$HOME/.openclaw/workspace/ops"
AUTONOMOUS="$OPS_WS/AUTONOMOUS.md"
LOGDIR="$HOME/.openclaw/logs"
ALERT_LOG="$LOGDIR/ops-alerts.logl"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$LOGDIR"
# Rotate alert log — only keep this run's findings
> "$ALERT_LOG"
alert() {
    local msg="$1"
    local severity="${2:-medium}"
    local ts; ts=$(date +%Y-%m-%dT%H:%M:%S%z)
    echo "[OPS-HC $severity] $ts $msg" >&2
    echo "{\"ts\":\"$ts\",\"severity\":\"$severity\",\"msg\":\"$msg\",\"agent\":\"ops\"}" >> "$ALERT_LOG"
}

# ── 1. Gateway health ──────────────────────────────────────────────────────────
gateway_ok=false
GATEWAY_TOKEN=$(python3 -c "import json; print(json.load(open('$HOME/.openclaw/openclaw.json'))['gateway']['auth']['token'])" 2>/dev/null || echo "")
if curl -sf --max-time 5 http://localhost:18789/health -H "Authorization: Bearer ${GATEWAY_TOKEN}" > /dev/null 2>&1; then
    gateway_ok=true
fi
if ! pgrep -f "openclaw-gateway" > /dev/null 2>&1; then
    gateway_ok=false
    alert "openclaw-gateway process not running" "critical"
fi

# ── 2. 9Router health ─────────────────────────────────────────────────────────
if ! pgrep -f "9router" > /dev/null 2>&1; then
    alert "9router process not running" "critical"
fi

# ── 3. Queue workers ─────────────────────────────────────────────────────────
for worker in ops eng main finance; do
    label="ai.openclaw.queue-worker.$worker"
    pid=$(launchctl list 2>/dev/null | grep "$label" | awk '{print $1}')
    if [[ "$pid" == "-" || -z "$pid" ]]; then
        alert "queue-worker.$worker is not running (label=$label)" "high"
    fi
done

# ── 4. Queue cron LaunchAgent ─────────────────────────────────────────────────
# PID="-" is normal for interval agents (not running between firings); empty means not loaded
if ! launchctl list 2>/dev/null | grep -q "ai\.openclaw\.queue-cron"; then
    alert "ai.openclaw.queue-cron launch agent is not loaded" "high"
fi

# ── 5. Session bloat ──────────────────────────────────────────────────────────
SESSIONS_DIR="$HOME/.openclaw/agents"
total_size_kb=0
bloat_count=0
for session_dir in "$SESSIONS_DIR"/*/sessions/session-*; do
    [[ -d "$session_dir" ]] || continue
    size=$(du -sk "$session_dir" 2>/dev/null | cut -f1 || echo 0)
    total_size_kb=$((total_size_kb + size))
    if (( size > 500 )); then
        agent=$(basename "$(dirname "$(dirname "$session_dir")")")
        bloat_count=$((bloat_count + 1))
        alert "bloated session: $agent/$(basename "$session_dir") (${size}KB)" "medium"
    fi
done

# ── 6. Disk space ─────────────────────────────────────────────────────────────
disk_pct=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
if (( disk_pct > 90 )); then
    alert "disk usage critical: ${disk_pct}% used" "critical"
elif (( disk_pct > 80 )); then
    alert "disk usage high: ${disk_pct}% used" "medium"
fi

# ── 7. Inject summary into AUTONOMOUS.md if critical/high alerts fired ─────────
if grep -q '"critical"\|"high"' "$ALERT_LOG" 2>/dev/null; then
    # Only inject if last entry is <1hr old (avoid spam)
    last_ts=$(tail -1 "$ALERT_LOG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['ts'])" 2>/dev/null || echo "")
    if [[ -n "$last_ts" ]]; then
        alert_count=$(wc -l < "$ALERT_LOG" 2>/dev/null || echo 0)
        echo "[OPS-HC] Summary: $alert_count alerts, gateway=$gateway_ok, sessions=${total_size_kb}KB total" >&2
    fi
fi

# Always log OK status
if ! grep -q '"critical"\|"high"' "$ALERT_LOG" 2>/dev/null; then
    echo "[OPS-HC] $(date +%H:%M:%S) All checks passed. Gateway OK=$gateway_ok, sessions=${total_size_kb}KB" >&2
fi