#!/usr/bin/env python3
"""
Queue-based Cron Replacement
Submits jobs to queues instead of directly executing agents.
This prevents deadlocks because each agent processes one job at a time.
"""

import subprocess
import json
from pathlib import Path
from datetime import datetime

WORKSPACE = Path(__file__).parent.parent
JOB_QUEUE = WORKSPACE / "scripts" / "job-queue.py"

# Define jobs - each with agent and task
# These replace the cron jobs that were causing deadlocks
JOBS = [
    # Task Injector - generates work
    {
        "name": "task-injector",
        "agent": "main",
        "task": """Read workspace/AUTONOMOUS.md. Count PENDING tasks. If any PENDING: (1) Pick highest priority, (2) Update to IN_PROGRESS, (3) Submit job to queue: python3 ~/.openclaw/workspace/scripts/job-queue.py submit <agent_id> "<task>" <priority>"""
    },
    # Health checks
    {
        "name": "ops-health",
        "agent": "ops",
        "task": "Run system health check: check gateway status, cron jobs, disk space, memory. Return brief status report."
    },
    # Research trends
    {
        "name": "research-trends",
        "agent": "research",
        "task": "Search for AI agents trends. Check HN, Reddit. Return top 3 opportunities."
    },
    # ENG code review
    {
        "name": "eng-code-review",
        "agent": "eng",
        "task": "Check workspace/projects/backlog.md. If READY project exists, submit implementation job to eng queue."
    },
]

def submit_job(agent: str, task: str, priority: str = "normal"):
    """Submit job to queue"""
    result = subprocess.run(
        ["python3", str(JOB_QUEUE), "submit", agent, task, priority],
        capture_output=True,
        text=True
    )
    return result.returncode == 0

def run_all_jobs():
    """Run all queue-based jobs"""
    print(f"[{datetime.now().isoformat()}] Running queue cron jobs...")

    for job in JOBS:
        success = submit_job(job["agent"], job["task"], "normal")
        status = "✓" if success else "✗"
        print(f"  {status} Submitted to {job['agent']}: {job['name']}")

    print("Done")

if __name__ == "__main__":
    run_all_jobs()
