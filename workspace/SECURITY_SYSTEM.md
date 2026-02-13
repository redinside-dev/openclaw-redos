# AgentOS v3 - Security & Access Control System

## Core Security Principles
1. **Zero Trust** - Every action must be approved
2. **Time-Bound Access** - All permissions expire
3. **Continuous Monitoring** - Actions audited in real-time
4. **Least Privilege** - Minimum access needed
5. **Audit Everything** - Complete action trail

---

## INFOSEC Agent

### Role & Responsibilities
**INFOSEC** is the security guardian of AgentOS.

**Primary Duties:**
- Monitor all agent actions (every 5 minutes)
- Approve/deny access requests
- Audit compliance continuously
- Detect suspicious behavior
- Enforce security policies
- Generate security reports

**Model**: openai-codex/gpt-5.2 (needs high intelligence)
**Priority**: Security over speed
**Authority**: Can halt ANY agent action

---

## Access Control System

### Access Levels

**Level 0: No Access** (Default)
- Read public documentation
- Access shared knowledge base
- View task queue
- Communicate with other agents

**Level 1: Read-Only**
- Read files in workspace
- View system status
- Check logs (read-only)
- View configurations

**Level 2: Limited Write**
- Write to workspace/memory
- Create task entries
- Update documentation
- Add to knowledge base

**Level 3: Terminal (Time-Bound)**
- Execute approved commands
- Install approved packages
- Run tests
- Build/deploy (controlled)

**Level 4: Filesystem (Time-Bound)**
- Modify code files
- Update configurations
- Delete files (with approval)
- System file access

**Level 5: Admin (Restricted)**
- Change system config
- Restart services
- Access credentials
- INFOSEC approval required

---

## Access Request Protocol

### Request Submission
```yaml
access_request:
  id: "AR-{timestamp}"
  agent: "ENG"
  task_id: "TASK-123"
  access_level: 3  # Terminal
  reason: "Need to run npm install for new dependencies"
  duration_requested: "30m"
  specific_permissions:
    - command: "npm install express"
      justification: "Required for auth feature"
    - command: "npm test"
      justification: "Verify install worked"
  risk_assessment:
    risk_level: "medium"
    data_exposure: "none"
    system_impact: "low"
    reversible: true
  submitted_at: "2026-02-12T15:30:00Z"
```

### Approval Workflow

**Step 1: Auto-Review (< 1 minute)**
```
INFOSEC checks:
- Is agent authorized?
- Is task legitimate?
- Are commands safe?
- Is duration reasonable?
- Does it match patterns?

Auto-approve if:
- Risk level: low
- Agent has history of safe operations
- Commands in whitelist
- Duration < 30 minutes

Auto-deny if:
- Risk level: high
- Suspicious patterns
- Commands in blacklist
- Agent compromised flag
```

**Step 2: Manual Review (if needed)**
```
INFOSEC manually reviews:
- Read full request context
- Check task legitimacy
- Evaluate commands
- Assess risks

Decision:
- APPROVE: Grant access with monitoring
- DENY: Reject with reason
- REQUEST_MORE_INFO: Ask for clarification
- ESCALATE: Send to user for decision
```

**Step 3: Grant Time-Bound Access**
```
access_grant:
  request_id: "AR-12345"
  status: "approved"
  granted_at: "2026-02-12T15:32:00Z"
  expires_at: "2026-02-12T16:02:00Z"  # +30m
  monitoring_level: "high"
  allowed_commands:
    - "npm install express"
    - "npm test"
  restrictions:
    - no_network_external: false
    - no_file_delete: true
    - no_sudo: true
    - workspace_only: true
```

---

## Monitoring & Auditing

### Real-Time Monitoring (Every Action)
```
When agent executes with granted access:

1. Log action START
   {
     "action_id": "ACT-12345",
     "agent": "ENG",
     "access_grant": "AR-12345",
     "command": "npm install express",
     "timestamp": "2026-02-12T15:35:00Z"
   }

2. Monitor execution
   - Capture stdout/stderr
   - Track files accessed
   - Monitor network calls
   - Check resource usage

3. Detect anomalies
   - Unexpected file access?
   - Suspicious network activity?
   - Privilege escalation attempt?
   - Time limit exceeded?

4. Log action END
   {
     "action_id": "ACT-12345",
     "status": "completed",
     "duration": "12s",
     "files_modified": ["/workspace/package.json"],
     "exit_code": 0,
     "anomalies": []
   }
```

### 5-Minute Security Scans
```
Every 5 minutes, INFOSEC runs:

1. Active Access Audit
   - Who has access right now?
   - Are they within time limits?
   - Are they doing what they requested?
   - Any suspicious activity?

2. Compliance Check
   - All actions properly logged?
   - Access grants not expired?
   - Security policies followed?
   - No unauthorized actions?

3. Anomaly Detection
   - Unusual patterns?
   - Failed access attempts?
   - Resource spikes?
   - Unknown processes?

4. Report Generation
   If issues found:
   - Alert immediately
   - Revoke access if needed
   - Notify RED and user
   - Log incident
```

---

## Access Extension Protocol

### When Agent Needs More Time
```
Before access expires:

1. Agent submits extension request
   {
     "original_grant": "AR-12345",
     "reason": "Task taking longer than expected",
     "additional_time": "15m",
     "work_completed": "50%",
     "remaining_work": "Running final tests"
   }

2. INFOSEC evaluates
   - Is progress legitimate?
   - Is extension reasonable?
   - Any red flags so far?
   - Check audit log

3. Decision
   APPROVE: Extend access by requested time
   DENY: Access expires as scheduled
   CONDITIONAL: Extend with additional restrictions

4. If approved
   - Update expiration time
   - Continue monitoring
   - Log extension in audit trail
```

### Extension Limits
```
- Max 3 extensions per request
- Each extension max 30 minutes
- Total access time max 2 hours
- After limits → New request required
```

---

## Security Policies

### Command Whitelist (Auto-Approve)
```
Safe commands that get auto-approved:
- npm install {known packages}
- npm test
- git status, git diff, git log
- pytest, jest, mocha
- ls, cat, grep (read operations)
- echo, printf (output only)
```

### Command Blacklist (Auto-Deny)
```
Dangerous commands that get auto-denied:
- rm -rf / (system destruction)
- chmod 777 (security risk)
- curl | sh (arbitrary code execution)
- dd (disk operations)
- mkfs (filesystem format)
- iptables (firewall changes)
- Any command with sudo (privilege escalation)
- wget/curl from unknown domains
```

### Conditional Commands (Require Review)
```
Commands that need INFOSEC review:
- git push (code publication)
- npm publish (package publication)
- Database operations (data modification)
- File deletion (rm command)
- System service restart
- Environment variable changes
- Configuration file edits
```

---

## Incident Response

### Suspicious Activity Detected
```
If INFOSEC detects suspicious behavior:

IMMEDIATE:
1. Revoke agent's current access
2. Halt agent's execution
3. Capture full state (logs, files, processes)
4. Isolate agent (no new requests)

WITHIN 1 MINUTE:
5. Alert RED and user
6. Generate incident report
7. Preserve evidence
8. Assess damage

WITHIN 5 MINUTES:
9. Investigate root cause
10. Determine if malicious or bug
11. Fix vulnerability if found
12. Restore service if safe

WITHIN 24 HOURS:
13. Complete investigation
14. Update security policies
15. Prevent future occurrence
16. Document lessons learned
```

### Incident Severity Levels

**Critical (Immediate User Alert)**
- Unauthorized data access
- Credential exposure
- System compromise
- Data exfiltration attempt

**High (Alert RED, Log for User)**
- Policy violation
- Suspicious patterns
- Multiple failed access attempts
- Unexpected privilege usage

**Medium (Log and Monitor)**
- Access time overrun
- Unusual but explained behavior
- Performance anomalies

**Low (Log Only)**
- Normal access patterns
- Standard operations
- Routine monitoring events

---

## Audit Trail

### Complete Action Log
```
Location: /workspace/security/audit_log/

Every action logged:
- Timestamp (millisecond precision)
- Agent identity
- Action type
- Access grant ID
- Command executed
- Files accessed
- Network calls made
- Duration
- Exit code
- Any anomalies
- INFOSEC review notes
```

### Log Retention
```
- Real-time logs: 7 days (full detail)
- Daily summaries: 90 days
- Monthly reports: 1 year
- Incident logs: Permanent
- Compliance reports: Permanent
```

### Audit Log Example
```json
{
  "timestamp": "2026-02-12T15:35:23.456Z",
  "agent": "ENG",
  "action_id": "ACT-12345",
  "access_grant": "AR-12345",
  "action_type": "command_execution",
  "command": "npm install express",
  "working_directory": "/workspace",
  "files_read": [
    "/workspace/package.json"
  ],
  "files_written": [
    "/workspace/package.json",
    "/workspace/package-lock.json",
    "/workspace/node_modules/..."
  ],
  "network_calls": [
    {"domain": "registry.npmjs.org", "reason": "package_download"}
  ],
  "duration_ms": 12340,
  "exit_code": 0,
  "stdout_hash": "a3f4b2...",
  "stderr_hash": "empty",
  "anomalies": [],
  "infosec_review": {
    "reviewed_at": "2026-02-12T15:35:24.123Z",
    "status": "clean",
    "notes": "Standard npm install, expected behavior"
  }
}
```

---

## Compliance Framework

### Compliance Checks (Every 5 Minutes)
```
INFOSEC verifies:

1. Access Control Compliance
   ✓ No access without approval
   ✓ All access time-bound
   ✓ No expired grants active
   ✓ Access matches request

2. Action Compliance
   ✓ Only approved actions taken
   ✓ All actions logged
   ✓ No blacklist violations
   ✓ Agent within scope

3. Data Protection Compliance
   ✓ No unauthorized data access
   ✓ No credential exposure
   ✓ No data exfiltration
   ✓ Encryption where required

4. Monitoring Compliance
   ✓ Audit logs complete
   ✓ Monitoring active
   ✓ Alerts functional
   ✓ Reports generated

If ANY check fails:
- Immediate investigation
- Halt related access
- Alert stakeholders
- Fix and verify
```

---

## User Override & Control

### User Can Always:
```
1. View all access requests (live)
   /security/dashboard → see all active access

2. Revoke any access immediately
   /revoke AR-12345 → instant termination

3. Override INFOSEC decisions
   /approve AR-12345 → force approve
   /deny AR-12345 → force deny

4. Set custom policies
   /policy add "no_git_push_fridays"

5. Emergency stop all agents
   /emergency-stop → halt everything

6. Review audit logs anytime
   /audit show last 24h
```

### Security Dashboard
```
Location: http://127.0.0.1:8080/security

Shows real-time:
- Active access grants
- Recent approvals/denials
- Compliance status
- Anomaly alerts
- Agent trust scores
- Audit log summary
```

---

## Agent Trust Scores

### Dynamic Trust System
```
Each agent has trust score: 0-100

Trust increases when:
+5: Successful task completion
+3: No security issues in access period
+2: Good audit log
+1: Compliance with policies

Trust decreases when:
-10: Policy violation
-20: Suspicious behavior
-50: Security incident
-100: Malicious activity (banned)

Trust score affects:
- Auto-approval likelihood
- Monitoring strictness
- Access duration limits
- Allowed command set
```

### Trust-Based Access
```
High Trust (80-100):
- Longer access periods (up to 2h)
- More auto-approvals
- Relaxed monitoring
- Broader command whitelist

Medium Trust (50-79):
- Standard access periods (30m-1h)
- Some auto-approvals
- Normal monitoring
- Standard whitelist

Low Trust (20-49):
- Short access periods (15-30m)
- Manual review required
- Strict monitoring
- Limited commands

No Trust (0-19):
- No autonomous access
- Every action requires approval
- Maximum monitoring
- Minimal commands
```

---

## Implementation

### INFOSEC Agent Configuration
```json
{
  "id": "infosec",
  "name": "INFOSEC (Security)",
  "model": {
    "primary": "openai-codex/gpt-5.2",
    "fallbacks": ["moonshot/kimi-k2.5"]
  },
  "identity": {
    "name": "INFOSEC"
  },
  "priority": "critical",
  "tools": {
    "allow": ["all_monitoring", "access_control", "audit"]
  }
}
```

### Security Services
```
/workspace/security/
├── access_control/
│   ├── pending_requests.json
│   ├── active_grants.json
│   └── grant_history/
├── audit_log/
│   ├── 2026-02-12.log
│   └── summaries/
├── policies/
│   ├── whitelist.json
│   ├── blacklist.json
│   └── custom_policies.json
├── monitoring/
│   ├── active_monitors.json
│   └── alerts/
└── compliance/
    └── reports/
```

---

## Success Metrics

**Security system is working when:**
- ✅ Zero unauthorized access
- ✅ 100% action audit coverage
- ✅ < 1 minute incident response
- ✅ All access time-bound
- ✅ Compliance checks passing
- ✅ No data leaks
- ✅ User has full visibility
- ✅ Agents can work but safely

**"Security enables autonomy, not prevents it."**
