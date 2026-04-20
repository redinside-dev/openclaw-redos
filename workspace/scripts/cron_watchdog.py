#!/usr/bin/env python3

"""Cron watchdog for OpenClaw.

Goal:
- Detect missed cron runs (job nextRunAtMs in the past by more than grace)
- Detect repeated failures (lastStatus != ok)
- Avoid alert spam via state file

Inputs:
- ~/.openclaw/cron/jobs.json
- ~/.openclaw/cron/runs/<jobId>.jsonl (optional)

Output:
- prints Telegram-friendly alert text ONLY when action needed.
- prints NO_ALERT when everything looks fine.

Notes:
- We intentionally do not attempt to compute next run from cron expr; we rely on job.state.nextRunAtMs.
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

JOBS_JSON = Path(os.path.expanduser("~/.openclaw/cron/jobs.json"))
RUNS_DIR = Path(os.path.expanduser("~/.openclaw/cron/runs"))
STATE_PATH = Path("/Users/redinside/.openclaw/workspace/tmp/cron-watchdog-state.json")

# Default grace: how late can a run be before we alert?
GRACE_SECONDS = 7 * 60  # 7 minutes

# Only alert for enabled jobs


@dataclass
class JobHealth:
    job_id: str
    name: str
    enabled: bool
    next_run_at_ms: Optional[int]
    last_run_at_ms: Optional[int]
    last_status: Optional[str]
    last_duration_ms: Optional[int]


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def parse_jobs() -> List[JobHealth]:
    data = load_json(JOBS_JSON, {})
    jobs = data.get("jobs", []) if isinstance(data, dict) else []
    out: List[JobHealth] = []
    for j in jobs:
        if not isinstance(j, dict):
            continue
        st = j.get("state", {}) if isinstance(j.get("state"), dict) else {}
        out.append(
            JobHealth(
                job_id=str(j.get("id")),
                name=str(j.get("name") or "(unnamed)"),
                enabled=bool(j.get("enabled", True)),
                next_run_at_ms=st.get("nextRunAtMs"),
                last_run_at_ms=st.get("lastRunAtMs"),
                last_status=st.get("lastStatus"),
                last_duration_ms=st.get("lastDurationMs"),
            )
        )
    return out


def ms_to_local(ms: Optional[int]) -> str:
    if not ms:
        return "—"
    # local time
    import datetime as dt

    return dt.datetime.fromtimestamp(ms / 1000.0).strftime("%Y-%m-%d %H:%M:%S")


def main() -> None:
    now_ms = int(time.time() * 1000)
    state = load_json(STATE_PATH, {"lastAlert": {}})
    last_alert: Dict[str, Dict[str, Any]] = state.get("lastAlert", {}) if isinstance(state, dict) else {}

    jobs = [j for j in parse_jobs() if j.enabled]

    problems: List[Tuple[str, str]] = []  # (job_id, message)

    for j in jobs:
        # Missed next run
        if j.next_run_at_ms is not None and now_ms > j.next_run_at_ms + (GRACE_SECONDS * 1000):
            problems.append(
                (
                    j.job_id,
                    f"MISS: **{j.name}** (`{j.job_id}`)\n"
                    f"- nextRun was: {ms_to_local(j.next_run_at_ms)}\n"
                    f"- lastRun: {ms_to_local(j.last_run_at_ms)} (status={j.last_status or '—'})",
                )
            )
            continue

        # Last status not ok
        if j.last_status and j.last_status != "ok":
            problems.append(
                (
                    j.job_id,
                    f"FAIL: **{j.name}** (`{j.job_id}`)\n"
                    f"- lastRun: {ms_to_local(j.last_run_at_ms)} (status={j.last_status})",
                )
            )

    # Dedup / rate-limit alerts
    to_alert: List[str] = []
    for job_id, msg in problems:
        prev = last_alert.get(job_id, {})
        prev_sig = prev.get("sig")
        sig = msg  # simple signature
        prev_ts = int(prev.get("ts", 0) or 0)
        # alert if changed or older than 2h
        if sig != prev_sig or (now_ms - prev_ts) > 2 * 60 * 60 * 1000:
            to_alert.append(msg)
            last_alert[job_id] = {"ts": now_ms, "sig": sig}

    if not to_alert:
        print("NO_ALERT")
        return

    state["lastAlert"] = last_alert
    save_json(STATE_PATH, state)

    lines: List[str] = []
    lines.append("CRON WATCHDOG")
    lines.append("Action needed:")
    for m in to_alert[:10]:
        lines.append("- " + m.replace("\n", "\n  "))
    if len(to_alert) > 10:
        lines.append(f"- (+{len(to_alert)-10} more)")

    lines.append("\nSuggested next step: run `openclaw cron status` or `openclaw logs --follow`.")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
