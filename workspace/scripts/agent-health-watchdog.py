#!/usr/bin/env python3
"""
Agent Health Watchdog - Monitors and auto-recovers hanging agents
Runs every 5 minutes to check agent responsiveness
"""

import subprocess
import time
import os
from pathlib import Path

WORKSPACE = Path(__file__).parent
LOG_FILE = WORKSPACE / "logs" / "agent-health-watchdog.log"

# Agents that should respond within 30 seconds
CRITICAL_AGENTS = ["main", "eng", "ops", "finance", "infosec", "research", "allrounder", "hatake"]
TIMEOUT_SECONDS = 30

def log(msg):
    """Log to file"""
    with open(LOG_FILE, "a") as f:
        f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} - {msg}\n")

def check_agent(agent: str) -> bool:
    """Check if agent responds within timeout. Returns True if healthy."""
    log(f"Checking agent: {agent}")
    try:
        result = subprocess.run(
            ["openclaw", "agent", "--agent", agent, "--message", "ping"],
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS
        )
        if result.returncode == 0:
            log(f"  {agent}: OK")
            return True
        else:
            log(f"  {agent}: ERROR - {result.stderr[:100]}")
            return False
    except subprocess.TimeoutExpired:
        log(f"  {agent}: TIMEOUT - killing stuck session")
        # Kill any stuck openclaw processes for this agent
        subprocess.run(["pkill", "-f", f"openclaw.*--agent.*={agent}"], capture_output=True)
        return False
    except Exception as e:
        log(f"  {agent}: EXCEPTION - {e}")
        return False

def main():
    """Main health check loop"""
    log("=== Agent Health Watchdog started ===")
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

    healthy = 0
    unhealthy = 0

    for agent in CRITICAL_AGENTS:
        if check_agent(agent):
            healthy += 1
        else:
            unhealthy += 1

    log(f"=== Health check complete: {healthy} healthy, {unhealthy} unhealthy ===")

    if unhealthy > 0:
        # Alert if any agents unhealthy
        log(f"ALERT: {unhealthy} agents unhealthy!")

if __name__ == "__main__":
    main()
