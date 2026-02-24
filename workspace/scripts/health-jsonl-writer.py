#!/usr/bin/env python3
"""Health JSONL writer for OpenClaw cron.

Runs `openclaw status --json`, extracts gateway health info, and appends to health.jsonl.
"""

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

HEALTH_JSONL = Path.home() / ".openclaw" / "logs" / "health.jsonl"


def run_status_json():
    """Run openclaw status --json and return parsed JSON."""
    try:
        result = subprocess.run(
            ["openclaw", "status", "--json"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            return None
        
        # Find first '{' to skip any warning lines
        output = result.stdout
        start_idx = output.find('{')
        if start_idx == -1:
            return None
        
        return json.loads(output[start_idx:])
    except Exception:
        return None


def extract_health_info(status_json):
    """Extract health metrics from status JSON."""
    try:
        health = {}
        
        # Session health
        sessions = status_json.get("sessions", {})
        if isinstance(sessions, dict):
            health["sessions"] = {
                "count": sessions.get("count", 0),
                "recent_count": len(sessions.get("recent", [])),
            }
        
        # Channel health
        channels = status_json.get("channelSummary", [])
        health["channels_configured"] = len([c for c in channels if "configured" in c])
        
        # Heartbeat agents
        heartbeat = status_json.get("heartbeat", {})
        agents = heartbeat.get("agents", [])
        health["agents_enabled"] = len([a for a in agents if a.get("enabled")])
        health["agents_total"] = len(agents)
        
        # Queued events
        health["queued_system_events"] = len(status_json.get("queuedSystemEvents", []))
        
        return health
    except Exception as e:
        return {"error": str(e)}


def main():
    status_json = run_status_json()
    if not status_json:
        # Silent fail per job instructions
        return
    
    health_info = extract_health_info(status_json)
    
    # Build health record
    now_utc = datetime.now(timezone.utc).isoformat()
    record = {
        "timestamp": now_utc,
        "health": health_info
    }
    
    # Append to health.jsonl
    try:
        HEALTH_JSONL.parent.mkdir(parents=True, exist_ok=True)
        with open(HEALTH_JSONL, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
    except Exception:
        # Silent fail per job instructions
        pass


if __name__ == "__main__":
    main()
