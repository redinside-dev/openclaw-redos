#!/usr/bin/env python3
"""
Access Control System
Manages time-bound access requests and monitoring
"""

import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

# Paths
SECURITY_DIR = Path(__file__).parent
PENDING_REQUESTS = SECURITY_DIR / "access_control" / "pending_requests.json"
ACTIVE_GRANTS = SECURITY_DIR / "access_control" / "active_grants.json"
AUDIT_LOG = SECURITY_DIR / "audit_log"
TRUST_SCORES = SECURITY_DIR / "trust_scores.json"

# Ensure directories exist
PENDING_REQUESTS.parent.mkdir(parents=True, exist_ok=True)
AUDIT_LOG.mkdir(parents=True, exist_ok=True)


class AccessControl:
    def __init__(self):
        self.pending = self.load_json(PENDING_REQUESTS, [])
        self.active = self.load_json(ACTIVE_GRANTS, [])
        self.trust_scores = self.load_json(TRUST_SCORES, self.default_trust_scores())

    @staticmethod
    def load_json(path: Path, default):
        """Load JSON file or return default"""
        if path.exists():
            with open(path) as f:
                return json.load(f)
        return default

    def save_json(self, path: Path, data):
        """Save JSON file"""
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)

    @staticmethod
    def default_trust_scores() -> Dict[str, int]:
        """Default trust scores for agents"""
        return {
            "main": 80,      # RED - CEO, trustworthy
            "allrounder": 75,  # ZEN - Search only
            "research": 75,    # RESEARCH - Read-heavy
            "eng": 70,         # ENG - Writes code
            "finance": 80,     # FINANCE - Low risk
            "ops": 65,         # OPS - System access
            "hatake": 90,      # HATAKE - Local only
            "infosec": 100     # INFOSEC - Security guardian
        }

    def submit_request(self, request: Dict) -> str:
        """Submit new access request"""
        request_id = f"AR-{int(time.time() * 1000)}"
        request["id"] = request_id
        request["submitted_at"] = datetime.now().isoformat()
        request["status"] = "pending"

        self.pending.append(request)
        self.save_json(PENDING_REQUESTS, self.pending)

        self.log_audit(f"Access request submitted: {request_id} by {request['agent']}")
        return request_id

    def auto_review(self, request: Dict) -> Optional[str]:
        """Auto-review request, return decision or None if manual review needed"""
        agent = request["agent"]
        trust_score = self.trust_scores.get(agent, 50)
        risk_level = request.get("risk_assessment", {}).get("risk_level", "medium")
        duration = request.get("duration_requested", "30m")

        # Auto-deny conditions
        if trust_score < 20:
            return "deny"
        if risk_level == "critical":
            return "deny"
        if self.has_blacklisted_commands(request):
            return "deny"

        # Auto-approve conditions
        if all([
            trust_score >= 60,
            risk_level == "low",
            self.parse_duration(duration) <= 30,
            self.all_whitelisted(request)
        ]):
            return "approve"

        # Manual review needed
        return None

    def has_blacklisted_commands(self, request: Dict) -> bool:
        """Check if request contains blacklisted commands"""
        blacklist = [
            "rm -rf /", "chmod 777", "curl | sh", "sudo",
            "dd", "mkfs", "iptables"
        ]
        commands = request.get("specific_permissions", [])
        for perm in commands:
            cmd = perm.get("command", "")
            if any(bl in cmd for bl in blacklist):
                return True
        return False

    def all_whitelisted(self, request: Dict) -> bool:
        """Check if all commands are whitelisted"""
        whitelist = [
            "npm install", "npm test", "pytest", "jest",
            "git status", "git diff", "git log",
            "ls", "cat", "grep", "echo"
        ]
        commands = request.get("specific_permissions", [])
        for perm in commands:
            cmd = perm.get("command", "")
            if not any(wl in cmd for wl in whitelist):
                return False
        return True

    @staticmethod
    def parse_duration(duration_str: str) -> int:
        """Parse duration string to minutes"""
        if duration_str.endswith('m'):
            return int(duration_str[:-1])
        elif duration_str.endswith('h'):
            return int(duration_str[:-1]) * 60
        return 30  # default

    def grant_access(self, request_id: str, duration_override: Optional[int] = None):
        """Grant access for approved request"""
        request = next((r for r in self.pending if r["id"] == request_id), None)
        if not request:
            return False

        duration_min = duration_override or self.parse_duration(request["duration_requested"])
        grant = {
            "request_id": request_id,
            "agent": request["agent"],
            "task_id": request.get("task_id"),
            "granted_at": datetime.now().isoformat(),
            "expires_at": (datetime.now() + timedelta(minutes=duration_min)).isoformat(),
            "allowed_commands": [p["command"] for p in request.get("specific_permissions", [])],
            "monitoring_level": "high" if request.get("risk_assessment", {}).get("risk_level") != "low" else "medium",
            "extensions": 0
        }

        self.active.append(grant)
        self.save_json(ACTIVE_GRANTS, self.active)

        # Remove from pending
        self.pending = [r for r in self.pending if r["id"] != request_id]
        self.save_json(PENDING_REQUESTS, self.pending)

        self.log_audit(f"Access granted: {request_id} to {grant['agent']} until {grant['expires_at']}")
        return grant

    def revoke_access(self, grant_id: str, reason: str = "Manual revocation"):
        """Revoke active access grant"""
        grant = next((g for g in self.active if g["request_id"] == grant_id), None)
        if not grant:
            return False

        self.active = [g for g in self.active if g["request_id"] != grant_id]
        self.save_json(ACTIVE_GRANTS, self.active)

        self.log_audit(f"Access revoked: {grant_id} - Reason: {reason}")
        return True

    def check_expired_grants(self):
        """Check and revoke expired grants"""
        now = datetime.now()
        expired = []

        for grant in self.active:
            expires_at = datetime.fromisoformat(grant["expires_at"])
            if now > expires_at:
                expired.append(grant["request_id"])

        for grant_id in expired:
            self.revoke_access(grant_id, "Time expired")

        return expired

    def extend_access(self, grant_id: str, additional_minutes: int) -> bool:
        """Extend access grant duration"""
        grant = next((g for g in self.active if g["request_id"] == grant_id), None)
        if not grant:
            return False

        # Check extension limits
        if grant.get("extensions", 0) >= 3:
            self.log_audit(f"Extension denied: {grant_id} - Max extensions reached")
            return False

        # Extend
        current_expires = datetime.fromisoformat(grant["expires_at"])
        new_expires = current_expires + timedelta(minutes=additional_minutes)
        grant["expires_at"] = new_expires.isoformat()
        grant["extensions"] = grant.get("extensions", 0) + 1

        self.save_json(ACTIVE_GRANTS, self.active)
        self.log_audit(f"Access extended: {grant_id} by {additional_minutes}m")
        return True

    def log_audit(self, message: str):
        """Log audit message"""
        timestamp = datetime.now()
        log_file = AUDIT_LOG / f"{timestamp.strftime('%Y-%m-%d')}.log"

        with open(log_file, 'a') as f:
            f.write(f"[{timestamp.isoformat()}] {message}\n")

    def log_action(self, action: Dict):
        """Log detailed action with full context"""
        timestamp = datetime.now()
        log_file = AUDIT_LOG / f"{timestamp.strftime('%Y-%m-%d')}.json"

        # Load existing log
        if log_file.exists():
            with open(log_file) as f:
                log_data = json.load(f)
        else:
            log_data = []

        action["timestamp"] = timestamp.isoformat()
        log_data.append(action)

        with open(log_file, 'w') as f:
            json.dump(log_data, f, indent=2)

    def update_trust_score(self, agent: str, delta: int):
        """Update agent trust score"""
        current = self.trust_scores.get(agent, 50)
        new_score = max(0, min(100, current + delta))
        self.trust_scores[agent] = new_score
        self.save_json(TRUST_SCORES, self.trust_scores)

        self.log_audit(f"Trust score updated: {agent} {current} -> {new_score} ({delta:+d})")

    def get_active_grants(self) -> List[Dict]:
        """Get all active grants"""
        return self.active

    def get_pending_requests(self) -> List[Dict]:
        """Get all pending requests"""
        return self.pending


# CLI interface
if __name__ == "__main__":
    import sys

    ac = AccessControl()

    if len(sys.argv) < 2:
        print("Usage: access_control.py [command] [args...]")
        sys.exit(1)

    command = sys.argv[1]

    if command == "submit":
        # Example: submit '{"agent": "eng", "task_id": "TASK-1", ...}'
        request = json.loads(sys.argv[2])
        request_id = ac.submit_request(request)
        print(f"Submitted: {request_id}")

    elif command == "review":
        request_id = sys.argv[2]
        # Auto-review logic would go here
        print(f"Reviewing: {request_id}")

    elif command == "grant":
        request_id = sys.argv[2]
        grant = ac.grant_access(request_id)
        print(f"Granted: {json.dumps(grant, indent=2)}")

    elif command == "revoke":
        grant_id = sys.argv[2]
        reason = sys.argv[3] if len(sys.argv) > 3 else "Manual"
        ac.revoke_access(grant_id, reason)
        print(f"Revoked: {grant_id}")

    elif command == "check-expired":
        expired = ac.check_expired_grants()
        print(f"Expired grants: {expired}")

    elif command == "list-active":
        print(json.dumps(ac.get_active_grants(), indent=2))

    elif command == "list-pending":
        print(json.dumps(ac.get_pending_requests(), indent=2))

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
