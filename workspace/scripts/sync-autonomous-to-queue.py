#!/usr/bin/env python3
"""
sync-autonomous-to-queue.py
Reads PENDING tasks from AUTONOMOUS.md and injects them into workspace/tasks/queue.json
so the autonomous-worker-v2.js can pick them up and execute them.
Run via cron every 5 minutes.
"""
import json, re, os, time, hashlib
from datetime import datetime, timezone

REPO = "/Users/redinside/.openclaw"
AUTONOMOUS_MD = os.path.join(REPO, "workspace/AUTONOMOUS.md")
QUEUE_FILE = os.path.join(REPO, "workspace/tasks/queue.json")
SYNCED_LOG = os.path.join(REPO, "logs/autonomous-sync.log")

# Agent alias map: AUTONOMOUS.md agentId -> worker agentId
AGENT_MAP = {
    "eng": "ENG",
    "research": "RESEARCH",
    "ops": "OPS",
    "finance": "FINANCE",
    "infosec": "INFOSEC",
    "allrounder": "ZEN",
    "main": "main",
    "hatake": "hatake",
}

def log(msg):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    line = f"[{ts}] {msg}"
    print(line)
    with open(SYNCED_LOG, "a") as f:
        f.write(line + "\n")

def load_queue():
    try:
        with open(QUEUE_FILE) as f:
            return json.load(f)
    except Exception:
        return {"pending": [], "in_progress": [], "awaiting_approval": [], "completed": [], "failed": []}

def save_queue(q):
    with open(QUEUE_FILE, "w") as f:
        json.dump(q, f, indent=2)

def parse_autonomous_md():
    """Parse AUTONOMOUS.md and return list of PENDING tasks."""
    try:
        with open(AUTONOMOUS_MD) as f:
            content = f.read()
    except Exception as e:
        log(f"ERROR reading AUTONOMOUS.md: {e}")
        return []

    tasks = []
    # Match: **TASK-ID** | STATUS | agentId | description
    pattern = re.compile(r'\*\*([A-Z0-9\-]+)\*\*\s*\|\s*(PENDING|IN_PROGRESS|DONE)\s*\|\s*(\w+)\s*\|\s*(.+?)(?=\n\*\*|\n\n|\Z)', re.DOTALL)
    for m in pattern.finditer(content):
        task_id, status, agent, desc = m.group(1), m.group(2), m.group(3), m.group(4).strip()
        desc = re.sub(r'\s+', ' ', desc)  # normalize whitespace
        if status == "PENDING":
            tasks.append({
                "autonomous_id": task_id,
                "agent": agent,
                "description": desc,
            })
    return tasks

def make_queue_id(autonomous_id):
    return f"AUTO-{autonomous_id}"

def sync():
    pending_tasks = parse_autonomous_md()
    if not pending_tasks:
        return

    queue = load_queue()

    # Build set of existing IDs to avoid duplicates
    existing_ids = set()
    for section in ["pending", "in_progress", "awaiting_approval", "completed", "failed"]:
        for t in queue.get(section, []):
            existing_ids.add(t.get("id", ""))

    added = 0
    for task in pending_tasks:
        qid = make_queue_id(task["autonomous_id"])
        if qid in existing_ids:
            continue

        agent = task["agent"]
        assigned_to = [agent.upper(), agent.lower()]  # worker matches both

        queue_task = {
            "id": qid,
            "title": f"{task['autonomous_id']}: {task['description'][:80]}",
            "description": task["description"],
            "type": "autonomous",
            "priority": "P1",
            "assigned_to": assigned_to,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "autonomous-sync",
            "status": "pending",
            "requires_approval": False,
            "tags": ["autonomous", "from-autonomous-md"],
            "estimated_time": "2h",
            "source_id": task["autonomous_id"],
        }
        queue["pending"].append(queue_task)
        existing_ids.add(qid)
        added += 1
        log(f"Added {qid} -> {agent}: {task['description'][:60]}")

    if added > 0:
        save_queue(queue)
        log(f"Synced {added} new tasks to queue.json")
    else:
        log("No new tasks to sync")

if __name__ == "__main__":
    sync()
