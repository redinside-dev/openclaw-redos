#!/bin/bash
WORKSPACE="/Users/redinside/.openclaw/workspace"
QUEUE_FILE="$WORKSPACE/tasks/queue.json"
LOG_FILE="$WORKSPACE/logs/deadlock-monitor.jsonl"

echo "=== Deadlock Monitor ==="

python3 << PYTHON
import json
from datetime import datetime, timedelta

try:
    q = json.load(open("$QUEUE_FILE"))
    now = datetime.now()
    stuck = []
    
    for t in q.get('in_progress', []):
        created = t.get('created_at', '')
        if created:
            try:
                dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
                age = (now - dt.replace(tzinfo=None)).total_seconds()
                if age > 3600:
                    stuck.append(t.get('id'))
            except:
                pass
    
    if stuck:
        print(f"Stuck tasks: {stuck}")
        for t in q.get('in_progress', []):
            if t.get('id') in stuck:
                t['status'] = 'pending'
                t['notes'] = 'Auto-recovered from stuck state'
        q['pending'] = q.get('pending', []) + [t for t in q.get('in_progress', []) if t.get('id') in stuck]
        q['in_progress'] = [t for t in q.get('in_progress', []) if t.get('id') not in stuck]
        json.dump(q, open("$QUEUE_FILE", 'w'), indent=2)
        print("Recovered stuck tasks")
    else:
        print("No stuck tasks")
except Exception as e:
    print(f"Error: {e}")
PYTHON
