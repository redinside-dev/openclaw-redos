#!/usr/bin/env python3
"""
Autonomous Task Management System
Manages task queue and autonomous execution
"""

import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Paths
TASKS_DIR = Path(__file__).parent
QUEUE_FILE = TASKS_DIR / "queue.json"
COMPLETED_DIR = TASKS_DIR / "completed"
FAILED_DIR = TASKS_DIR / "failed"

# Ensure directories exist
COMPLETED_DIR.mkdir(parents=True, exist_ok=True)
FAILED_DIR.mkdir(parents=True, exist_ok=True)


class TaskManager:
    def __init__(self):
        self.queue = self.load_queue()

    def load_queue(self) -> Dict:
        """Load task queue from file"""
        if QUEUE_FILE.exists():
            with open(QUEUE_FILE) as f:
                return json.load(f)
        return {
            "pending": [],
            "in_progress": [],
            "awaiting_approval": [],
            "completed": []
        }

    def save_queue(self):
        """Save task queue to file"""
        with open(QUEUE_FILE, 'w') as f:
            json.dump(self.queue, f, indent=2)

    def create_task(self, task: Dict) -> str:
        """Create new task"""
        task_id = f"TASK-{int(time.time() * 1000)}"
        task["id"] = task_id
        task["created_at"] = datetime.now().isoformat()
        task["status"] = "pending"
        task["autonomous"] = task.get("autonomous", True)

        self.queue["pending"].append(task)
        self.save_queue()

        print(f"✅ Task created: {task_id} - {task['title']}")
        return task_id

    def claim_task(self, task_id: str, agent: str) -> bool:
        """Agent claims a pending task"""
        task = self.find_task(task_id, "pending")
        if not task:
            return False

        task["claimed_by"] = agent
        task["claimed_at"] = datetime.now().isoformat()
        task["status"] = "in_progress"

        # Move to in_progress
        self.queue["pending"] = [t for t in self.queue["pending"] if t["id"] != task_id]
        self.queue["in_progress"].append(task)
        self.save_queue()

        print(f"🔵 Task claimed: {task_id} by {agent}")
        return True

    def complete_task(self, task_id: str, outcome: Dict):
        """Mark task as completed"""
        task = self.find_task(task_id, "in_progress")
        if not task:
            task = self.find_task(task_id, "awaiting_approval")
        if not task:
            return False

        task["completed_at"] = datetime.now().isoformat()
        task["outcome"] = outcome
        task["status"] = "completed"

        # Move to completed
        self.queue["in_progress"] = [t for t in self.queue["in_progress"] if t["id"] != task_id]
        self.queue["awaiting_approval"] = [t for t in self.queue["awaiting_approval"] if t["id"] != task_id]
        self.queue["completed"].append(task)

        # Archive to file
        self.archive_task(task, "completed")
        self.save_queue()

        print(f"✅ Task completed: {task_id}")
        return True

    def fail_task(self, task_id: str, reason: str):
        """Mark task as failed"""
        task = self.find_task(task_id, "in_progress")
        if not task:
            return False

        task["failed_at"] = datetime.now().isoformat()
        task["failure_reason"] = reason
        task["status"] = "failed"

        # Archive to failed directory
        self.archive_task(task, "failed")

        # Remove from in_progress
        self.queue["in_progress"] = [t for t in self.queue["in_progress"] if t["id"] != task_id]
        self.save_queue()

        print(f"❌ Task failed: {task_id} - {reason}")
        return True

    def find_task(self, task_id: str, queue_name: Optional[str] = None) -> Optional[Dict]:
        """Find task in queue(s)"""
        if queue_name:
            return next((t for t in self.queue[queue_name] if t["id"] == task_id), None)

        for queue_list in self.queue.values():
            task = next((t for t in queue_list if t["id"] == task_id), None)
            if task:
                return task
        return None

    def archive_task(self, task: Dict, status: str):
        """Archive completed/failed task to file"""
        date_str = datetime.now().strftime("%Y-%m-%d")
        archive_dir = COMPLETED_DIR if status == "completed" else FAILED_DIR
        archive_file = archive_dir / f"{date_str}.json"

        # Load existing archive
        if archive_file.exists():
            with open(archive_file) as f:
                archive = json.load(f)
        else:
            archive = []

        archive.append(task)

        with open(archive_file, 'w') as f:
            json.dump(archive, f, indent=2)

    def get_available_tasks(self, agent: str) -> List[Dict]:
        """Get tasks available for agent to claim"""
        available = []
        for task in self.queue["pending"]:
            # Check if agent can do this task
            if self.can_agent_do_task(agent, task):
                available.append(task)
        return available

    @staticmethod
    def can_agent_do_task(agent: str, task: Dict) -> bool:
        """Check if agent can execute this task"""
        # Simple domain matching
        task_type = task.get("type", "")
        agent_domains = {
            "main": ["general", "strategy", "coordination"],
            "allrounder": ["research", "search", "intelligence"],
            "research": ["research", "analysis", "intelligence"],
            "eng": ["code", "technical", "implementation"],
            "finance": ["budget", "finance", "cost"],
            "ops": ["deployment", "testing", "infrastructure"],
            "infosec": ["security", "access", "compliance"]
        }

        agent_can_do = agent_domains.get(agent, [])
        return any(domain in task_type for domain in agent_can_do)

    def request_approval(self, task_id: str) -> bool:
        """Move task to awaiting approval queue"""
        task = self.find_task(task_id, "in_progress")
        if not task:
            return False

        task["approval_requested_at"] = datetime.now().isoformat()
        task["status"] = "awaiting_approval"

        # Move to awaiting_approval
        self.queue["in_progress"] = [t for t in self.queue["in_progress"] if t["id"] != task_id]
        self.queue["awaiting_approval"].append(task)
        self.save_queue()

        print(f"⏸ Task awaiting approval: {task_id}")
        return True

    def approve_task(self, task_id: str) -> bool:
        """Approve awaiting task, move back to in_progress"""
        task = self.find_task(task_id, "awaiting_approval")
        if not task:
            return False

        task["approved_at"] = datetime.now().isoformat()
        task["status"] = "in_progress"

        # Move back to in_progress
        self.queue["awaiting_approval"] = [t for t in self.queue["awaiting_approval"] if t["id"] != task_id]
        self.queue["in_progress"].append(task)
        self.save_queue()

        print(f"✅ Task approved: {task_id}")
        return True

    def get_stats(self) -> Dict:
        """Get task queue statistics"""
        return {
            "pending": len(self.queue["pending"]),
            "in_progress": len(self.queue["in_progress"]),
            "awaiting_approval": len(self.queue["awaiting_approval"]),
            "completed_today": len(self.queue["completed"])
        }


# CLI interface
if __name__ == "__main__":
    import sys

    tm = TaskManager()

    if len(sys.argv) < 2:
        print("Usage: task_manager.py [command] [args...]")
        sys.exit(1)

    command = sys.argv[1]

    if command == "create":
        # Example: create '{"title": "Update deps", "type": "code", ...}'
        task = json.loads(sys.argv[2])
        task_id = tm.create_task(task)
        print(f"Created: {task_id}")

    elif command == "claim":
        task_id = sys.argv[2]
        agent = sys.argv[3]
        result = tm.claim_task(task_id, agent)
        print(f"Claimed: {result}")

    elif command == "complete":
        task_id = sys.argv[2]
        outcome = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
        result = tm.complete_task(task_id, outcome)
        print(f"Completed: {result}")

    elif command == "fail":
        task_id = sys.argv[2]
        reason = sys.argv[3]
        result = tm.fail_task(task_id, reason)
        print(f"Failed: {result}")

    elif command == "list":
        queue_name = sys.argv[2] if len(sys.argv) > 2 else "pending"
        print(json.dumps(tm.queue[queue_name], indent=2))

    elif command == "stats":
        print(json.dumps(tm.get_stats(), indent=2))

    elif command == "available":
        agent = sys.argv[2]
        tasks = tm.get_available_tasks(agent)
        print(json.dumps(tasks, indent=2))

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
