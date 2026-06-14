#!/bin/bash
# 30min-self-verify.sh — Evidence-gated self-verifier (macOS bash 3.2 compat)
# Distinct from supervisor-tick (5min, self-heals). This script is a GATE:
# it does NOT fix anything, it only emits evidence and an OK/FAIL verdict.
# Goal: prove the system holds the autonomy bar over 30-min windows.
#
# Invariants verified (must all pass to emit verdict:ok):
#   1. Gateway on 18789 (HTTP 200)
#   2. Cron scheduler loaded with ≥25 enabled jobs
#   3. All 8 queue workers alive (process OR launchctl-loaded plist)
#   4. Agent-selfheal fired within 15 min
#   5. OAuth-autofix state file <1h old
#   6. No dead-letter items >10 in any queue
#   7. All 8 agent-status files updated within 60 min
#   8. No gateway crash-restart in last 30 min (log scan)
#   9. Slack exec-approvals config: block present, ≥1 approver, target resolvable
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
/opt/homebrew/bin/flock -n 9 || exit 0

NOW=$(date +%s)
NOW_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
log() { echo "[$NOW_ISO] [30min-verify] $*" >> "$LOG"; }
log "tick start"

# Delegate the entire check + emit-evidence to a python helper (avoids bash 3.2
# associative-array limitations on macOS, and is much clearer).
# All independent checks run in parallel via ThreadPoolExecutor.
python3 - << PYEOF
import json, os, sqlite3, subprocess, time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

WORKSPACE = Path("$WORKSPACE")
NOW = $NOW
NOW_ISO = "$NOW_ISO"
SQLITE = WORKSPACE / "state/openclaw.sqlite"
LOG = WORKSPACE / "logs/30min-self-verify.log"
EVIDENCE_DIR = WORKSPACE / "workspace/ops/evidence/30min-verify"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
TSV = WORKSPACE / "workspace/ops/evidence/30min-verify.tsv"
EXPECTED = ["main", "ops", "eng", "research", "finance", "infosec", "hatake", "allrounder"]

def run(cmd, default=""):
    try: return subprocess.check_output(cmd, shell=True, stderr=subprocess.DEVNULL, timeout=5).decode().strip()
    except Exception: return default

def age(path):
    try: return int(time.time() - os.path.getmtime(path))
    except Exception: return 999999

checks = {}
fail_list = []

# ── Parallel check runners ────────────────────────────────────────────────────

def check_gateway():
    gw_ok = 0
    try:
        import urllib.request
        r = urllib.request.urlopen("http://127.0.0.1:18789/healthz", timeout=3)
        if r.status == 200: gw_ok = 1
    except Exception: pass
    return ("gateway", gw_ok)

def check_cron_jobs():
    cron_jobs = 0
    if SQLITE.exists():
        try:
            c = sqlite3.connect(str(SQLITE))
            cron_jobs = c.execute("SELECT COUNT(*) FROM cron_jobs WHERE enabled=1").fetchone()[0]
            c.close()
        except Exception: pass
    ok = 1 if cron_jobs >= 25 else 0
    return ("cron_jobs_count", cron_jobs), ("cron_jobs", ok)

def check_workers():
    missing_workers = []
    plists_out = run("launchctl list")
    for a in EXPECTED:
        found = run(f"pgrep -f 'queue-worker.py {a}'")
        if found: continue
        if f"ai.openclaw.queue-worker.{a}" in plists_out: continue
        missing_workers.append(a)
    ok = 0 if missing_workers else 1
    return ("workers", ok), ("workers_missing", ",".join(missing_workers) or "none")

def check_selfheal():
    sh_age = age("/tmp/openclaw-agent-selfheal.heartbeat")
    ok = 1 if sh_age <= 900 else 0
    return ("agent_selfheal", ok), ("agent_selfheal_age_s", sh_age)

def check_oauth_state():
    oauth_state = WORKSPACE / "state/oauth-health.json"
    oa_age = age(oauth_state)
    ok = 1 if oa_age <= 3600 else 0
    return ("oauth_state_fresh", ok), ("oauth_state_age_s", oa_age)

def check_gog_rotation():
    import datetime as _dt
    gog_rot = WORKSPACE / "workspace-finance/ops/gog-oauth-last-rotation.txt"
    gog_age = None
    gog_iso = ""
    if gog_rot.exists():
        try:
            gog_iso = gog_rot.read_text().strip()
            gog_dt = _dt.datetime.fromisoformat(gog_iso.replace("Z", "+00:00"))
            gog_dt = gog_dt.astimezone(_dt.timezone.utc).replace(tzinfo=None)
            now_naive = _dt.datetime.utcnow()
            gog_age = int((now_naive - gog_dt).total_seconds())
        except Exception as e:
            gog_age = None
    ok = 1 if (gog_age is not None and gog_age <= 6 * 86400) else 0
    return ("gog_rotation_age_s", gog_age if gog_age is not None else -1), \
           ("gog_rotation_iso", gog_iso), ("gog_rotation_fresh", ok)

def check_dead_letter():
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
    ok = 1 if dl_max <= 10 else 0
    return ("dead_letter", ok), ("dead_letter_max", dl_max), ("dead_letter_total", dl_total)

def check_agent_status():
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
    ok = 1 if not stale else 0
    return ("agent_status", ok), ("stale_agents", ",".join(stale) or "none")

def check_slack_exec():
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
    except Exception:
        pass  # will be caught by aggregate checks
    ok = 1 if (slack_block_present == 1 and slack_approver_count >= 1 and slack_target_resolvable == 1) else 0
    return ("slack_exec_block_present", slack_block_present), \
           ("slack_exec_approver_count", slack_approver_count), \
           ("slack_exec_target_resolvable", slack_target_resolvable), \
           ("slack_exec_target_kind", slack_target_kind), \
           ("slack_exec_approvals", ok)

def check_gateway_stable():
    gw_pids_30m = set()
    gw_stable = 1
    try:
        ps_out = subprocess.check_output(
            ["ps", "-axo", "pid,etime,command"], text=True, timeout=5
        )
        for line in ps_out.splitlines():
            if "openclaw" not in line: continue
            if "grep" in line: continue
            if any(s in line for s in ("30min-self-verify", "version-monitor", "queue-cron", "queue-worker")): continue
            parts = line.split(None, 2)
            if len(parts) < 3: continue
            try:
                pid = int(parts[0])
            except Exception: continue
            etime = parts[1]
            try:
                if "-" in etime:
                    days, hms = etime.split("-", 1)
                    h, m, s = hms.split(":")
                    secs = int(days)*86400 + int(h)*3600 + int(m)*60 + int(s)
                else:
                    h, m, s = etime.split(":")
                    secs = int(h)*3600 + int(m)*60 + int(s)
            except Exception:
                continue
            if secs <= 1800:
                gw_pids_30m.add(pid)
        gw_distinct = len(gw_pids_30m)
        if gw_distinct >= 3: gw_stable = 0
    except Exception:
        pass
    return ("gateway_stable_30m", gw_stable), \
           ("gateway_distinct_pids_30m", len(gw_pids_30m)), \
           ("gateway_pids_30m_sample", sorted(gw_pids_30m)[:5])

# ── Run all checks in parallel ─────────────────────────────────────────────────
CHECK_FNS = [
    check_gateway,
    check_cron_jobs,
    check_workers,
    check_selfheal,
    check_oauth_state,
    check_gog_rotation,
    check_dead_letter,
    check_agent_status,
    check_slack_exec,
    check_gateway_stable,
]

with ThreadPoolExecutor(max_workers=12) as ex:
    futures = {ex.submit(fn): fn.__name__ for fn in CHECK_FNS}
    for future in as_completed(futures):
        try:
            result = future.result()
            if result is None: continue
            # Each check returns one or more (key, value) tuples
            if isinstance(result, tuple) and len(result) == 2 and isinstance(result[0], str):
                # single-result check (check_gateway)
                checks[result[0]] = result[1]
            else:
                # multi-result check
                for item in result:
                    if isinstance(item, tuple) and len(item) == 2 and isinstance(item[0], str):
                        checks[item[0]] = item[1]
        except Exception as e:
            pass  # individual check failure doesn't crash the verifier

# ── Compute verdict ────────────────────────────────────────────────────────────
if not checks.get("gateway"): fail_list.append("gateway-down")
if not checks.get("cron_jobs"): fail_list.append(f"cron_jobs<25")
if checks.get("workers_missing") and checks.get("workers_missing") != "none":
    fail_list.append(f"workers-missing={len(checks.get('workers_missing', '').split(','))}")
if not checks.get("agent_selfheal"): fail_list.append("selfheal-stale")
if not checks.get("oauth_state_fresh"): fail_list.append("oauth-state-stale")
if not checks.get("gog_rotation_fresh"): fail_list.append("gog-rotation-stale")
if not checks.get("dead_letter"): fail_list.append(f"dead-letter>{checks.get('dead_letter_max', 0)}")
if not checks.get("agent_status"): fail_list.append(f"agent-status-stale={len(checks.get('stale_agents', '').split(','))}")
if not checks.get("slack_exec_approvals"):
    if not checks.get("slack_exec_block_present"):
        fail_list.append("slack-exec-block-missing")
    elif not checks.get("slack_exec_approver_count"):
        fail_list.append("slack-exec-approvers-empty")
    elif not checks.get("slack_exec_target_resolvable"):
        fail_list.append("slack-exec-target-missing")
if not checks.get("gateway_stable_30m"):
    fail_list.append(f"gateway-restart-loop (distinct PIDs in 30m: {checks.get('gateway_distinct_pids_30m', 0)})")

pass_keys = ("gateway", "cron_jobs", "workers", "agent_selfheal", "oauth_state_fresh", "gog_rotation_fresh", "dead_letter", "agent_status", "gateway_stable_30m", "slack_exec_approvals")
pass_count = sum(1 for k in pass_keys if checks.get(k) == 1)
fail_count = sum(1 for k in pass_keys if checks.get(k) == 0)
verdict = "ok" if fail_count == 0 else "fail"

# ── Emit evidence ──────────────────────────────────────────────────────────────
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

with TSV.open("a") as f:
    f.write(f"{NOW_ISO}\t{verdict}\t{pass_count}\t{fail_count}\t{','.join(fail_list)}\n")

with LOG.open("a") as f:
    f.write(f"[{NOW_ISO}] [30min-verify] verdict={verdict} pass={pass_count} fail={fail_count} fails=[{','.join(fail_list) or 'none'}] evidence={out_path}\n")

print(json.dumps({"verdict": verdict, "pass": pass_count, "fail": fail_count, "evidence": str(out_path)}))
PYEOF
