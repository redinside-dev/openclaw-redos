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


def extract_gateway_info(status_json):
    """Extract gateway reachability and latency from status JSON."""
    try:
        # Look for gateway info in the status output
        gateway_section = status_json.get("gateway", {})
        if isinstance(gateway_section, dict):
            reachable = gateway_section.get("reachable", False)
            latency = gateway_section.get("connectLatencyMs")
            version = gateway_section.get("version")
            return {
                "reachable": bool(reachable),
                "connectLatencyMs": latency,
                "version": version,
            }
    except Exception:
        pass
    
    return {"reachable": False, "connectLatencyMs": None, "version": None}


def main():
    status_json = run_status_json()
    if not status_json:
        # Silent fail per job instructions
        return
    
    gateway_info = extract_gateway_info(status_json)
    
    # Build health record
    now_utc = datetime.now(timezone.utc).isoformat()
    record = {
        "timestamp": now_utc,
        "checks": {
            "gateway": gateway_info
        }
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
