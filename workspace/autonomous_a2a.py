#!/usr/bin/env python3
"""
Native OpenClaw A2A System
Enables agents to talk to each other using OpenClaw's built-in sessions_spawn
No Slack required - fully autonomous
"""

import json
import subprocess
import os
from datetime import datetime
from pathlib import Path

WORKSPACE = Path(__file__).parent
A2A_LOG = WORKSPACE / "logs" / "a2a-native.jsonl"
HANDOFF_DIR = WORKSPACE / "handoffs"
HANDOFF_DIR.mkdir(exist_ok=True)

# Agent capabilities - who can help with what
AGENT_CAPABILITIES = {
    "eng": ["code", "implement", "fix", "debug", "refactor", "architecture"],
    "ops": ["monitor", "health", "restart", "deploy", "cron", "backup"],
    "infosec": ["security", "access", "review", "audit", "permission"],
    "finance": ["cost", "budget", "spend", "billing", "optimization"],
    "research": ["analyze", "research", "report", "investigate"],
    "allrounder": ["general", "coordinator", "delegate", "help"],
}

def log_a2a(event):
    """Log A2A event"""
    event["ts"] = datetime.now().isoformat() + "Z"
    with open(A2A_LOG, "a") as f:
        f.write(json.dumps(event) + "\n")

def call_agent(agent_id, message, timeout=120):
    """Call an agent using OpenClaw CLI"""
    try:
        result = subprocess.run(
            ["openclaw", "agent", "--agent", agent_id, "--message", message],
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(WORKSPACE)
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout[:1000],
            "error": result.stderr[:500] if result.returncode != 0 else None
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "timeout"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def delegate_task(from_agent, to_agent, task, context=""):
    """Delegate a task to another agent using sessions_spawn"""
    
    full_message = f"""[A2A DELEGATION from {from_agent} to {to_agent}]

TASK: {task}

{'CONTEXT: ' + context if context else ''}

Instructions:
1. Complete the task
2. Write result to workspace/handoffs/{from_agent}-to-{to_agent}-result.json
3. Return a brief summary of what you did."""

    log_a2a({
        "type": "delegate",
        "from": from_agent,
        "to": to_agent,
        "task": task[:100]
    })
    
    result = call_agent(to_agent, full_message, timeout=180)
    
    log_a2a({
        "type": "result",
        "from": from_agent,
        "to": to_agent,
        "task": task[:100],
        "success": result["success"]
    })
    
    return result

def request_help(from_agent, question, topic="general"):
    """Request help from the best capable agent"""
    
    # Find best agent for the topic
    target = "allrounder"
    topic_lower = topic.lower()
    
    for keyword, agent in {
        "code": "eng", "fix": "eng", "bug": "eng",
        "security": "infosec", "access": "infosec",
        "cost": "finance", "budget": "finance",
        "monitor": "ops", "health": "ops",
        "research": "research", "analyze": "research"
    }.items():
        if keyword in topic_lower:
            target = agent
            break
    
    return delegate_task(from_agent, target, f"Help requested: {question}", f"topic: {topic}")

def team_checkin():
    """All agents report status - like a standup"""
    results = {}
    
    for agent in AGENT_CAPABILITIES:
        if agent == "allrounder":
            continue  # Skip coordinator
        
        message = """[TEAM CHECK-IN]

Please respond with:
1. What are you working on right now?
2. Any blockers?
3. Who can help you?

Be brief - one sentence each."""
        
        results[agent] = call_agent(agent, message, timeout=60)
    
    # Write results to handoff file
    with open(HANDOFF_DIR / "team-checkin-results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    return results

def auto_delegate_if_needed(agent, task):
    """Check if task should be delegated to another agent"""
    
    task_lower = task.lower()
    
    # Check if another agent should handle this
    for keyword, target_agent in {
        "code": "eng", "implement": "eng", "write": "eng", "create": "eng",
        "security": "infosec", "access": "infosec", "permission": "infosec",
        "cost": "finance", "budget": "finance", "spend": "finance",
        "monitor": "ops", "health": "ops", "restart": "ops", "deploy": "ops",
        "research": "research", "analyze": "research", "investigate": "research"
    }.items():
        if keyword in task_lower and target_agent != agent:
            return delegate_task(agent, target_agent, task)
    
    return None  # No delegation needed

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: autonomous_a2a.py <command> [args]")
        print("Commands:")
        print("  delegate <from> <to> <task>")
        print("  help <from> <question>")
        print("  checkin")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == "delegate" and len(sys.argv) >= 5:
        result = delegate_task(sys.argv[2], sys.argv[3], " ".join(sys.argv[4:]))
        print(json.dumps(result))
    elif cmd == "help" and len(sys.argv) >= 4:
        result = request_help(sys.argv[2], " ".join(sys.argv[3:]))
        print(json.dumps(result))
    elif cmd == "checkin":
        result = team_checkin()
        print(json.dumps(result, indent=2))
    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)
