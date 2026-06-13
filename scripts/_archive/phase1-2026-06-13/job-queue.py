#!/usr/bin/env python3
"""job-queue.py — routes tasks from queue.json to OpenClaw agent sessions.

Called by: queue-cron.sh (every 5 min)
Flow:  queue-cron.sh → job-queue.py → OpenClaw exec --agent

Usage:
  python3 ~/.openclaw/scripts/job-queue.py submit <agent> "<task>" [priority]
  python3 ~/.openclaw/scripts/job-queue.py --dry-run
"""

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

AUTONOMOUS_FILE = Path.home() / ".openclaw" / "workspace" / "ops" / "AUTONOMOUS.md"
LOG_FILE = Path.home() / ".openclaw" / "scripts" / "logs" / "job-queue.log"
STATE_FILE = Path.home() / ".openclaw" / "scripts" / "job-queue-state.json"

LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

VALID_AGENTS = {"eng", "ops", "research", "finance", "main", "red", "allrounder", "infosec", "hatake"}


def log(msg: str) -> None:
    ts = datetime.now(timezone.utc).isoformat()
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except Exception:
            pass
    return {"last_processed": None, "queued": []}


def save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2))


def get_pending_tasks() -> list[dict]:
    """Read pending tasks from queue.json.

    Returns list of {task_id, agent, title}.
    """
    import re
    queue_file = Path.home() / ".openclaw" / "workspace" / "tasks" / "queue.json"
    if not queue_file.exists():
        return []

    try:
        d = json.loads(queue_file.read_text())
    except Exception:
        return []

    tasks = []
    for t in d.get("pending", []):
        agents_raw = t.get("assigned_to", [])
        # assigned_to is a list; take first valid agent
        agent = None
        for a in (agents_raw if isinstance(agents_raw, list) else [agents_raw]):
            if a and a.lower() in VALID_AGENTS:
                agent = a.lower()
                break
        if agent:
            title = t.get("description", "") or t.get("title", "")
            tasks.append({
                "task_id": t.get("id", "UNKNOWN"),
                "agent": agent,
                "title": title,
            })
    return tasks


def submit_to_agent(task: dict, dry_run: bool = False) -> bool:
    """Submit a task to an OpenClaw agent via openclaw exec --agent.

    Uses:  openclaw exec --agent <agentId> -- "<prompt>"
    """
    agent = task["agent"]
    prompt = (
        f"Task: {task['title']}\n"
        f"Task ID: {task['task_id']}\n\n"
        f"Work in your workspace. Update AUTONOMOUS.md when done (mark DONE). "
        f"Write any learnings to the wiki at ~/.shared/llm-wiki/wiki/."
    )

    if dry_run:
        log(f"[DRY RUN] Would submit task {task['task_id']!r} to agent {agent!r}")
        return True

    try:
        result = subprocess.run(
            ["openclaw", "exec", "--agent", agent, "--", prompt],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode == 0:
            log(f"OK submitted {task['task_id']!r} → {agent!r}")
            return True
        else:
            log(f"FAIL submitted {task['task_id']!r} → {agent!r}: {result.stderr[:200]}")
            return False
    except Exception as e:
        log(f"ERROR submitting {task['task_id']!r}: {e}")
        return False


def cmd_submit(agent: str, task: str, priority: str = "normal", dry_run: bool = False) -> int:
    """Submit a single task to an agent (called by queue-cron.sh)."""
    if agent not in VALID_AGENTS:
        log(f"Invalid agent {agent!r}; valid: {sorted(VALID_AGENTS)}")
        return 1

    task_id_raw = task.split(":", 1)[0].strip()
    title = task.strip()

    task_dict = {"task_id": task_id_raw, "agent": agent, "title": title}

    if dry_run:
        log(f"[DRY RUN] Would submit {task_id_raw!r} → {agent!r}: {title[:60]}")
        return 0

    ok = submit_to_agent(task_dict, dry_run=False)
    return 0 if ok else 1


def main() -> None:
    parser = argparse.ArgumentParser(description="Route PENDING tasks from AUTONOMOUS.md to agents")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without submitting")
    sub = parser.add_subparsers(dest="command")

    sub_submit = sub.add_parser("submit", help="Submit a task to an agent")
    sub_submit.add_argument("agent", help="Target agent ID")
    sub_submit.add_argument("task", help="Task string (id: title)")
    sub_submit.add_argument("priority", nargs="?", default="normal", help="Priority (ignored)")

    args = parser.parse_args()

    if args.command == "submit":
        sys.exit(cmd_submit(args.agent, args.task, args.priority, dry_run=args.dry_run))

    # Default: scan AUTONOMOUS.md and submit all PENDING tasks
    log("job-queue.py started")
    state = load_state()
    pending = get_pending_tasks()

    if not pending:
        log("No PENDING tasks found")
        return

    log(f"Found {len(pending)} PENDING task(s)")
    submitted = 0

    for task in pending:
        task_id = task["task_id"]
        if task_id in state.get("queued", []):
            log(f"Skipping already-queued task {task_id!r}")
            continue

        ok = submit_to_agent(task, dry_run=args.dry_run)
        if ok:
            queued = state.get("queued", [])
            queued.append(task_id)
            state["queued"] = queued[-100:]
            submitted += 1

    state["last_processed"] = datetime.now(timezone.utc).isoformat()
    save_state(state)
    log(f"Done — submitted {submitted} task(s)")


if __name__ == "__main__":
    main()
