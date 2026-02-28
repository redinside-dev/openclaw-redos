#!/usr/bin/env python3
"""seed-episodes.py — Seed episodes.jsonl from cron job run state.

Reads cron/jobs.json, extracts the last-run outcome for each job,
and appends one episode entry per job to workspace/logs/episodes.jsonl.

Run manually: python3 ~/.openclaw/workspace/scripts/seed-episodes.py
Cron: runs as part of OPS inner loop or standalone every 15min.
"""

import json
import pathlib
import time

OPENCLAW = pathlib.Path.home() / ".openclaw"
CRON_PATH = OPENCLAW / "cron/jobs.json"
EPISODES_PATH = OPENCLAW / "workspace/logs/episodes.jsonl"

EPISODES_PATH.parent.mkdir(parents=True, exist_ok=True)

data = json.loads(CRON_PATH.read_text())
jobs = data.get("jobs", [])
now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

written = 0
with open(EPISODES_PATH, "a") as f:
    for job in jobs:
        state = job.get("state", {})
        last_status = state.get("lastStatus")
        if not last_status:
            continue
        last_run_ms = state.get("lastRunAtMs") or state.get("lastRunMs")
        last_run_iso = (
            time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(last_run_ms / 1000))
            if last_run_ms
            else now_iso
        )
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
        written += 1

print(f"Seeded {written} episodes from {len(jobs)} cron jobs → {EPISODES_PATH}")
