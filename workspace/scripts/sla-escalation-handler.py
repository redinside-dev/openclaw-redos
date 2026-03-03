#!/usr/bin/env python3
"""
SLA Breach Auto-Escalation Handler

Monitors AUTONOMOUS.md for tasks approaching or breaching SLA deadlines.
Auto-escalates with context and suggested fixes.

Escalation stages:
1. Warning (80% of SLA elapsed): Notify owner
2. Breach (100% of SLA elapsed): Escalate to RED with context + suggested fix
3. Critical (150% of SLA elapsed): Emergency escalation with blocker analysis

Run every 15 minutes via cron.
"""

import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

AUTONOMOUS_FILE = Path.home() / ".openclaw/workspace/AUTONOMOUS.md"
STATE_FILE = Path.home() / ".openclaw/workspace/tmp/sla-escalation-state.json"
TASKS_LOG = Path.home() / ".openclaw/workspace/tasks-log.md"


def load_state() -> Dict:
    """Load escalation state."""
    if not STATE_FILE.exists():
        return {"warned": {}, "escalated": {}, "critical": {}}
    try:
        return json.loads(STATE_FILE.read_text())
    except Exception:
        return {"warned": {}, "escalated": {}, "critical": {}}


def save_state(state: Dict) -> None:
    """Save escalation state."""
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2))


def parse_deadline(deadline_str: str) -> Optional[datetime]:
    """Parse deadline string to datetime."""
    # Format: YYYY-MM-DD HH:MM TZ or ISO format
    patterns = [
        r"(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+(\w+)",  # 2026-03-04 23:59 EST
        r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})",  # ISO format
    ]
    
    for pattern in patterns:
        match = re.search(pattern, deadline_str)
        if match:
            try:
                if len(match.groups()) == 3:
                    date_str, time_str, tz = match.groups()
                    dt_str = f"{date_str} {time_str}"
                    dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
                    # Assume EST/EDT for now (TODO: proper timezone handling)
                    return dt.replace(tzinfo=timezone.utc)
                else:
                    dt_str = match.group(1)
                    return datetime.fromisoformat(dt_str).replace(tzinfo=timezone.utc)
            except Exception:
                continue
    return None


def parse_autonomous_tasks() -> List[Dict]:
    """Parse AUTONOMOUS.md for active tasks with deadlines."""
    if not AUTONOMOUS_FILE.exists():
        return []
    
    content = AUTONOMOUS_FILE.read_text()
    tasks = []
    
    # Parse markdown table rows
    for line in content.split("\n"):
        if "|" not in line or line.startswith("|---"):
            continue
        
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 6:
            continue
        
        task_id = parts[1]
        priority = parts[2]
        agent = parts[3]
        description = parts[4]
        status = parts[5]
        
        # Only process PENDING or IN_PROGRESS tasks
        if not any(s in status for s in ["PENDING", "IN_PROGRESS"]):
            continue
        
        # Extract deadline from description or status
        deadline_str = description + " " + status
        deadline = parse_deadline(deadline_str)
        
        if deadline:
            tasks.append({
                "task_id": task_id,
                "priority": priority,
                "agent": agent,
                "description": description,
                "status": status,
                "deadline": deadline
            })
    
    return tasks


def suggest_fix(task: Dict, sla_pct: float) -> str:
    """Generate suggested fix based on task context."""
    suggestions = []
    
    # Priority-based suggestions
    if task["priority"] == "P0":
        suggestions.append("P0 task - consider spawning dedicated sub-agent")
    
    # Agent-based suggestions
    if task["agent"] == "—":
        suggestions.append("Unassigned - trigger autonomous-task-dispatcher-0001")
    elif "IN_PROGRESS" in task["status"]:
        suggestions.append(f"Nudge {task['agent']} via sessions_send")
        if sla_pct > 120:
            suggestions.append(f"Consider reassigning from {task['agent']}")
    
    # Description-based suggestions
    desc_lower = task["description"].lower()
    if "blocked" in desc_lower or "waiting" in desc_lower:
        suggestions.append("Task blocked - identify and resolve dependency")
    if "review" in desc_lower or "approval" in desc_lower:
        suggestions.append("Approval needed - check workspace/approvals/pending/")
    if "fix" in desc_lower or "bug" in desc_lower:
        suggestions.append("Bug fix - check recent error logs for context")
    
    return " | ".join(suggestions) if suggestions else "Manual review required"


def send_escalation(task: Dict, stage: str, sla_pct: float, suggested_fix: str) -> bool:
    """Send escalation message via sessions_send."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    
    if stage == "warning":
        message = (
            f"⚠️ SLA WARNING: {task['task_id']}\n"
            f"Deadline: {task['deadline'].strftime('%Y-%m-%d %H:%M')}\n"
            f"Progress: {sla_pct:.0f}% of time elapsed\n"
            f"Status: {task['status']}\n"
            f"Suggested action: {suggested_fix}"
        )
        target = task["agent"] if task["agent"] != "—" else "main"
    elif stage == "breach":
        message = (
            f"🔴 SLA BREACH: {task['task_id']}\n"
            f"Deadline: {task['deadline'].strftime('%Y-%m-%d %H:%M')} (PASSED)\n"
            f"Overdue by: {sla_pct - 100:.0f}%\n"
            f"Priority: {task['priority']}\n"
            f"Owner: {task['agent']}\n"
            f"Description: {task['description'][:100]}\n\n"
            f"Suggested fix: {suggested_fix}\n\n"
            f"Escalating to RED for immediate action."
        )
        target = "main"
    else:  # critical
        message = (
            f"🚨 CRITICAL SLA BREACH: {task['task_id']}\n"
            f"Deadline: {task['deadline'].strftime('%Y-%m-%d %H:%M')} (SEVERELY OVERDUE)\n"
            f"Overdue by: {sla_pct - 100:.0f}%\n"
            f"Priority: {task['priority']}\n"
            f"Owner: {task['agent']}\n\n"
            f"EMERGENCY ESCALATION - This task is blocking system operations.\n"
            f"Suggested fix: {suggested_fix}\n\n"
            f"Consider: Force resolution, reassignment, or task cancellation."
        )
        target = "main"
    
    try:
        result = subprocess.run(
            ["openclaw", "sessions", "send", "--agent", target, "--message", message],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.returncode == 0
    except Exception:
        return False


def main():
    now = datetime.now(timezone.utc)
    state = load_state()
    
    tasks = parse_autonomous_tasks()
    escalations = []
    
    for task in tasks:
        task_id = task["task_id"]
        deadline = task["deadline"]
        
        # Calculate SLA percentage
        # Assume task was created 48h before deadline (default)
        task_duration = 48 * 3600  # 48 hours in seconds
        time_to_deadline = (deadline - now).total_seconds()
        elapsed = task_duration - time_to_deadline
        sla_pct = (elapsed / task_duration) * 100
        
        suggested_fix = suggest_fix(task, sla_pct)
        
        # Stage 1: Warning at 80%
        if sla_pct >= 80 and sla_pct < 100:
            if task_id not in state["warned"]:
                if send_escalation(task, "warning", sla_pct, suggested_fix):
                    state["warned"][task_id] = now.isoformat()
                    escalations.append(f"⚠️ Warned: {task_id} ({sla_pct:.0f}% elapsed)")
        
        # Stage 2: Breach at 100%
        elif sla_pct >= 100 and sla_pct < 150:
            if task_id not in state["escalated"]:
                if send_escalation(task, "breach", sla_pct, suggested_fix):
                    state["escalated"][task_id] = now.isoformat()
                    escalations.append(f"🔴 Escalated: {task_id} (BREACH: {sla_pct:.0f}%)")
        
        # Stage 3: Critical at 150%
        elif sla_pct >= 150:
            if task_id not in state["critical"]:
                if send_escalation(task, "critical", sla_pct, suggested_fix):
                    state["critical"][task_id] = now.isoformat()
                    escalations.append(f"🚨 CRITICAL: {task_id} (SEVERE: {sla_pct:.0f}%)")
    
    if escalations:
        save_state(state)
        print("SLA ESCALATIONS:")
        for e in escalations:
            print(f"  {e}")
    else:
        print("NO_ALERT")


if __name__ == "__main__":
    main()
