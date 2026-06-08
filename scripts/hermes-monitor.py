#!/usr/bin/env python3
"""Hermes Active Monitor — keeps hermes-scheduler and hermes-api alive.

LaunchD: ai.openclaw.hermes-watchdog (KeepAlive=true, RunAtLoad=true)
"""

from __future__ import annotations

import os
import sys
import time
import logging
import signal
import subprocess
import importlib.util
from datetime import datetime, timezone
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────────
HERMES_ROOT = Path(os.environ.get("HERMES_ROOT", str(Path.home() / ".hermes")))
OPENCLAW_ROOT = Path(os.environ.get("OPENCLAW_ROOT", str(Path.home() / ".openclaw")))
LOG_DIR = OPENCLAW_ROOT / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

LOG_FILE = LOG_DIR / "hermes-monitor.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stderr),
    ],
)
log = logging.getLogger("hermes.monitor")

# ── Process lookup helpers ────────────────────────────────────────────────────

def get_pid(path: Path) -> int | None:
    """Read a .pid file and return the integer PID, or None if stale/missing."""
    if not path.exists():
        return None
    try:
        pid = int(path.read_text().strip())
        return pid if pid > 0 else None
    except (ValueError, OSError):
        return None


def is_process_alive(pid: int) -> bool:
    """True if a process with given PID is currently running."""
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _pgrep_name_has_regex_metachars(name: str) -> bool:
    """True if `name` contains regex metacharacters BSD pgrep would treat as literal.

    macOS BSD pgrep treats . * + ? | ( ) [ ] { } ^ $ \\ as LITERAL characters, not
    regex metacharacters. A pattern intended as a regex (e.g. `openclaw.*gateway`)
    silently never matches and returns false-negative. The canonical incident was
    the 2026-06-08 10-min gateway restart cycle caused by
    `pgrep -f "openclaw.*gateway"` in redos-healthcheck.sh that never matched
    the actual gateway cmdline (TICKET-20260608-GATEWAY-EVERY-10MIN-RESTART-001).
    This helper flags such names so the caller can be warned at runtime.
    """
    if not isinstance(name, str):
        return False
    return any(c in name for c in r".*+?|()[]{}^$" + "\\")


def find_process_by_name(name: str) -> list[int]:
    """Return PIDs of processes whose command line contains `name`.

    Logs a warning if `name` contains regex metacharacters that BSD pgrep would
    treat as literal substrings (causing silent false-negatives). This is a
    defense-in-depth check; callers should pass plain literal substrings.
    The two current call sites (`scheduler.py`, `autonomous-worker-v2.js`) are
    safe; the warning is for future callers that might pass user/config input.
    """
    if _pgrep_name_has_regex_metachars(name):
        log.warning(
            "find_process_by_name: name=%r contains regex metacharacters; "
            "BSD pgrep will treat them as literal substrings and may silently "
            "false-negative. Use a plain literal substring instead.",
            name,
        )
    try:
        out = subprocess.check_output(
            ["pgrep", "-f", name],
            stderr=subprocess.DEVNULL,
            text=True,
        )
        return [int(p) for p in out.strip().split("\n") if p]
    except (subprocess.CalledProcessError, ValueError):
        return []


def load_hermes_cron_jobs(hermes_root: Path):
    """Load hermes.cron.jobs using importlib, fixing dot-prefix package discovery."""
    if "hermes" not in sys.modules:
        hermes_init = hermes_root / "__init__.py"
        spec = importlib.util.spec_from_file_location("hermes", str(hermes_init))
        stub = importlib.util.module_from_spec(spec)
        stub.__path__ = [str(hermes_root)]
        stub.__package__ = "hermes"
        sys.modules["hermes"] = stub
        spec.loader.exec_module(stub)

    if "hermes.cron" not in sys.modules:
        cron_init = hermes_root / "cron" / "__init__.py"
        spec = importlib.util.spec_from_file_location("hermes.cron", str(cron_init))
        stub = importlib.util.module_from_spec(spec)
        stub.__path__ = [str(hermes_root / "cron")]
        stub.__package__ = "hermes.cron"
        sys.modules["hermes.cron"] = stub
        spec.loader.exec_module(stub)

    jobs_spec = importlib.util.spec_from_file_location(
        "hermes.cron.jobs",
        str(hermes_root / "cron" / "jobs.py"),
    )
    jobs_mod = importlib.util.module_from_spec(jobs_spec)
    sys.modules["hermes.cron.jobs"] = jobs_mod
    jobs_spec.loader.exec_module(jobs_mod)
    return jobs_mod


def start_scheduler() -> int | None:
    """Spawn hermes-scheduler.py. Returns PID or None on failure."""
    script = HERMES_ROOT / "cron" / "scheduler.py"
    if not script.exists():
        log.error("scheduler.py not found at %s", script)
        return None
    env = dict(os.environ)
    env["HERMES_ROOT"] = str(HERMES_ROOT)
    try:
        proc = subprocess.Popen(
            [sys.executable, str(script)],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        log.info("Started scheduler.py (pid=%d)", proc.pid)
        return proc.pid
    except Exception as e:
        log.error("Failed to start scheduler: %s", e)
        return None


def start_hermes_api() -> int | None:
    """Spawn hermes-api.py. Returns PID or None on failure."""
    script = HERMES_ROOT / "cron" / "hermes-api.py"
    if not script.exists():
        log.warning("hermes-api.py not found at %s — skipping", script)
        return None
    env = dict(os.environ)
    env["HERMES_ROOT"] = str(HERMES_ROOT)
    try:
        out_path = HERMES_ROOT / "cron" / "hermes-api.log"
        proc = subprocess.Popen(
            [sys.executable, str(script)],
            env=env,
            stdout=open(str(out_path), "a"),
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )
        log.info("Started hermes-api.py (pid=%d) on port 18790", proc.pid)
        return proc.pid
    except Exception as e:
        log.error("Failed to start hermes-api: %s", e)
        return None


def start_worker() -> int | None:
    """Spawn autonomous-worker-v2.js via openclaw run, all agents. Returns PID or None."""
    openclaw_bin = Path(
        os.environ.get("OPENCLAW_BIN", "/opt/homebrew/bin/openclaw")
    )
    if not openclaw_bin.exists():
        log.warning("openclaw binary not found at %s", openclaw_bin)
        return None
    try:
        proc = subprocess.Popen(
            [str(openclaw_bin), "run", "autonomous-worker-v2.js", "--all-agents"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        log.info("Started autonomous-worker-v2.js (pid=%d)", proc.pid)
        return proc.pid
    except Exception as e:
        log.error("Failed to start autonomous-worker: %s", e)
        return None


# ── Watchdog logic ─────────────────────────────────────────────────────────────

SCHEDULER_PID_FILE = HERMES_ROOT / "cron" / "scheduler.pid"
API_PID_FILE = HERMES_ROOT / "cron" / "hermes-api.pid"
WORKER_PID_FILE = OPENCLAW_ROOT / "workspace" / "autonomous-worker.pid"

# Rate-limit restarts: no more than one per RESTART_COOLDOWN seconds per target
RESTART_COOLDOWN = 60  # seconds

_last_restart = {
    "scheduler": 0.0,
    "hermes-api": 0.0,
    "worker": 0.0,
}

# Track bootstrap restarts so the loop doesn't double-fire them
_healthy_count = {"hermes-api": 0}


def can_restart(name: str) -> bool:
    now = time.time()
    if now - _last_restart[name] < RESTART_COOLDOWN:
        return False
    _last_restart[name] = now
    return True


def check_and_fix_scheduler():
    pid = get_pid(SCHEDULER_PID_FILE)
    alive = is_process_alive(pid) if pid else False

    # Also scan for any running scheduler (belt-and-suspenders)
    running_pids = find_process_by_name("scheduler.py")
    if running_pids:
        # Scheduler is running — keep PID file in sync
        current = running_pids[0]
        if pid != current:
            SCHEDULER_PID_FILE.write_text(str(current))
            log.info("Synced scheduler PID file: %d", current)
        return

    if not alive:
        if can_restart("scheduler"):
            new_pid = start_scheduler()
            if new_pid:
                SCHEDULER_PID_FILE.write_text(str(new_pid))


def check_and_fix_hermes_api():
    pid = get_pid(API_PID_FILE)
    alive = is_process_alive(pid) if pid else False

    # Check HTTP endpoint as secondary health signal
    api_up = False
    try:
        import urllib.request
        req = urllib.request.Request(
            "http://127.0.0.1:18790/health",
            method="HEAD",
        )
        with urllib.request.urlopen(req, timeout=2) as resp:
            api_up = resp.status == 200
    except Exception:
        pass

    if alive and api_up:
        _healthy_count["hermes-api"] += 1  # count consecutive healthy cycles
        return  # all good

    if not alive or not api_up:
        if not can_restart("hermes-api"):
            return  # rate-limited
        new_pid = start_hermes_api()
        if new_pid:
            API_PID_FILE.write_text(str(new_pid))


def check_and_fix_worker():
    """Ensure at least one autonomous-worker process is alive."""
    running = find_process_by_name("autonomous-worker-v2.js")
    if running:
        current = running[0]
        pid = get_pid(WORKER_PID_FILE)
        if pid != current:
            WORKER_PID_FILE.write_text(str(current))
        return

    if can_restart("worker"):
        new_pid = start_worker()
        if new_pid:
            WORKER_PID_FILE.write_text(str(new_pid))


def write_heartbeat():
    """Append a timestamped heartbeat line to the system-health log."""
    health_log = Path.home() / ".shared" / "system-health.jsonl"
    health_log.parent.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).isoformat()
    line = f'{{"service":"hermes-monitor","alive":true,"ts":"{ts}"}}\n'
    try:
        with open(health_log, "a") as fh:
            fh.write(line)
    except OSError:
        pass


# ── Main loop ──────────────────────────────────────────────────────────────────

def main():
    log.info("Hermes Active Monitor starting — HERMES_ROOT=%s", HERMES_ROOT)

    # Bootstrap hermes-api on startup if it's not running.
    # Mark it as done so the loop doesn't re-trigger it on the first cycle.
    api_pid = get_pid(API_PID_FILE)
    if not is_process_alive(api_pid) if api_pid else True:
        new_pid = start_hermes_api()
        if new_pid:
            API_PID_FILE.write_text(str(new_pid))

    poll = 30  # seconds between cycles
    while True:
        try:
            check_and_fix_scheduler()
            check_and_fix_hermes_api()
            check_and_fix_worker()
            write_heartbeat()
        except Exception as e:
            log.exception("Error in monitor loop: %s", e)

        time.sleep(poll)


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    signal.signal(signal.SIGINT, lambda *_: sys.exit(0))
    main()