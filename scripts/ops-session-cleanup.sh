#!/bin/bash
# ops-session-cleanup.sh — enforces session retention policy
# Run hourly via launchd. Owned by OPS, NOT by redos-self-healer.
#
# Retention policy:
#   OPS agents (ops, eng, research, finance, infosec) → 1-day retention
#   All others → 3-day retention

set -euo pipefail

SESSIONS_DIR="$HOME/.openclaw/agents"
OPS_AGENTS="ops eng research finance infosec"
CUTOFF_GENERAL=3
CUTOFF_OPS=1

log() { echo "[OPS-CLEANUP] $(date +%H:%M:%S) $*" >&2; }

count_removed=0

for agent_dir in "$SESSIONS_DIR"/*/sessions; do
    [[ -d "$agent_dir" ]] || continue
    agent=$(basename "$(dirname "$agent_dir")")
    cutoff_days=$([ "${OPS_AGENTS}" == *"${agent}"* ] && echo "$CUTOFF_OPS" || echo "$CUTOFF_GENERAL")
    # macOS compat: use -v for relative date math
    cutoff_ts=$(date -v-${cutoff_days}d +%s 2>/dev/null)

    while IFS= read -r session; do
        mtime=$(stat -f %m "$session" 2>/dev/null || echo 0)
        if (( mtime < cutoff_ts )); then
            rm -rf "$session"
            count_removed=$((count_removed + 1))
            log "Removed stale session: $agent/$(basename "$session") (age > ${cutoff_days}d)"
        fi
    done < <(find "$agent_dir" -maxdepth 1 -type d -name "session-*" 2>/dev/null)

    # Flag large sessions for health monitor
    for session_dir in "$agent_dir"/session-*; do
        [[ -d "$session_dir" ]] || continue
        total_size=$(du -sk "$session_dir" 2>/dev/null | cut -f1)
        if (( total_size > 300 )); then
            log "WARN: large session ${agent}/$(basename "$session_dir") (${total_size}KB)"
        fi
    done
done

log "Done. Removed: $count_removed stale sessions."