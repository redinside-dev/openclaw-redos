#!/usr/bin/env python3
"""
Dependency Blocker - Prevents downstream tasks from running if upstream fails

Reads dependency chains from AUTONOMOUS.md and blocks execution of dependent tasks
when their prerequisites fail or are blocked.

Dependency syntax in AUTONOMOUS.md:
- "depends_on: TASK-ID" in task description
- "blocked_by: TASK-ID" in status field

Run before task dispatch to validate dependencies.
"""

import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Set

AUTONOMOUS_FILE = Path.home() / ".openclaw/workspace/AUTONOMOUS.md"
DEPENDENCY_STATE = Path.home() / ".openclaw/workspace/tmp/dependency-blocker-state.json"


def load_state() -> Dict:
    """Load dependency blocker state."""
    if not DEPENDENCY_STATE.exists():
        return {"blocked_tasks": {}, "failed_upstream": {}}
    try:
        return json.loads(DEPENDENCY_STATE.read_text())
    except Exception:
        return {"blocked_tasks": {}, "failed_upstream": {}}


def save_state(state: Dict) -> None:
    """Save dependency blocker state."""
    DEPENDENCY_STATE.parent.mkdir(parents=True, exist_ok=True)
    DEPENDENCY_STATE.write_text(json.dumps(state, indent=2))


def parse_tasks() -> Dict[str, Dict]:
    """Parse all tasks from AUTONOMOUS.md."""
    if not AUTONOMOUS_FILE.exists():
        return {}
    
    content = AUTONOMOUS_FILE.read_text()
    tasks = {}
    
    for line in content.split("\n"):
        if "|" not in line or line.startswith("|---"):
            continue
        
        parts = [p.strip() for p in line.split("|")]
        if len(parts) < 6:
            continue
        
        task_id = parts[1]
        if not task_id or task_id == "Task ID":
            continue
        
        priority = parts[2]
        agent = parts[3]
        description = parts[4]
        status = parts[5]
        
        # Extract dependencies
        depends_on = []
        
        # Check description for "depends_on: TASK-ID"
        dep_match = re.findall(r'depends_on:\s*([A-Z0-9-]+)', description, re.IGNORECASE)
        depends_on.extend(dep_match)
        
        # Check status for "blocked_by: TASK-ID"
        blocked_match = re.findall(r'blocked_by:\s*([A-Z0-9-]+)', status, re.IGNORECASE)
        depends_on.extend(blocked_match)
        
        tasks[task_id] = {
            "priority": priority,
            "agent": agent,
            "description": description,
            "status": status,
            "depends_on": list(set(depends_on))  # deduplicate
        }
    
    return tasks


def get_task_status(task: Dict) -> str:
    """Extract status from task."""
    status = task["status"].upper()
    if "DONE" in status or "COMPLETE" in status:
        return "DONE"
    elif "FAILED" in status or "ERROR" in status or "CANCELLED" in status:
        return "FAILED"
    elif "IN_PROGRESS" in status:
        return "IN_PROGRESS"
    elif "BLOCKED" in status:
        return "BLOCKED"
    elif "PENDING" in status:
        return "PENDING"
    else:
        return "UNKNOWN"


def check_dependencies(task_id: str, tasks: Dict[str, Dict], state: Dict) -> tuple[bool, List[str]]:
    """
    Check if task can run based on dependencies.
    Returns (can_run, blocking_reasons)
    """
    if task_id not in tasks:
        return True, []
    
    task = tasks[task_id]
    depends_on = task["depends_on"]
    
    if not depends_on:
        return True, []
    
    blocking_reasons = []
    
    for dep_id in depends_on:
        if dep_id not in tasks:
            blocking_reasons.append(f"Dependency {dep_id} not found in AUTONOMOUS.md")
            continue
        
        dep_task = tasks[dep_id]
        dep_status = get_task_status(dep_task)
        
        if dep_status == "FAILED":
            blocking_reasons.append(f"Upstream task {dep_id} FAILED")
            state["failed_upstream"][task_id] = dep_id
        elif dep_status == "BLOCKED":
            blocking_reasons.append(f"Upstream task {dep_id} is BLOCKED")
        elif dep_status in ["PENDING", "IN_PROGRESS"]:
            blocking_reasons.append(f"Upstream task {dep_id} not complete (status: {dep_status})")
        elif dep_status == "DONE":
            # Dependency satisfied
            continue
        else:
            blocking_reasons.append(f"Upstream task {dep_id} has unknown status: {dep_status}")
    
    can_run = len(blocking_reasons) == 0
    
    if not can_run:
        state["blocked_tasks"][task_id] = {
            "blocked_by": depends_on,
            "reasons": blocking_reasons
        }
    elif task_id in state["blocked_tasks"]:
        # Unblock if dependencies now satisfied
        del state["blocked_tasks"][task_id]
    
    return can_run, blocking_reasons


def block_task_in_autonomous(task_id: str, reasons: List[str]) -> bool:
    """Update AUTONOMOUS.md to mark task as BLOCKED."""
    if not AUTONOMOUS_FILE.exists():
        return False
    
    content = AUTONOMOUS_FILE.read_text()
    lines = content.split("\n")
    
    for i, line in enumerate(lines):
        if f"| {task_id} |" in line:
            # Update status to BLOCKED
            parts = line.split("|")
            if len(parts) >= 6:
                # Preserve existing status info but prepend BLOCKED
                existing_status = parts[5].strip()
                blocked_reason = reasons[0] if reasons else "Dependency not met"
                new_status = f"BLOCKED ({blocked_reason})"
                parts[5] = f" {new_status} "
                lines[i] = "|".join(parts)
                
                AUTONOMOUS_FILE.write_text("\n".join(lines))
                return True
    
    return False


def main():
    """Main dependency blocker logic."""
    # Check if a specific task was provided
    if len(sys.argv) > 1:
        task_id = sys.argv[1]
        check_mode = "single"
    else:
        task_id = None
        check_mode = "all"
    
    state = load_state()
    tasks = parse_tasks()
    
    if check_mode == "single" and task_id:
        # Check single task (used before dispatch)
        can_run, reasons = check_dependencies(task_id, tasks, state)
        
        if not can_run:
            print(f"BLOCKED: {task_id}")
            print(f"Reasons:")
            for r in reasons:
                print(f"  - {r}")
            save_state(state)
            sys.exit(1)
        else:
            print(f"OK: {task_id} can run")
            save_state(state)
            sys.exit(0)
    
    else:
        # Check all tasks and update AUTONOMOUS.md
        blocked_count = 0
        unblocked_count = 0
        
        for task_id, task in tasks.items():
            current_status = get_task_status(task)
            
            # Only check PENDING or IN_PROGRESS tasks
            if current_status not in ["PENDING", "IN_PROGRESS"]:
                continue
            
            can_run, reasons = check_dependencies(task_id, tasks, state)
            
            if not can_run:
                # Block the task
                if block_task_in_autonomous(task_id, reasons):
                    blocked_count += 1
                    print(f"🔒 BLOCKED: {task_id}")
                    for r in reasons:
                        print(f"    {r}")
            else:
                # Task can run
                if task_id in state["blocked_tasks"]:
                    unblocked_count += 1
                    print(f"✓ UNBLOCKED: {task_id} (dependencies now satisfied)")
        
        save_state(state)
        
        if blocked_count > 0 or unblocked_count > 0:
            print(f"\nSummary: {blocked_count} blocked, {unblocked_count} unblocked")
        else:
            print("NO_ALERT")


if __name__ == "__main__":
    main()
