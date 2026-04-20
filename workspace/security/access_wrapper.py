#!/usr/bin/env python3
"""
Access Wrapper
Agents call this before executing privileged commands.
Submits request -> auto-review -> execute or escalate to INFOSEC.
"""

import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

# Import access control
SECURITY_DIR = Path(__file__).parent
sys.path.insert(0, str(SECURITY_DIR))
from access_control import AccessControl

AUDIT_LOG = SECURITY_DIR / "audit_log"
AUDIT_LOG.mkdir(parents=True, exist_ok=True)


class AccessWrapper:
    def __init__(self):
        self.ac = AccessControl()

    def execute_with_access(
        self,
        agent: str,
        command: str,
        justification: str,
        task_id: str = "",
        risk_level: str = "low",
        duration: str = "30m"
    ) -> Dict:
        """
        Request access, auto-review, execute if approved, or escalate.
        Returns dict with 'status', 'output', 'error' keys.
        """
        # Build access request
        request = {
            "agent": agent,
            "task_id": task_id or f"WRAP-{int(time.time())}",
            "access_level": 3,
            "reason": justification,
            "duration_requested": duration,
            "specific_permissions": [
                {"command": command, "justification": justification}
            ],
            "risk_assessment": {"risk_level": risk_level}
        }

        # Submit and auto-review
        request_id = self.ac.submit_request(request)
        decision = self.ac.auto_review(request)

        if decision == "deny":
            self._log_action(agent, command, "denied", "Auto-denied by policy")
            return {
                "status": "denied",
                "request_id": request_id,
                "reason": "Command blocked by security policy",
                "output": None,
                "error": "Access denied"
            }

        if decision == "approve":
            # Auto-approved: grant and execute
            grant = self.ac.grant_access(request_id)
            result = self._execute_command(command)
            self._log_action(agent, command, "executed", result.get("output", ""))

            # Update trust score on clean completion
            if result["returncode"] == 0:
                self.ac.update_trust_score(agent, +2)
            else:
                self.ac.update_trust_score(agent, -1)

            # Revoke access after execution
            self.ac.revoke_access(request_id, "Execution complete")

            return {
                "status": "executed",
                "request_id": request_id,
                "grant": grant,
                "output": result["output"],
                "error": result["error"],
                "returncode": result["returncode"]
            }

        # Manual review needed -> escalate to INFOSEC
        escalation = self._escalate_to_infosec(request_id, request)

        if escalation.get("approved"):
            grant = self.ac.grant_access(request_id)
            result = self._execute_command(command)
            self._log_action(agent, command, "executed_after_review", result.get("output", ""))

            if result["returncode"] == 0:
                self.ac.update_trust_score(agent, +3)

            self.ac.revoke_access(request_id, "Execution complete (reviewed)")
            return {
                "status": "executed_after_review",
                "request_id": request_id,
                "grant": grant,
                "output": result["output"],
                "error": result["error"],
                "returncode": result["returncode"]
            }
        else:
            self._log_action(agent, command, "denied_by_infosec", escalation.get("reason", ""))
            return {
                "status": "denied_by_infosec",
                "request_id": request_id,
                "reason": escalation.get("reason", "INFOSEC denied the request"),
                "output": None,
                "error": "Access denied by INFOSEC review"
            }

    def _execute_command(self, command: str) -> Dict:
        """Execute a shell command and return result"""
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=300,
                cwd=str(Path.home() / ".openclaw" / "workspace")
            )
            return {
                "output": result.stdout,
                "error": result.stderr,
                "returncode": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {
                "output": "",
                "error": "Command timed out (5 min limit)",
                "returncode": -1
            }
        except Exception as e:
            return {
                "output": "",
                "error": str(e),
                "returncode": -1
            }

    def _escalate_to_infosec(self, request_id: str, request: Dict) -> Dict:
        """Send access request to INFOSEC agent for manual review"""
        prompt = f"""SECURITY ACCESS REQUEST - Manual Review Required

Request ID: {request_id}
Agent: {request['agent']}
Task: {request.get('task_id', 'N/A')}
Command: {request['specific_permissions'][0]['command']}
Justification: {request['reason']}
Risk Level: {request['risk_assessment']['risk_level']}
Duration: {request['duration_requested']}

Review this request and respond with EXACTLY one of:
- APPROVE - if the request is legitimate and safe
- DENY: <reason> - if the request should be blocked

Your decision:"""

        try:
            result = subprocess.run(
                [
                    'openclaw', 'agent',
                    '--agent', 'infosec',
                    '--message', prompt
                ],
                capture_output=True,
                text=True,
                timeout=120
            )

            if result.returncode == 0:
                response = result.stdout.strip().upper()
                if "APPROVE" in response:
                    self.ac.log_audit(
                        f"INFOSEC approved: {request_id} for {request['agent']}"
                    )
                    return {"approved": True}
                else:
                    reason = response.replace("DENY:", "").replace("DENY", "").strip()
                    self.ac.log_audit(
                        f"INFOSEC denied: {request_id} - {reason}"
                    )
                    return {"approved": False, "reason": reason or "INFOSEC denied"}
            else:
                # If INFOSEC is unreachable, deny by default
                self.ac.log_audit(
                    f"INFOSEC unreachable for {request_id}, defaulting to deny"
                )
                return {"approved": False, "reason": "INFOSEC agent unreachable"}

        except subprocess.TimeoutExpired:
            self.ac.log_audit(
                f"INFOSEC review timeout for {request_id}, defaulting to deny"
            )
            return {"approved": False, "reason": "Review timeout"}
        except Exception as e:
            self.ac.log_audit(
                f"INFOSEC escalation error for {request_id}: {e}"
            )
            return {"approved": False, "reason": f"Escalation error: {e}"}

    def _log_action(self, agent: str, command: str, status: str, detail: str):
        """Log an action to the audit log"""
        self.ac.log_action({
            "agent": agent,
            "command": command,
            "status": status,
            "detail": detail[:500] if detail else "",
            "source": "access_wrapper"
        })


# CLI interface
if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: access_wrapper.py <agent> <command> <justification> [risk_level] [duration]")
        print()
        print("Examples:")
        print('  access_wrapper.py eng "npm test" "Running unit tests" low 30m')
        print('  access_wrapper.py ops "git push" "Deploy to staging" medium 15m')
        print('  access_wrapper.py eng "rm -rf node_modules" "Clean rebuild" medium 10m')
        sys.exit(1)

    agent = sys.argv[1]
    command = sys.argv[2]
    justification = sys.argv[3]
    risk_level = sys.argv[4] if len(sys.argv) > 4 else "low"
    duration = sys.argv[5] if len(sys.argv) > 5 else "30m"

    wrapper = AccessWrapper()
    result = wrapper.execute_with_access(
        agent=agent,
        command=command,
        justification=justification,
        risk_level=risk_level,
        duration=duration
    )

    print(json.dumps(result, indent=2))
