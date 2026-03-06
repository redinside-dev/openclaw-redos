#!/usr/bin/env python3
"""Autonomous Task Generator - Creates work for agents"""

import json
import random
from datetime import datetime
from pathlib import Path

WORKSPACE = Path(__file__).parent
QUEUE_FILE = WORKSPACE / "tasks" / "queue.json"

TASK_TEMPLATES = {
    "ops": [
        {"title": "Check system health", "description": "Run system health check: CPU, memory, disk, services", "type": "monitoring"},
        {"title": "Review error logs", "description": "Check workspace/logs for errors in last 24h", "type": "analysis"},
        {"title": "Verify backup status", "description": "Check if backups ran successfully", "type": "verification"}
    ],
    "eng": [
        {"title": "Review code quality", "description": "Check for code smell in recent changes", "type": "code_review"},
        {"title": "Check dependencies", "description": "Review package.json for outdated deps", "type": "maintenance"}
    ],
    "research": [
        {"title": "Monitor AI developments", "description": "Check for new model releases or pricing changes", "type": "research"},
        {"title": "Analyze performance", "description": "Review agent response times and success rates", "type": "analysis"}
    ],
    "finance": [
        {"title": "Check API usage", "description": "Compare current spend to budget limits", "type": "cost_analysis"},
        {"title": "Review unused resources", "description": "Identify unused subscriptions or APIs", "type": "optimization"}
    ]
}

def load_queue():
    try:
        with open(QUEUE_FILE) as f:
            return json.load(f)
    except:
        return {"pending": [], "in_progress": [], "completed": [], "failed": []}

def save_queue(queue):
    with open(QUEUE_FILE, 'w') as f:
        json.dump(queue, f, indent=2)

def generate_task_id():
    return f"TASK-{int(datetime.now().timestamp()*1000)}-{random.randint(1000,9999)}"

def run():
    queue = load_queue()
    pending_count = len(queue.get("pending", []))
    
    if pending_count < 3:
        # Pick random agent
        agent = random.choice(list(TASK_TEMPLATES.keys()))
        template = random.choice(TASK_TEMPLATES[agent])
        
        task = {
            "id": generate_task_id(),
            "title": template["title"],
            "description": template["description"],
            "type": template["type"],
            "priority": "P2",
            "assigned_to": [agent.upper()],
            "created_at": datetime.now().isoformat() + "Z",
            "created_by": "autonomous-generator",
            "status": "pending",
            "requires_approval": False,
            "tags": ["autonomous"],
            "estimated_time": "30m"
        }
        
        queue.setdefault("pending", []).append(task)
        save_queue(queue)
        print(f"Created task for {agent}: {template['title']}")
    else:
        print(f"Queue has {pending_count} pending - enough work")

if __name__ == "__main__":
    run()
