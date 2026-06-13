#!/bin/bash
# never-idle-rotator.sh — wake idle agents AND restart dead queue-workers
# LaunchD: ai.openclaw.never-idle-rotator (StartInterval=300)
# Every 5 min:
#   1) For each agent, check heartbeat age.
#      If >threshold: enqueue a wakeup via `job-queue.py submit` (the real queue).
#      AND kickstart the queue-worker.<agent> plist if it's not running.
#   2) Detect zombies: jobs in `processing` for >15 min and re-queue them.
set -uo pipefail

LOCK="/tmp/openclaw-never-idle.lock"
LOG="$HOME/.openclaw/logs/never-idle-rotator.log"
HEARTBEAT="/tmp/openclaw-never-idle-rotator.heartbeat"
JOB_QUEUE_PY="$HOME/.openclaw/workspace/scripts/job-queue.py"
TS() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "[$(TS)] [never-idle] $*" >> "$LOG"; }

mkdir -p "$HOME/.openclaw/logs"
exec 9>"$LOCK"
flock -n 9 || { log "another rotator still running; skip"; exit 0; }

date +%s > "$HEARTBEAT"
log "--- tick ---"

[[ -f "$JOB_QUEUE_PY" ]] || { log "FATAL: $JOB_QUEUE_PY missing"; exit 1; }

# Each row: agent-name|heartbeat-file|threshold-seconds|default-task
AGENTS=(
  "main|/tmp/openclaw-agent-main.heartbeat|900|Read workspace/STATE.yaml and workspace/ops/TICKET-TRACKER.md. Pick the highest-priority open ticket, claim it, and start work. Post a one-line update to workspace/ops/STANDUP-LOG.md."
  "ops|/tmp/openclaw-agent-ops.heartbeat|900|Run l0-health-check (workspace/scripts/l0-health-check.sh). Append a 3-bullet summary to workspace/ops/LEARNINGS.md. If any component is RED, open a P0 ticket via workspace/scripts/queue-task-generator.py."
  "eng|/tmp/openclaw-agent-eng.heartbeat|900|Scan workspace/projects/backlog.md for the next ENG-scoped item. If none, run workspace/scripts/queue-task-generator.py to surface one. Claim and start."
  "research|/tmp/openclaw-agent-research.heartbeat|1800|Summarize the most recent 24h of workspace/ops/LEARNINGS.md (last 200 lines). Post a 5-bullet digest to workspace/research/daily-digest.md if missing."
  "finance|/tmp/openclaw-agent-finance.heartbeat|900|Run workspace-finance/scripts/l0-finance-check.sh. Summarize health in workspace-finance/memory/working-finance.json under 'last_self_check'."
  "infosec|/tmp/openclaw-agent-infosec.heartbeat|900|Grep workspace/ops/LEARNINGS.md and logs/ for security-relevant events in the last 24h. Append a one-paragraph threat-posture note to ops/agent-status/infosec.json."
  "hatake|/tmp/openclaw-agent-hatake.heartbeat|900|Review openclaw queue (workspace/tasks/queue.json pending[]). If empty for >30 min, run workspace/scripts/queue-task-generator.py and seed at least one item."
  "allrounder|/tmp/openclaw-agent-allrounder.heartbeat|900|Read workspace/ops/COORDINATION_INBOX.md. Pick the highest-priority unowned item, claim it, and post progress."
)

PLIST_LABEL="ai.openclaw.queue-worker"
launchd_running() {
  local label="$1"
  launchctl list 2>/dev/null | awk -v want="$label" '$3 ~ want { if ($1 != "-" && $1+0 > 0) print "1"; else print "0" }' | head -1
}

kickstart_worker() {
  local agent="$1"
  local label="${PLIST_LABEL}.${agent}"
  local state
  state=$(launchd_running "$label")
  if [[ "$state" != "1" ]]; then
    log "BOOTSTRAP worker $agent (was down) — launching $label"
    launchctl bootstrap gui/$(id -u) "$HOME/Library/LaunchAgents/${label}.plist" 2>/dev/null || \
    launchctl kickstart -k "gui/$(id -u)/${label}" 2>/dev/null || \
    log "WARN: failed to bootstrap $label"
  fi
}

# Reap zombie jobs stuck in `processing` for >15 min across all agents.
# Re-queue (not just delete) so work isn't lost.
QUEUES_DIR="$(dirname "$JOB_QUEUE_PY")/n8n/queues"
[[ -d "$QUEUES_DIR" ]] || QUEUES_DIR="$HOME/.openclaw/workspace/scripts/n8n/queues"
python3 - "$QUEUES_DIR" <<'PY' 2>>"$LOG" || log "WARN: zombie reaper failed"
import json, time, sys
from pathlib import Path
from datetime import datetime

QUEUES = Path(sys.argv[1])
CUTOFF_S = 900  # 15 min
now = time.time()
total_zombies = 0
for qf in QUEUES.glob("*.json"):
    try:
        d = json.loads(qf.read_text())
    except Exception as e:
        print(f"[zombie-reap] skip {qf.name}: {e}")
        continue
    changed = False
    reaped = 0
    for j in d:
        if j.get("status") != "processing":
            continue
        started = j.get("started_at")
        if not started: continue
        try:
            t = datetime.fromisoformat(started.replace("Z","+00:00")).timestamp()
        except Exception:
            continue
        if now - t > CUTOFF_S:
            j["status"] = "queued"
            j["started_at"] = None
            j["retry_count"] = j.get("retry_count", 0) + 1
            reaped += 1
            changed = True
    if changed:
        qf.write_text(json.dumps(d, indent=2, sort_keys=True))
        total_zombies += reaped
        print(f"[zombie-reap] requeued {reaped} in {qf.name}")
print(f"[zombie-reap] total requeued: {total_zombies}")
PY

now=$(date +%s)
QUEUED=0
RESTARTED=0

# Helper: is this agent already in queue (any queued OR processing)? If so, skip wakeup.
already_has_work() {
  local agent="$1"
  local qf="$QUEUES_DIR/${agent}.json"
  [[ ! -f "$qf" ]] && return 1  # No queue file = empty
  python3 - "$qf" <<'PY' 2>/dev/null
import json, sys
qf = sys.argv[1]
d = json.load(open(qf))
# Any pending work for this agent (queued or processing)?
if any(j.get("status") in ("queued","processing") for j in d):
    sys.exit(0)
sys.exit(1)
PY
}

for row in "${AGENTS[@]}"; do
  IFS='|' read -r name hb threshold default_task <<< "$row"
  kickstart_worker "$name" && RESTARTED=$((RESTARTED+1))
  age=99999
  [[ -f "$hb" ]] && age=$(( now - $(cat "$hb" 2>/dev/null || echo 0) ))
  if (( age > threshold )); then
    if already_has_work "$name"; then
      log "SKIP wakeup $name (already has queued/processing work)"
      continue
    fi
    log "WAKING $name (age=${age}s > ${threshold}s)"
    title="[auto-wakeup] $name idle for ${age}s — pick up work"
    body="$default_task

---
This is a system-generated wakeup from never-idle-rotator.
Heartbeat file: $hb (was last touched ${age}s ago).
After completing, update it with: date +%s > $hb"
    priority="high"   # wakeups are high so the worker grabs them first
    out=$(python3 "$JOB_QUEUE_PY" submit "$name" "$title

$body" "$priority" 2>&1)
    if [[ $? -eq 0 ]]; then
      log "  queued: $out"
      QUEUED=$((QUEUED+1))
    else
      log "  WARN submit failed: $out"
    fi
  fi
done

log "queued $QUEUED wake-ups; restarted $RESTARTED workers; $(date -u +%H:%M:%S) done"
