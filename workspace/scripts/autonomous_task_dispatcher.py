import json
import datetime
from pathlib import Path

# Import OpenClaw tools
from openclaw.tools import sessions_spawn

workspace = Path("/Users/redinside/.openclaw/workspace")
log_file = workspace / "logs" / "dispatch.jsonl"
log_file.parent.mkdir(exist_ok=True)

# Read AUTONOMOUS.md
autonomous_md = workspace / "AUTONOMOUS.md"
try:
    with open(autonomous_md, 'r', encoding='utf-8') as f:
        content = f.read()
except FileNotFoundError:
    print("AUTONOMOUS.md not found. No tasks to dispatch.")
    exit(0)

# Parse tasks from AUTONOMOUS.md
tasks = []
for line in content.split('\n'):
    if line.strip().startswith('**') and ' | PENDING (' in line:
        parts = line.split('|')
        if len(parts) >= 3:
            task_id = parts[0].strip().strip('**')
            agent_id = parts[2].strip()
            tasks.append({
                'id': task_id,
                'agent': agent_id,
                'status': 'PENDING',
                'raw': line.strip()
            })

if not tasks:
    print("No PENDING tasks found in AUTONOMOUS.md. No dispatch needed.")
    exit(0)

# Sort by priority (assume task_id contains priority number)
tasks.sort(key=lambda x: int(x['id'].split('-')[-1]))

# Pick top 1-2 highest priority tasks
selected_tasks = tasks[:2]

# Update AUTONOMOUS.md - mark as IN_PROGRESS
new_content = content
for task in selected_tasks:
    new_content = new_content.replace(
        task['raw'],
        task['raw'].replace('PENDING', f'IN_PROGRESS ({datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")})')
    )

# Write back updated AUTONOMOUS.md
with open(autonomous_md, 'w', encoding='utf-8') as f:
    f.write(new_content)

# Dispatch tasks to agents
for task in selected_tasks:
    # Spawn agent session
    print(f"Dispatching: {task['id']} to {task['agent']}")
    try:
        result = sessions_spawn(
            agentId=task['agent'],
            task=f"Handle autonomous task: {task['id']}",
            thinking="high",
            timeoutSeconds=300
        )
        # Log dispatch
        log_entry = {
            "ts": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "taskId": task['id'],
            "agentId": task['agent'],
            "status": "dispatched"
        }
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(log_entry) + '\n')
        print(f"Logged dispatch for {task['id']}")
    except Exception as e:
        print(f"Failed to dispatch {task['id']}: {e}")

print("Autonomous task dispatch completed.")