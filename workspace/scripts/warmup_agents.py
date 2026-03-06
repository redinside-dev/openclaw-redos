#!/usr/bin/env python3
import json
import subprocess
import os
from datetime import datetime

def warmup_agent(agent_id, model=None):
    """Warm up a specialist agent by spawning a quick task."""
    try:
        # Spawn a simple echo task to keep the agent warm
        task = f"echo 'Warmup check for {agent_id}'"
        
        # Use sessions_spawn to warm up the agent
        subprocess.run([
            "openclaw", "sessions", "spawn",
            "--runtime", "subagent",
            "--agent-id", agent_id,
            "--task", task,
            "--timeout-seconds", "10",
            "--mode", "run"
        ], capture_output=True, text=True)
        
        return {
            "agent_id": agent_id,
            "status": "success",
            "model": model,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "agent_id": agent_id,
            "status": "failure",
            "error": str(e),
            "model": model,
            "timestamp": datetime.now().isoformat()
        }

def main():
    agents = [
        {"id": "eng", "model": "gpt-5.3-codex"},
        {"id": "ops", "model": "claude-opus-4-6"},
        {"id": "research", "model": "claude-sonnet-4-6"},
        {"id": "infosec", "model": "claude-opus-4-6"}
    ]
    
    results = []
    for agent in agents:
        result = warmup_agent(agent["id"], agent.get("model"))
        results.append(result)
    
    # Log to JSONL
    log_path = "workspace/logs/audit.jsonl"
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    
    with open(log_path, "a") as f:
        for result in results:
            f.write(json.dumps(result) + "\n")
    
    # Print summary
    print(f"Session warmup completed at {datetime.now().isoformat()}")
    print(f"Results logged to: {log_path}")
    print(f"Summary:")
    for result in results:
        status = "✅" if result["status"] == "success" else "❌"
        print(f"  {status} {result['agent_id']}: {result['status']}")

if __name__ == "__main__":
    main()