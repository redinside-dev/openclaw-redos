#!/usr/bin/env bash
# agent-queue-refuel.sh
# Self-fueling: every 5 min, check each agent's queue. If empty AND worker is
# alive, enqueue one refuel task. Prevents the "worker alive but idle → false
# stale" failure mode discovered in evidence run #1.
#
# Logic per agent:
#   - read /tmp/openclaw-agent-<id>.heartbeat mtime → worker_alive if mtime < 600s
#   - read workspace/scripts/n8n/queues/<id>.json → empty if no "queued" jobs
#   - if worker_alive AND empty → enqueue a domain-appropriate refuel task
#   - if worker_dead → DO NOT enqueue (worker is gone; rotator will recreate)
#
# Refuel task phrasing is domain-aware so the worker has real work to chew on
# instead of a generic "ping" that gets skipped.

set -u
LOG=/tmp/openclaw-refuel.log
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WS="$(cd "$SCRIPT_DIR/.." && pwd)"
QUEUE_DIR="$WS/scripts/n8n/queues"
JQ_SUBMIT="$WS/scripts/job-queue.py"
AGENTS=(main ops eng research finance infosec hatake allrounder)
NOW=$(date -u +%H:%M:%S)

# Log a line
ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG" >/dev/null; }

# Domain task templates — agent gets a fresh prompt keyed to its role
task_for() {
  case "$1" in
    main)        echo "RED-CEO-$(date +%s) — pick the highest-priority open ticket in workspace/ops/TICKET-TRACKER.md and drive it to close. Add your verdict to STATE.yaml and TICKET-TRACKER.md." ;;
    ops)         echo "OPS-$(date +%s) — health sweep: run ls /tmp/openclaw-agent-*.heartbeat | wc -l and pgrep -f queue-worker | wc -l. If any worker is missing, log it but do NOT restart (rotator handles that). Write a one-line summary to workspace/ops/HEALTH-SUMMARY.md." ;;
    eng)         echo "ENG-$(date +%s) — pick one open task in workspace-main/inbox/tasks.md and ship it. If GitHub auth is healthy, push a real commit." ;;
    research)    echo "RESEARCH-$(date +%s) — read the latest commit on this repo (git log -1 --stat) and write a 3-line summary of what changed to workspace/research/notes.md." ;;
    finance)     echo "FIN-$(date +%s) — compute today's spend via workspace/costs/aggregate.py and append to workspace-finance/notes.md." ;;
    infosec)     echo "IS-$(date +%s) — run a quick secrets-scan: grep -rE '(AKIA[0-9A-Z]{16}|ghp_[0-9a-z]{36}|sk-[A-Za-z0-9]{20,})' workspace/ logs/ 2>/dev/null | head -5. If anything leaks, page via workspace/ops/TICKET-TRACKER.md." ;;
    hatake)      echo "HATAKE-$(date +%s) — scan workspace/projects/backlog.md and pick the next-most-ready project. Add a 2-line note to workspace/hatake/decisions.md." ;;
    allrounder)  echo "ALL-$(date +%s) — pick the smallest open workspace/ops task that doesn't have an owner. If you can do it, do it; otherwise requeue it under that agent." ;;
  esac
}

enqueued=0
emptied=0
skipped=0
for a in "${AGENTS[@]}"; do
  hb="/tmp/openclaw-agent-${a}.heartbeat"
  qf="${QUEUE_DIR}/${a}.json"
  worker_alive=0
  [[ -f "$hb" ]] && (( $(date +%s) - $(stat -f %m "$hb" 2>/dev/null || echo 0) < 600 )) && worker_alive=1

  # Queue depth — sum n8n per-agent queue + queue.json pending items for this agent
  qdepth=0
  if [[ -f "$qf" ]]; then
    qdepth=$(python3 -c "
import json
try:
  d=json.load(open('$qf'))
  print(sum(1 for j in d if j.get('status')=='queued'))
except: print(0)
")
  fi
  # Also check queue.json for items assigned to this agent
  qjson_depth=$(python3 -c "
import json, os
qf = '/Users/redinside/.openclaw/workspace/tasks/queue.json'
if not os.path.exists(qf):
  print(0)
  exit()
try:
  d = json.load(open(qf))
  count = 0
  for t in d.get('pending', []):
    agents = t.get('assigned_to', [])
    if isinstance(agents, str):
      agents = [agents]
    if '$a' in [a.lower() for a in agents]:
      count += 1
  print(count)
except: print(0)
" 2>/dev/null)

  if (( worker_alive == 0 )); then
    skipped=$((skipped+1))
    log "  $a: worker_dead → skip (rotator handles)"
    continue
  fi
  total_depth=$((qdepth + qjson_depth))
  if (( total_depth > 0 )); then
    skipped=$((skipped+1))
    log "  $a: alive + qdepth=$qdepth n8n + qjson=$qjson_depth → skip"
    continue
  fi

  # Worker alive, queue empty → refuel
  task=$(task_for "$a")
  if python3 "$JQ_SUBMIT" submit "$a" "$task" >/dev/null 2>&1; then
    enqueued=$((enqueued+1))
    emptied=$((emptied+1))
    log "  $a: alive + empty → REFUELED"
  else
    log "  $a: REFUEL FAILED (job-queue submit error)"
  fi
done

log "SUMMARY: enqueued=$enqueued emptied=$emptied skipped=$skipped"
