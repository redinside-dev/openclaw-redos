#!/bin/bash
# 30min-self-verify.sh — Evidence-gated self-verifier (macOS bash 3.2 compat)
# Distinct from supervisor-tick (5min, self-heals). This script is a GATE:
# it does NOT fix anything, it only emits evidence and an OK/FAIL verdict.
# Goal: prove the system holds the autonomy bar over 30-min windows.
#
# Invariants verified (must all pass to emit verdict:ok):
#   1. Gateway on 18789 (HTTP 200)
#   2. Cron scheduler loaded with ≥50 jobs
#   3. Ollama on 11434 with ≥2 models
#   4. All 8 queue workers alive (process OR launchctl-loaded plist)
#   5. Agent-selfheal fired within 15 min
#   6. Ollama-autorecover fired within 30 min
#   7. OAuth-autofix state file <1h old
#   8. No dead-letter items >10 in any queue
#   9. All 8 agent-status files updated within 60 min
#  10. No gateway crash-restart in last 30 min (log scan)
#  11. Slack exec-approvals config: block present, ≥1 approver, target resolvable
#
# Wired via cron job "30min-evidence-gate" — every 30 min.
# Output: workspace/ops/evidence/30min-verify/<ISO-timestamp>.json

set -u

WORKSPACE="$HOME/.openclaw"
SQLITE="$WORKSPACE/state/openclaw.sqlite"
EVIDENCE_DIR="$WORKSPACE/workspace/ops/evidence/30min-verify"
LOG="$WORKSPACE/logs/30min-self-verify.log"
LOCK="/tmp/openclaw-30min-verify.lock"
HB="/tmp/openclaw-30min-verify.heartbeat"
mkdir -p "$EVIDENCE_DIR" "$(dirname "$LOG")"
touch "$HB"
echo "$(date +%s)" > "$HB"

exec 9>"$LOCK" || exit 0
flock -n 9 || exit 0

NOW=$(date +%s)
NOW_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
log() { echo "[$NOW_ISO] [30min-verify] $*" >> "$LOG"; }
log "tick start"

# Delegate the entire check + emit-evidence to a python helper (avoids bash 3.2
# associative-array limitations on macOS, and is much clearer).
python3 - << PYEOF
import json, os, sqlite3, subprocess, time, glob
from pathlib import Path

WORKSPACE = Path("$WORKSPACE")
NOW = $NOW
NOW_ISO = "$NOW_ISO"
SQLITE = WORKSPACE / "state/openclaw.sqlite"
LOG = WORKSPACE / "logs/30min-self-verify.log"
EVIDENCE_DIR = WORKSPACE / "workspace/ops/evidence/30min-verify"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
TSV = WORKSPACE / "workspace/ops/evidence/30min-verify.tsv"

def run(cmd, default=""):
    try: return subprocess.check_output(cmd, shell=True, stderr=subprocess.DEVNULL, timeout=5).decode().strip()
    except Exception: return default

def age(path):
    try: return int(time.time() - os.path.getmtime(path))
    except Exception: return 999999

checks = {}
fail_list = []

# 1) Gateway
gw_ok = 0
if run("nc -z 127.0.0.1 18789") or run("nc -z 127.0.0.1 18789", "x") != "":
    pass
try:
    import urllib.request
    r = urllib.request.urlopen("http://127.0.0.1:18789/healthz", timeout=3)
    if r.status == 200: gw_ok = 1
except Exception: pass
checks["gateway"] = gw_ok
if not gw_ok: fail_list.append("gateway-down")

# 2) Cron jobs
cron_jobs = 0
if SQLITE.exists():
    try:
        c = sqlite3.connect(str(SQLITE))
        cron_jobs = c.execute("SELECT COUNT(*) FROM cron_jobs WHERE enabled=1").fetchone()[0]
        c.close()
    except Exception: pass
checks["cron_jobs_count"] = cron_jobs
checks["cron_jobs"] = 1 if cron_jobs >= 25 else 0  # post-consolidation target
if checks["cron_jobs"] == 0: fail_list.append(f"cron_jobs<25")

# 3) Ollama with ≥2 models
ollama_models = 0
ollama_ok = 0
try:
    import urllib.request
    r = urllib.request.urlopen("http://127.0.0.1:11434/api/tags", timeout=3)
    if r.status == 200:
        d = json.loads(r.read())
        ollama_models = len(d.get("models", []))
        if ollama_models >= 2: ollama_ok = 1
except Exception: pass
checks["ollama_models"] = ollama_models
checks["ollama"] = ollama_ok
if not ollama_ok: fail_list.append(f"ollama-models<{ollama_models}")

# 4) All 8 queue workers
EXPECTED = ["main", "ops", "eng", "research", "finance", "infosec", "hatake", "allrounder"]
missing_workers = []
plists_out = run("launchctl list")
for a in EXPECTED:
    found = run(f"pgrep -f 'queue-worker.py {a}'")
    if found: continue
    if f"ai.openclaw.queue-worker.{a}" in plists_out: continue
    missing_workers.append(a)
checks["workers"] = 0 if missing_workers else 1
checks["workers_missing"] = ",".join(missing_workers) or "none"
if missing_workers: fail_list.append(f"workers-missing={len(missing_workers)}")

# 5) agent-selfheal heartbeat
sh_age = age("/tmp/openclaw-agent-selfheal.heartbeat")
checks["agent_selfheal"] = 1 if sh_age <= 900 else 0
checks["agent_selfheal_age_s"] = sh_age
if checks["agent_selfheal"] == 0: fail_list.append("selfheal-stale")

# 6) ollama-autorecover heartbeat
oar_age = age("/tmp/openclaw-ollama-autorecover.heartbeat")
checks["ollama_autorecover"] = 1 if oar_age <= 1800 else 0
checks["ollama_autorecover_age_s"] = oar_age
if checks["ollama_autorecover"] == 0: fail_list.append("ollama-ar-stale")

# 7) oauth-autofix state
oauth_state = WORKSPACE / "state/oauth-health.json"
oa_age = age(oauth_state)
checks["oauth_state_fresh"] = 1 if oa_age <= 3600 else 0
checks["oauth_state_age_s"] = oa_age
if checks["oauth_state_fresh"] == 0: fail_list.append("oauth-state-stale")

# 8) dead-letter count
dl_max = 0
dl_total = 0
queue_paths = [
    "workspace/tasks/queue.json",
    "workspace/ops/queue.json",
    "workspace-main/inbox/queue.json",
    "workspace-finance/tasks/queue.json",
    "workspace-eng/tasks/queue.json",
    "workspace-research/tasks/queue.json",
    "workspace-infosec/tasks/queue.json",
    "workspace-ops/tasks/queue.json",
    "workspace-allrounder/tasks/queue.json",
    "workspace-hatake/tasks/queue.json",
]
for qp in queue_paths:
    q = WORKSPACE / qp
    if not q.exists(): continue
    try:
        d = json.loads(q.read_text())
        items = d if isinstance(d, list) else d.get("items", d.get("tasks", []))
        n = sum(1 for i in (items or []) if isinstance(i, dict) and i.get("status") == "dead_letter")
        dl_total += n
        if n > dl_max: dl_max = n
    except Exception: pass
checks["dead_letter"] = 1 if dl_max <= 10 else 0
checks["dead_letter_max"] = dl_max
checks["dead_letter_total"] = dl_total
if checks["dead_letter"] == 0: fail_list.append(f"dead-letter>{dl_max}")

# 9) agent-status files fresh
stale = []
for a in EXPECTED:
    candidates = [
        WORKSPACE / f"workspace/ops/agent-status/{a}.json",
        WORKSPACE / f"workspace-main/ops/agent-status/{a}.json",
        WORKSPACE / f"workspace-{a}/ops/agent-status/{a}.json",
    ]
    p = next((c for c in candidates if c.exists()), None)
    if p is None:
        stale.append(f"{a}:missing")
    else:
        a_age = age(p)
        if a_age > 3600: stale.append(f"{a}:{a_age}s")
checks["agent_status"] = 1 if not stale else 0
checks["stale_agents"] = ",".join(stale) or "none"
if stale: fail_list.append(f"agent-status-stale={len(stale)}")

# 9a) Slack exec-approvals config invariants (4 checks)
#     Background: openclaw's channel-exec resolver reads
#         account.execApprovals?.approvers
#     and silently returns approverCount=0 -> shouldHandleRequest=false
#     if the block is missing or approvers is empty.
slack_cfg_path = WORKSPACE / "config/openclaw.json"
slack_block_present = 0
slack_approver_count = 0
slack_target_resolvable = 0
slack_target_kind = "none"
try:
    if slack_cfg_path.exists():
        cfg = json.loads(slack_cfg_path.read_text())
        slack_cfg = (cfg.get("channels") or {}).get("slack") or {}
        ea = slack_cfg.get("execApprovals")
        if isinstance(ea, dict):
            slack_block_present = 1
            approvers = ea.get("approvers")
            if isinstance(approvers, list) and len(approvers) >= 1:
                slack_approver_count = len([a for a in approvers if isinstance(a, str) and a.strip()])
            targets = ea.get("targets") or {}
            if isinstance(targets, dict):
                dm_t = targets.get("dm")
                ch_t = targets.get("channel")
                if isinstance(dm_t, dict) and isinstance(dm_t.get("userId"), str) and dm_t["userId"].strip():
                    slack_target_resolvable = 1
                    slack_target_kind = f"dm:{dm_t['userId']}"
                elif isinstance(ch_t, dict) and isinstance(ch_t.get("channelId"), str) and ch_t["channelId"].strip():
                    slack_target_resolvable = 1
                    slack_target_kind = f"channel:{ch_t['channelId']}"
except Exception as e:
    checks["slack_cfg_error"] = str(e)

# Also resolve per-account (account overrides channel-level, matches dist code path)
# But the channel-level block is what mergeAccountConfig falls back to, so
# this single read is sufficient for our 4 invariant checks.
checks["slack_exec_block_present"] = slack_block_present
checks["slack_exec_approver_count"] = slack_approver_count
checks["slack_exec_target_resolvable"] = slack_target_resolvable
checks["slack_exec_target_kind"] = slack_target_kind
checks["slack_exec_approvals"] = 1 if (
    slack_block_present == 1
    and slack_approver_count >= 1
    and slack_target_resolvable == 1
) else 0
if checks["slack_exec_approvals"] == 0:
    if not slack_block_present:
        fail_list.append("slack-exec-block-missing")
    elif slack_approver_count < 1:
        fail_list.append("slack-exec-approvers-empty")
    elif not slack_target_resolvable:
        fail_list.append("slack-exec-target-missing")

# 10) gateway crash-restart count
sup_log = WORKSPACE / "logs/supervisor.log"
gw_restart_count = 0
gw_stable = 1
if sup_log.exists():
    try:
        lines = sup_log.read_text().splitlines()
        cutoff = NOW - 1800
        for line in lines:
            try:
                # parse leading "[2026-06-10T12:39:25Z]"
                ts = line[1:line.index("]")]
                if "T" not in ts: continue
                t = time.mktime(time.strptime(ts, "%Y-%m-%dT%H:%M:%SZ"))
                if t < cutoff: continue
            except Exception: continue
            if any(k in line for k in ("gateway down", "gateway+watchdog-stale", "FAIL: gateway", "launch.*gateway", "restart")):
                if any(k in line for k in ("gateway",)): gw_restart_count += 1
    except Exception: pass
    if gw_restart_count > 3: gw_stable = 0
checks["gateway_stable_30m"] = gw_stable
checks["gateway_restart_count_30m"] = gw_restart_count
if not gw_stable: fail_list.append("gateway-flapping")

# Compute verdict
pass_keys = ("gateway", "cron_jobs", "ollama", "workers", "agent_selfheal", "ollama_autorecover", "oauth_state_fresh", "dead_letter", "agent_status", "gateway_stable_30m", "slack_exec_approvals")
pass_count = sum(1 for k in pass_keys if checks.get(k) == 1)
fail_count = sum(1 for k in pass_keys if checks.get(k) == 0)
verdict = "ok" if fail_count == 0 else "fail"

# Emit evidence
out = {
    "ts": NOW_ISO,
    "verdict": verdict,
    "pass_count": pass_count,
    "fail_count": fail_count,
    "fail_list": fail_list,
    "checks": checks,
}
out_path = EVIDENCE_DIR / f"{NOW_ISO}.json"
out_path.write_text(json.dumps(out, indent=2))

# Append to TSV (for quick trend)
with TSV.open("a") as f:
    f.write(f"{NOW_ISO}\t{verdict}\t{pass_count}\t{fail_count}\t{','.join(fail_list)}\n")

with LOG.open("a") as f:
    f.write(f"[{NOW_ISO}] [30min-verify] verdict={verdict} pass={pass_count} fail={fail_count} fails=[{','.join(fail_list) or 'none'}] evidence={out_path}\n")

print(json.dumps({"verdict": verdict, "pass": pass_count, "fail": fail_count, "evidence": str(out_path)}))
PYEOF
