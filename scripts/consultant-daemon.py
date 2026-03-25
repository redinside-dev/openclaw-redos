#!/usr/bin/env python3
"""
consultant-daemon.py — RedOS Autonomous Consultant

Runs as a persistent launchd service (ai.openclaw.consultant).
Every N minutes (backoff schedule):
  1. Observe  — parse logs, AUTONOMOUS.md, tasks-log, service health
  2. Diagnose — classify issues by severity
  3. Fix (L0-L2) — direct config patches + service restarts
  4. Delegate (L3+) — openclaw agent CLI
  5. Teach — append structured findings to RAG-LEARNINGS.md + LEARNINGS.md
  6. Trigger RAG reindex (if findings added)
  7. Score autonomy — compute score, adjust backoff phase
  8. Notify user when 30 consecutive stable days reached
"""

import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
HOME = Path.home()
OPENCLAW = HOME / ".openclaw"
WORKSPACE = OPENCLAW / "workspace"
CONSULTANT = WORKSPACE / "consultant"
LOGS = OPENCLAW / "logs"

STATUS_FILE       = CONSULTANT / "STATUS.json"
RAG_LEARNINGS     = CONSULTANT / "RAG-LEARNINGS.md"
CONSULTANT_LOG    = CONSULTANT / "CONSULTANT-LOG.md"
AGENT_LEARNINGS   = WORKSPACE / "ops" / "LEARNINGS.md"
AUTONOMOUS_MD     = WORKSPACE / "AUTONOMOUS.md"
TASKS_LOG         = WORKSPACE / "logs" / "tasks-log.md"
CRON_JOBS         = OPENCLAW / "cron" / "jobs.json"
GATEWAY_LOG       = LOGS / "gateway.log"
GATEWAY_ERR_LOG   = LOGS / "gateway.err.log"
MEMSEARCH         = WORKSPACE / "scripts" / "memsearch.py"
RESTART_SCRIPT    = OPENCLAW / "scripts" / "redos-restart.sh"

# Telegram user to notify on autonomy achievement
TELEGRAM_USER_ID  = "1012034994"

# Phase → check interval in seconds
PHASE_INTERVALS = {
    "INTENSIVE":  15 * 60,
    "NORMAL":     60 * 60,
    "RELAXED":    4  * 60 * 60,
    "AUTONOMOUS": 24 * 60 * 60,
}

# ── Utilities ─────────────────────────────────────────────────────────────────

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def now_dt() -> datetime:
    return datetime.now(timezone.utc)

def log(msg: str):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    try:
        with open(CONSULTANT_LOG, "a") as f:
            f.write(line + "\n")
    except Exception:
        pass

def load_status() -> dict:
    try:
        return json.loads(STATUS_FILE.read_text())
    except Exception:
        return {
            "phase": "INTENSIVE",
            "phase_started_at": now_iso(),
            "stable_days": 0,
            "last_incident_at": None,
            "incidents_fixed": 0,
            "checks_run": 0,
            "autonomy_score_avg": 0.0,
            "last_check_at": None,
        }

def save_status(s: dict):
    STATUS_FILE.write_text(json.dumps(s, indent=2) + "\n")

def tail_file(path: Path, n: int = 500) -> str:
    try:
        result = subprocess.run(
            ["tail", "-n", str(n), str(path)],
            capture_output=True, text=True, timeout=10
        )
        return result.stdout
    except Exception:
        return ""

def read_file(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return ""

def append_to_file(path: Path, content: str):
    with open(path, "a") as f:
        f.write(content)

def run_cmd(cmd: list, timeout: int = 30) -> tuple[int, str, str]:
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "timeout"
    except Exception as e:
        return -1, "", str(e)

def openclaw_agent(agent: str, message: str, channel: str = "telegram") -> bool:
    """
    Delegate a task to an agent.
    Strategy: write directly to AUTONOMOUS.md (fast, no network round-trip).
    The cron system reads AUTONOMOUS.md every cycle.
    Only fall back to CLI for Telegram notifications.
    """
    return inject_task(agent, message)

def inject_task(agent: str, message: str) -> bool:
    """Write a task directly into AUTONOMOUS.md for the agent to pick up.
    Deduplication: skip if an identical PENDING consultant task for this agent
    already exists and was injected within the last 4 hours.
    Also skip if AUTONOMOUS.md is already > 20KB (circuit-breaker).
    """
    try:
        current = AUTONOMOUS_MD.read_text(encoding="utf-8", errors="replace") if AUTONOMOUS_MD.exists() else ""

        # Circuit-breaker: if file > 20KB, do NOT inject more consultant tasks
        if len(current.encode("utf-8")) > 20480:
            log(f"  [inject] CIRCUIT-BREAKER: AUTONOMOUS.md > 20KB — refusing to inject more tasks. "
                f"File must be manually trimmed first.")
            return False

        # Dedup: look for a PENDING task for this agent injected in last 4h
        dedup_pattern = re.compile(
            r'CONSULTANT-' + agent.upper().replace('-', r'[\-_]') + r'-(\d{14})',
            re.IGNORECASE
        )
        cutoff = now_dt() - timedelta(hours=4)
        for m in dedup_pattern.finditer(current):
            try:
                ts_str = m.group(1)  # YYYYMMDDHHmmss
                inject_time = datetime.strptime(ts_str, "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
                if inject_time >= cutoff:
                    log(f"  [inject] DEDUP: task for '{agent}' already injected at {ts_str} (within 4h) — skipping")
                    return True  # return True so caller doesn't retry
            except Exception:
                pass

        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        task_id = f"CONSULTANT-{agent.upper()}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        entry = (
            f"\n## CONSULTANT TASK (injected {ts})\n\n"
            f"**{task_id}** | PENDING ({ts}) | {agent} | {message}\n"
        )
        with open(AUTONOMOUS_MD, "a") as f:
            f.write(entry)
        log(f"  [inject] {task_id} → AUTONOMOUS.md for agent '{agent}'")
        return True
    except Exception as e:
        log(f"  [inject] ERROR writing to AUTONOMOUS.md: {e}")
        return False

def notify_telegram(message: str) -> bool:
    """Send a Telegram notification via openclaw agent CLI (used only for critical alerts)."""
    cmd = [
        "openclaw", "agent",
        "--agent", "main",
        "--channel", "telegram",
        "--message", message,
    ]
    code, out, err = run_cmd(cmd, timeout=30)
    if code == 0:
        log(f"  [telegram] notification sent OK")
        return True
    else:
        log(f"  [telegram] notification failed ({err.strip()[:100]})")
        return False

def check_http(url: str, timeout: int = 5) -> bool:
    try:
        r = subprocess.run(
            ["curl", "-sf", "--max-time", str(timeout), url],
            capture_output=True, timeout=timeout + 2
        )
        return r.returncode == 0
    except Exception:
        return False

# ── Observation ───────────────────────────────────────────────────────────────

def observe() -> dict:
    """Gather raw observations from all sources."""
    obs = {}

    # Gateway log (last 500 lines)
    obs["gateway_log"] = tail_file(GATEWAY_LOG, 500)
    obs["gateway_err"] = tail_file(GATEWAY_ERR_LOG, 200)

    # AUTONOMOUS.md
    obs["autonomous_md"] = read_file(AUTONOMOUS_MD)

    # tasks-log.md
    obs["tasks_log"] = read_file(TASKS_LOG)

    # Service health
    obs["gateway_up"]    = check_http("http://127.0.0.1:18789/health")
    obs["router_up"]     = check_http("http://127.0.0.1:20128/v1/models")
    obs["n8n_up"]        = check_http("http://127.0.0.1:5678")
    obs["dashboard_up"]  = check_http("http://127.0.0.1:19000")
    obs["ollama_up"]     = check_http("http://127.0.0.1:11434/api/tags")

    # cron/jobs.json
    try:
        obs["cron_jobs"] = json.loads(CRON_JOBS.read_text())
    except Exception:
        obs["cron_jobs"] = None

    # Memsearch index age
    qdrant_path = OPENCLAW / ".memsearch" / "qdrant"
    if qdrant_path.exists():
        # Find newest file in qdrant dir
        newest = max(
            (f.stat().st_mtime for f in qdrant_path.rglob("*") if f.is_file()),
            default=0
        )
        obs["rag_index_age_hours"] = (time.time() - newest) / 3600 if newest else 999
    else:
        obs["rag_index_age_hours"] = 999

    return obs

# ── Diagnosis ─────────────────────────────────────────────────────────────────

def diagnose(obs: dict) -> list[dict]:
    """Return list of issues: {id, severity, title, details, fix_fn}"""
    issues = []

    # 1. Gateway down
    if not obs["gateway_up"]:
        issues.append({
            "id": "gateway_down",
            "severity": "L2",
            "title": "OpenClaw gateway not responding on :18789",
            "details": "HTTP health check failed",
        })

    # 2. 9Router down
    if not obs["router_up"]:
        issues.append({
            "id": "router_down",
            "severity": "L2",
            "title": "9Router not responding on :20128",
            "details": "Model API unreachable — all agents will fail",
        })

    # 3. Channel errors in gateway log
    channel_errors = len(re.findall(r"Channel is required|channel.*error|delivery.*channel", obs["gateway_log"], re.IGNORECASE))
    if channel_errors > 3:
        issues.append({
            "id": "channel_errors",
            "severity": "L1",
            "title": f"Channel errors in gateway log ({channel_errors} occurrences)",
            "details": "Cron jobs missing delivery.channel field",
        })

    # 4. Stale IN_PROGRESS tasks (>2h)
    stale = _find_stale_tasks(obs["autonomous_md"])
    if stale:
        issues.append({
            "id": "stale_tasks",
            "severity": "L1",
            "title": f"{len(stale)} stale IN_PROGRESS tasks (>2h)",
            "details": "\n".join(stale[:5]),
        })

    # 5. RAG index stale
    age = obs.get("rag_index_age_hours", 999)
    if age > 25:
        issues.append({
            "id": "rag_stale",
            "severity": "L1",
            "title": f"RAG index stale ({age:.1f}h since last update)",
            "details": f"Qdrant index last updated {age:.1f}h ago — agents have stale knowledge",
        })

    # 6. No task completions in 24h
    if not _has_recent_completions(obs["tasks_log"], hours=24):
        issues.append({
            "id": "no_completions",
            "severity": "L3",
            "title": "No task completions in last 24h",
            "details": "Agents may be stuck — no entries added to tasks-log.md",
        })

    # 7. Cron consecutive errors
    if obs["cron_jobs"] is not None:
        error_crons = _find_error_crons(obs["cron_jobs"])
        if error_crons:
            issues.append({
                "id": "cron_errors",
                "severity": "L1",
                "title": f"{len(error_crons)} cron jobs with consecutive errors",
                "details": ", ".join(error_crons[:10]),
            })

    # 8. A2A timeout pattern
    timeout_count = len(re.findall(r"timeout|timed out", obs["gateway_log"], re.IGNORECASE))
    if timeout_count > 10:
        issues.append({
            "id": "a2a_timeouts",
            "severity": "L2",
            "title": f"High A2A timeout rate ({timeout_count} in log tail)",
            "details": "Agent-to-agent calls timing out frequently",
        })

    # 9. No SPEC.md created recently (coding factory stalled)
    spec_files = list((WORKSPACE / "projects").rglob("SPEC.md")) if (WORKSPACE / "projects").exists() else []
    if spec_files:
        newest_spec = max(f.stat().st_mtime for f in spec_files)
        spec_age_h = (time.time() - newest_spec) / 3600
        if spec_age_h > 48:
            issues.append({
                "id": "factory_stalled",
                "severity": "L3",
                "title": f"Coding factory stalled — last SPEC.md is {spec_age_h:.0f}h old",
                "details": "RESEARCH → ENG pipeline needs a trigger",
            })

    return issues

def _find_stale_tasks(content: str) -> list[str]:
    """Find task IDs that have been IN_PROGRESS for >2 hours."""
    stale = []
    pattern = re.compile(r'\*\*([A-Z0-9-]+)\*\* \| IN_PROGRESS \((\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\)')
    now = now_dt()
    for m in pattern.finditer(content):
        task_id, ts = m.group(1), m.group(2)
        try:
            task_time = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            if (now - task_time) > timedelta(hours=2):
                stale.append(task_id)
        except Exception:
            pass
    return stale

def _has_recent_completions(tasks_log: str, hours: int = 24) -> bool:
    """Check if tasks-log.md has entries from the last N hours.
    Compares by date only (not midnight UTC) so yesterday's entries count
    when hours=24 and the cutoff falls partway through the prior day.
    """
    if not tasks_log:
        return False
    cutoff = (now_dt() - timedelta(hours=hours)).date()
    date_pattern = re.compile(r'(\d{4}-\d{2}-\d{2})')
    for m in date_pattern.finditer(tasks_log[-5000:]):
        try:
            d = datetime.strptime(m.group(1), "%Y-%m-%d").date()
            if d >= cutoff:
                return True
        except Exception:
            pass
    return False

def _find_error_crons(cron_data) -> list[str]:
    """Return IDs of cron jobs with ≥3 consecutive errors and enabled."""
    errors = []
    # jobs.json is {"version": ..., "jobs": [...]} or a plain list
    if isinstance(cron_data, list):
        jobs = cron_data
    elif isinstance(cron_data, dict):
        jobs = cron_data.get("jobs", cron_data.get("crons", []))
        if not isinstance(jobs, list):
            jobs = []
    else:
        return []
    for job in jobs:
        if not isinstance(job, dict):
            continue
        if not job.get("enabled"):
            continue
        state = job.get("state", {})
        if isinstance(state, dict) and state.get("consecutiveErrors", 0) >= 3:
            errors.append(job.get("id", "unknown"))
    return errors

# ── Fix Actions ───────────────────────────────────────────────────────────────

def fix_gateway_down(obs: dict) -> str:
    """L2: Kickstart OpenClaw gateway via launchctl."""
    log("  [fix] Kickstarting OpenClaw gateway...")
    uid = os.getuid()
    code, _, err = run_cmd(
        ["launchctl", "kickstart", "-k", f"gui/{uid}/ai.openclaw.gateway"],
        timeout=15
    )
    if code != 0:
        # Try load/unload cycle
        plist = HOME / "Library" / "LaunchAgents" / "ai.openclaw.gateway.plist"
        run_cmd(["launchctl", "unload", str(plist)], timeout=10)
        time.sleep(2)
        run_cmd(["launchctl", "load", str(plist)], timeout=10)
    time.sleep(3)
    if check_http("http://127.0.0.1:18789/health"):
        return "Gateway restarted successfully"
    return "Gateway restart attempted — still not responding (may need manual check)"

def fix_router_down(obs: dict) -> str:
    """L2: Kickstart 9Router service."""
    log("  [fix] Kickstarting 9Router...")
    uid = os.getuid()
    code, _, _ = run_cmd(
        ["launchctl", "kickstart", "-k", "gui/{}/com.9router.autostart".format(uid)],
        timeout=15
    )
    if code != 0:
        plist = HOME / "Library" / "LaunchAgents" / "com.9router.autostart.plist"
        run_cmd(["launchctl", "unload", str(plist)], timeout=10)
        time.sleep(2)
        run_cmd(["launchctl", "load", str(plist)], timeout=10)
    time.sleep(5)
    if check_http("http://127.0.0.1:20128/v1/models"):
        return "9Router restarted successfully"
    return "9Router restart attempted — still not responding"

def fix_channel_errors(obs: dict) -> str:
    """L1: Find cron jobs missing delivery.channel and patch them."""
    if not obs.get("cron_jobs"):
        return "Could not read cron/jobs.json"
    patched = 0
    # Map agentId to default Telegram channel
    agent_channels = {
        "main": "telegram", "allrounder": "telegram", "ops": "telegram",
        "eng": "telegram", "research": "telegram", "finance": "telegram",
        "infosec": "telegram", "hatake": "telegram",
    }
    for job in obs["cron_jobs"].get("jobs", []):
        delivery = job.get("delivery", {})
        if job.get("enabled") and not delivery.get("channel"):
            agent_id = job.get("agentId", "main")
            job["delivery"] = {
                **delivery,
                "channel": agent_channels.get(agent_id, "telegram")
            }
            patched += 1
    if patched > 0:
        CRON_JOBS.write_text(json.dumps(obs["cron_jobs"], indent=2) + "\n")
        log(f"  [fix] Patched {patched} cron jobs with missing delivery.channel")
        return f"Patched {patched} cron jobs with missing delivery.channel"
    return "No channel-less cron jobs found (may be log noise)"

def fix_stale_tasks(obs: dict) -> str:
    """L1: Reset stale IN_PROGRESS tasks to PENDING in AUTONOMOUS.md."""
    content = read_file(AUTONOMOUS_MD)
    stale = _find_stale_tasks(content)
    if not stale:
        return "No stale tasks to reset"

    updated = content
    for task_id in stale:
        # Replace IN_PROGRESS status with PENDING, keep same timestamp
        pattern = re.compile(
            r'(\*\*' + re.escape(task_id) + r'\*\* \| )IN_PROGRESS (\([^)]+\))'
        )
        updated = pattern.sub(r'\1PENDING \2', updated)

    if updated != content:
        AUTONOMOUS_MD.write_text(updated)
        log(f"  [fix] Reset {len(stale)} stale tasks to PENDING: {', '.join(stale[:5])}")
        return f"Reset {len(stale)} stale tasks to PENDING: {', '.join(stale)}"
    return f"Could not reset stale tasks in AUTONOMOUS.md"

def fix_rag_stale(obs: dict) -> str:
    """L1: Trigger RAG reindex via memsearch.py."""
    if not MEMSEARCH.exists():
        return "memsearch.py not found"
    log("  [fix] Triggering RAG reindex...")
    python = OPENCLAW / ".venv" / "bin" / "python3"
    if not python.exists():
        python = Path(sys.executable)
    code, _, err = run_cmd([str(python), str(MEMSEARCH), "index"], timeout=120)
    if code == 0:
        return "RAG index rebuilt successfully"
    return f"RAG reindex failed: {err[:200]}"

def fix_no_completions(obs: dict) -> str:
    """L3: Inject new tasks via OPS agent."""
    msg = (
        "CONSULTANT ALERT: No task completions detected in the last 24 hours. "
        "Please check if all agents are operational. "
        "Run a health check, report any stuck agents to workspace/ops/TICKET-TRACKER.md, "
        "and inject fresh tasks into workspace/AUTONOMOUS.md to restart activity."
    )
    success = openclaw_agent("ops", msg)
    return "OPS agent tasked to investigate and inject new work" if success else "Failed to reach OPS agent"

def fix_factory_stalled(obs: dict) -> str:
    """L3: Inject RESEARCH task to restart coding factory pipeline."""
    msg = (
        "CONSULTANT: Coding factory pipeline has stalled — no new SPEC.md created in 48h. "
        "Please: 1) Search GitHub/HN for the most-requested developer tool right now. "
        "2) Write a SPEC.md to workspace/projects/<slug>/SPEC.md. "
        "3) Add an ENG task to workspace/AUTONOMOUS.md: "
        "'ENG: Implement <slug> per SPEC.md. Create repo, implement MVP, commit, open PR. Log to pr-log.md.'"
    )
    success = openclaw_agent("research", msg)
    return "RESEARCH agent tasked to restart coding factory" if success else "Failed to reach RESEARCH agent"

# Fix dispatch table (by issue ID)
FIX_DISPATCH = {
    "gateway_down":  fix_gateway_down,
    "router_down":   fix_router_down,
    "channel_errors": fix_channel_errors,
    "stale_tasks":   fix_stale_tasks,
    "rag_stale":     fix_rag_stale,
    "no_completions": fix_no_completions,
    "factory_stalled": fix_factory_stalled,
}

# ── Teach ─────────────────────────────────────────────────────────────────────

def teach(issue: dict, fix_result: str):
    """Append structured learning to RAG-LEARNINGS.md and LEARNINGS.md."""
    today = datetime.now().strftime("%Y-%m-%d %H:%M")
    title = issue["title"]
    severity = issue["severity"]
    details = issue.get("details", "N/A")

    # RAG-format entry (rich, for Qdrant)
    rag_entry = f"""
## [{today}] Fix: {title}
**Severity:** {severity}
**Symptom:** {details}
**Root cause:** Auto-detected by consultant-daemon.py
**Fix applied:** {fix_result}
**How agents can self-fix:** See fix_dispatch in consultant-daemon.py for issue_id='{issue["id"]}'. Run `openclaw agent --agent ops --message "SELF-HEAL: {title}"`.
**Pattern to watch:** Re-run diagnostic check for issue_id={issue["id"]} to detect recurrence.

"""
    append_to_file(RAG_LEARNINGS, rag_entry)

    # Short entry for agent-visible LEARNINGS.md
    short_entry = f"\n## [{today}] Consultant fixed: {title}\n{fix_result}\n"
    append_to_file(AGENT_LEARNINGS, short_entry)

# ── Autonomy Score ─────────────────────────────────────────────────────────────

def compute_autonomy_score(obs: dict, issues: list) -> float:
    """
    Score 0–10:
    - Services up: +2 (gateway, router)
    - No critical issues: +2
    - Recent task completions: +2
    - RAG index fresh: +1
    - Cron jobs healthy: +2
    - Coding factory active: +1
    """
    score = 0.0

    # Services
    if obs.get("gateway_up"):   score += 1.0
    if obs.get("router_up"):    score += 1.0

    # No critical issues (L2+)
    critical = [i for i in issues if i["severity"] in ("L2", "L3")]
    if not critical:
        score += 2.0
    elif len(critical) == 1:
        score += 1.0

    # Recent completions
    if _has_recent_completions(obs.get("tasks_log", ""), 24):
        score += 2.0

    # RAG fresh
    if obs.get("rag_index_age_hours", 999) < 25:
        score += 1.0

    # Cron health
    if obs.get("cron_jobs"):
        error_crons = _find_error_crons(obs["cron_jobs"])
        if not error_crons:
            score += 2.0
        elif len(error_crons) < 3:
            score += 1.0

    # Coding factory
    spec_files = list((WORKSPACE / "projects").rglob("SPEC.md")) if (WORKSPACE / "projects").exists() else []
    if spec_files:
        newest = max(f.stat().st_mtime for f in spec_files)
        if (time.time() - newest) / 3600 < 48:
            score += 1.0

    return min(10.0, score)

# ── Phase Management ──────────────────────────────────────────────────────────

def update_phase(status: dict, incident_occurred: bool, score: float) -> dict:
    """Advance or revert the backoff phase based on stability."""
    if incident_occurred:
        if status["phase"] != "INTENSIVE":
            log(f"  [phase] Incident detected — reverting to INTENSIVE")
        status["phase"] = "INTENSIVE"
        status["phase_started_at"] = now_iso()
        status["stable_days"] = 0
        return status

    # Calculate stable days since last incident or phase start
    ref = status.get("last_incident_at") or status.get("phase_started_at") or now_iso()
    try:
        ref_dt = datetime.fromisoformat(ref.replace("Z", "+00:00"))
        stable_days = (now_dt() - ref_dt).days
    except Exception:
        stable_days = 0

    status["stable_days"] = stable_days

    current = status["phase"]
    if current == "INTENSIVE"  and stable_days >= 7:
        status["phase"] = "NORMAL"
        status["phase_started_at"] = now_iso()
        log(f"  [phase] Advancing to NORMAL (7 days stable)")
    elif current == "NORMAL"   and stable_days >= 14:
        status["phase"] = "RELAXED"
        status["phase_started_at"] = now_iso()
        log(f"  [phase] Advancing to RELAXED (14 days stable)")
    elif current == "RELAXED"  and stable_days >= 30:
        status["phase"] = "AUTONOMOUS"
        status["phase_started_at"] = now_iso()
        log(f"  [phase] AUTONOMOUS phase reached! Sending Telegram notification.")
        send_autonomy_notification()

    return status

def send_autonomy_notification():
    """Notify user via Telegram that the system is fully autonomous."""
    msg = (
        "✅ RedOS has achieved autonomous operation. "
        "All agents are self-managing with no critical incidents for 30 consecutive days. "
        "Switching to daily check-ins. "
        "Disable the consultant with: launchctl bootout gui/$(id -u)/ai.openclaw.consultant"
    )
    notify_telegram(f"CONSULTANT → {TELEGRAM_USER_ID}: {msg}")

# ── Main Loop ─────────────────────────────────────────────────────────────────

def run_check():
    """Single check cycle: observe → diagnose → fix → teach → score → phase."""
    status = load_status()
    status["checks_run"] = status.get("checks_run", 0) + 1

    log(f"=== CONSULTANT CHECK #{status['checks_run']} | Phase: {status['phase']} ===")

    # 1. Observe
    log("[1/7] Observing system...")
    obs = observe()
    log(f"  Services: gateway={'UP' if obs['gateway_up'] else 'DOWN'} "
        f"9router={'UP' if obs['router_up'] else 'DOWN'} "
        f"n8n={'UP' if obs['n8n_up'] else 'DOWN'}")

    # 2. Diagnose
    log("[2/7] Diagnosing...")
    issues = diagnose(obs)
    if issues:
        log(f"  Found {len(issues)} issue(s):")
        for iss in issues:
            log(f"    [{iss['severity']}] {iss['title']}")
    else:
        log("  No issues detected")

    # 3+4+5. Fix & Teach
    incident_occurred = False
    fixes_applied = 0
    rag_updated = False

    if issues:
        log("[3-5/7] Fixing & teaching...")
        for issue in issues:
            fix_fn = FIX_DISPATCH.get(issue["id"])
            if fix_fn:
                log(f"  Fixing [{issue['id']}]...")
                fix_result = fix_fn(obs)
                log(f"  Result: {fix_result}")
                teach(issue, fix_result)
                status["incidents_fixed"] = status.get("incidents_fixed", 0) + 1
                incident_occurred = True
                fixes_applied += 1
                rag_updated = True
            else:
                # Delegate unhandled issues to OPS
                log(f"  Delegating [{issue['id']}] to OPS agent...")
                openclaw_agent("ops", f"CONSULTANT ISSUE [{issue['severity']}]: {issue['title']}\n{issue.get('details','')}")
                incident_occurred = True
        if fixes_applied:
            status["last_incident_at"] = now_iso()

    # 6. Trigger RAG reindex if we added new learnings
    if rag_updated:
        log("[6/7] Triggering RAG reindex...")
        reindex_result = fix_rag_stale(obs)
        log(f"  {reindex_result}")
    else:
        log("[6/7] No new learnings — skipping reindex")

    # 7. Score & phase
    log("[7/7] Scoring autonomy...")
    score = compute_autonomy_score(obs, issues)
    prev_avg = status.get("autonomy_score_avg", 0.0)
    n = status["checks_run"]
    status["autonomy_score_avg"] = round(prev_avg + (score - prev_avg) / n, 2)
    log(f"  Score: {score:.1f}/10.0  |  Rolling avg: {status['autonomy_score_avg']:.2f}")

    status = update_phase(status, incident_occurred, score)
    status["last_check_at"] = now_iso()
    save_status(status)

    interval = PHASE_INTERVALS.get(status["phase"], 900)
    log(f"=== CHECK COMPLETE | Next in {interval//60}m | Phase: {status['phase']} ===\n")
    return interval

def main():
    # Ensure consultant directory exists
    CONSULTANT.mkdir(parents=True, exist_ok=True)

    log("=== consultant-daemon.py starting ===")
    log(f"  OPENCLAW: {OPENCLAW}")
    log(f"  Phase: {load_status().get('phase', 'INTENSIVE')}")

    while True:
        try:
            sleep_seconds = run_check()
        except KeyboardInterrupt:
            log("Consultant shutting down (KeyboardInterrupt)")
            break
        except Exception as e:
            log(f"ERROR in run_check: {e}")
            import traceback
            log(traceback.format_exc())
            sleep_seconds = 900  # fallback: retry in 15min

        log(f"Sleeping {sleep_seconds // 60}m until next check...")
        time.sleep(sleep_seconds)

if __name__ == "__main__":
    main()
