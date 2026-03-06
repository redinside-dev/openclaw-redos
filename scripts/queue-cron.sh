#!/bin/bash
# Queue Cron - Submits jobs to queue instead of direct execution
# Runs every 5 minutes to check if agents have work

QUEUE_SCRIPT="$HOME/.openclaw/workspace/scripts/job-queue.py"
AUTONOMOUS="$HOME/.openclaw/workspace/AUTONOMOUS.md"

echo "[$(date)] Queue cron check..."

# Read AUTONOMOUS.md for PENDING tasks and submit to queues
python3 << 'EOF'
import subprocess
import re
from pathlib import Path

AUTONOMOUS = Path("$HOME/.openclaw/workspace/AUTONOMOUS.md")
QUEUE = "$HOME/.openclaw/workspace/scripts/job-queue.py"

# Read AUTONOMOUS.md
content = AUTONOMOUS.read_text()

# Find PENDING tasks and their agents
import re
pending = re.findall(r'\| (AUTO-\d+) \| ([^|]+) \| ([^|]+) \|.*?\| (PENDING|IN_PROGRESS)', content)

print(f"Found {len(pending)} pending tasks")

for task_id, task, agent, status in pending:
    if status == "PENDING" and agent.strip() in ["eng", "ops", "research", "main", "finance", "infosec", "allrounder", "hatake"]:
        agent = agent.strip()
        print(f"  Submitting to {agent}: {task[:50]}...")
        subprocess.run(["python3", QUEUE, "submit", agent, f"{task_id}: {task}", "normal"])
EOF

echo "Done"
