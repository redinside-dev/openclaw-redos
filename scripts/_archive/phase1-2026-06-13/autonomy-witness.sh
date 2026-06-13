#!/bin/bash
# autonomy-witness.sh — record system state every 60s
# Used for the full-autonomy validation test on 2026-06-12.
# Designed to survive parent process death (nohup + setsid + &).
set -u

OUT="${1:-/Users/redinside/.openclaw/workspace/ops/evidence/witness-2026-06-12.jsonl}"
DURATION_MIN="${2:-20}"
INTERVAL="${3:-60}"

cd /Users/redinside/.openclaw || exit 1
echo "{\"_witness_start\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"out\":\"$OUT\",\"duration_min\":$DURATION_MIN,\"interval\":$INTERVAL}" >> "$OUT"

END=$(( $(date +%s) + DURATION_MIN * 60 + 30 ))
TICK=0

while [ "$(date +%s)" -lt "$END" ]; do
  TICK=$((TICK+1))
  TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  # Snapshot state via python — single tool, atomic write to JSONL
  python3 - <<PY >> "$OUT" 2>&1 || true
import json, os, time, subprocess
ts = "$TS"
def sh(x, default=""):
    try: return subprocess.check_output(x, shell=True, text=True, stderr=subprocess.DEVNULL, timeout=5).strip()
    except: return default
def shint(x, d=0):
    try: return int(subprocess.check_output(x, shell=True, text=True, stderr=subprocess.DEVNULL, timeout=5).strip())
    except: return d

# Processes
py_workers = sh("pgrep -fl 'queue-worker.py' | awk '{print \$1}'").split()
node_workers = sh("pgrep -fl 'autonomous-worker' | awk '{print \$1}'").split()
openclaw_main = sh("pgrep -f 'openclaw' | head -1")
openclaw_all = sh("pgrep -f 'openclaw'").split()
all_count = shint("pgrep -fl 'openclaw|autonomous-worker|queue-worker' | wc -l")

# Agent status mtimes — use heartbeat mtime (not status JSON, which agents only
# write on check-in; heartbeat is written every 5 min by queue-worker.py)
agents = {}
for a in ['main','ops','eng','research','infosec','finance','hatake','allrounder']:
    hb = f"/tmp/openclaw-agent-{a}.heartbeat"
    agents[a] = int(os.path.getmtime(hb)) if os.path.exists(hb) else None

# Queue depth — read workspace/tasks/queue.json
qp = None
qs = {}
for qp_path in ["workspace/tasks/queue.json"]:
    if os.path.exists(qp_path):
        try:
            d = json.load(open(qp_path))
            for k in ["pending","in_progress","awaiting_approval","completed","failed"]:
                qs[k] = len(d.get(k, []))
            qp = qs["pending"]
        except: pass

# Verifier — look for most recent verifier output
vf = None
for vp in ["workspace/ops/verifier-state.json", "workspace/ops/verifier.log", "workspace/ops/verifier.stdout.log"]:
    if os.path.exists(vp):
        vf = {"path": vp, "mtime": int(os.path.getmtime(vp)), "size": os.path.getsize(vp)}
        break

entry = {
    "ts": ts,
    "tick": $TICK,
    "openclaw_main_pid": openclaw_main or None,
    "openclaw_all_pids": openclaw_all,
    "py_worker_count": len(py_workers),
    "py_worker_pids": py_workers,
    "node_worker_count": len(node_workers),
    "node_worker_pids": node_workers,
    "total_openclaw_count": all_count,
    "queue_statuses": qs,
    "queue_pending": qp,
    "agent_mtimes": agents,
    "verifier": vf,
}
print(json.dumps(entry))
PY
  sleep "$INTERVAL"
done

echo "{\"_witness_end\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"ticks\":$TICK}" >> "$OUT"
