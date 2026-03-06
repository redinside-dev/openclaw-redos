#!/usr/bin/env python3
"""
Queue Worker - Processes jobs from agent queues
Run one worker per agent to prevent deadlocks.
Usage: python3 queue-worker.py <agent_id>
"""

import subprocess
import sys
import time
import json
from pathlib import Path
from datetime import datetime

SCRIPT_DIR = Path(__file__).parent
JOB_QUEUE = SCRIPT_DIR / "job-queue.py"
WORKSPACE = SCRIPT_DIR.parent

def run_agent(agent_id: str, task: str) -> tuple[bool, str]:
    """Execute agent task via OpenClaw"""
    try:
        result = subprocess.run(
            ["openclaw", "agent", "--agent", agent_id, "--message", task],
            capture_output=True,
            text=True,
            timeout=600,  # 10 min max
            cwd=WORKSPACE
        )

        if result.returncode == 0:
            return True, result.stdout
        else:
            return False, result.stderr
    except subprocess.TimeoutExpired:
        return False, "Timeout after 10 minutes"
    except Exception as e:
        return False, str(e)

def process_queue(agent_id: str):
    """Process next job in queue"""
    # Get next job
    result = subprocess.run(
        ["python3", str(JOB_QUEUE), "next", agent_id],
        capture_output=True,
        text=True
    )

    if result.returncode != 0 or "No jobs" in result.stdout:
        return False  # No job

    try:
        job = json.loads(result.stdout)
    except:
        return False

    print(f"[{agent_id}] Processing: {job.get('task', 'unknown')[:50]}...")

    # Execute
    success, output = run_agent(agent_id, job['task'])

    # Mark complete or fail
    if success:
        subprocess.run(
            ["python3", str(JOB_QUEUE), "complete", agent_id, job['job_id']],
            capture_output=True
        )
        print(f"[{agent_id}] ✓ Completed: {job['job_id']}")
    else:
        subprocess.run(
            ["python3", str(JOB_QUEUE), "fail", agent_id, job['job_id'], output[:200]],
            capture_output=True
        )
        print(f"[{agent_id}] ✗ Failed: {job['job_id']} - {output[:100]}")

    return True

def main():
    if len(sys.argv) < 2:
        print("Usage: queue-worker.py <agent_id>")
        print("Example: python3 queue-worker.py eng")
        sys.exit(1)

    agent_id = sys.argv[1]
    print(f"Starting worker for {agent_id}...")

    while True:
        try:
            processed = process_queue(agent_id)
            if not processed:
                time.sleep(10)  # Wait 10s if no job
        except KeyboardInterrupt:
            print(f"Worker {agent_id} stopped")
            break
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(30)

if __name__ == "__main__":
    main()
