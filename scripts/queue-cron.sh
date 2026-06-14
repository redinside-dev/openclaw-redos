#!/usr/bin/env bash
# queue-cron.sh — dispatcher: refuel per-agent queues.
#
# 2026-06-12 restored after being archived in 2026-06-08 cleanup.
# It is now a thin wrapper around agent-queue-refuel.sh, which is the
# actual canonical self-fueling dispatcher (cron: agent-queue-refuel,
# */10). Both names work; new code should call agent-queue-refuel.sh
# directly, but anything calling queue-cron.sh still gets the right
# behavior.

set -u
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REFUEL="$SCRIPT_DIR/../workspace/scripts/agent-queue-refuel.sh"

if [[ ! -x "$REFUEL" ]]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] queue-cron: refuel script missing at $REFUEL" >&2
  exit 1
fi

exec "$REFUEL" "$@"
