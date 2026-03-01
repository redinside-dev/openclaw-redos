#!/usr/bin/env python3
"""seed-episodes.py - Seed episodes.jsonl from cron job run state.

Reads cron/jobs.json, extracts the last-run outcome for each job,
and appends one episode entry per newly observed run to workspace/logs/episodes.jsonl.
Uses a small state file so repeat invocations do not duplicate older runs.

Run manually: python3 ~/.openclaw/workspace/scripts/seed-episodes.py
Cron: runs as part of OPS inner loop or standalone every 15min.
"""

import json
import pathlib
import time

OPENCLAW = pathlib.Path.home() / ".openclaw"
CRON_PATH = OPENCLAW / "cron/jobs.json"
EPISODES_PATH = OPENCLAW / "workspace/logs/episodes.jsonl"
STATE_PATH = OPENCLAW / "workspace/tmp/seed-episodes-state.json"

EPISODES_PATH.parent.mkdir(parents=True, exist_ok=True)
STATE_PATH.parent.mkdir(parents=True, exist_ok=True)

data = json.loads(CRON_PATH.read_text())
jobs = data.get("jobs", [])
now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

if STATE_PATH.exists():
    seed_state = json.loads(STATE_PATH.read_text())
else:
    seed_state = {"jobs": {}}

job_state = seed_state.setdefault("jobs", {})

written = 0
with open(EPISODES_PATH, "a") as f:
    for job in jobs:
        state = job.get("state", {})
        last_status = state.get("lastStatus")
        if not last_status:
            continue

        job_id = str(job.get("id") or "")
        if not job_id:
            continue

        last_run_ms = state.get("lastRunAtMs") or state.get("lastRunMs")
        last_run_iso = (
            time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(last_run_ms / 1000))
            if last_run_ms
            else now_iso
        )

        prev = job_state.get(job_id, {})
        prev_ms = prev.get("lastRunMs")
        prev_iso = prev.get("lastRunIso")

        # Skip if we already seeded this run (or a newer one) for the same job.
        if prev_ms is not None and last_run_ms is not None and last_run_ms <= prev_ms:
            continue
        if prev_ms is None and prev_iso and last_run_iso <= prev_iso:
            continue

        error_msg = None
        if last_status != "ok":
            err = state.get("lastError") or {}
            error_msg = err.get("message") if isinstance(err, dict) else str(err)

        episode = {
            "ts": last_run_iso,
            "seeded_at": now_iso,
            "agentId": job.get("agentId"),
            "taskId": job.get("id"),
            "taskName": job.get("name"),
            "outcome": "ok" if last_status == "ok" else "failed",
            "error_type": error_msg,
            "source": "cron-seed",
        }
        f.write(json.dumps(episode) + "\n")

        job_state[job_id] = {
            "lastRunMs": last_run_ms,
            "lastRunIso": last_run_iso,
            "lastStatus": last_status,
        }
        written += 1

STATE_PATH.write_text(json.dumps(seed_state, indent=2) + "\n")

print(f"Seeded {written} episodes from {len(jobs)} cron jobs -> {EPISODES_PATH}")
