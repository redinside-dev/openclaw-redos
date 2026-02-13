# 🏗️ OpenClaw Architecture Analysis & Evolution Plan

## Current System vs Proposed Architecture

### What We Have Now (v3.0 Resilient)

```
Telegram Bridge
    ↓
Resilient Gateway (with retry)
    ↓
Smart Router V2 (cost optimization)
    ↓
Direct Model API Calls (Ollama/Anthropic)
    ↓
Response (with fallback)

Supporting Systems:
- Error Handler (recovery strategies)
- DevOps Agent (monitoring)
- Ticket System (internal tracking)
- Task Scheduler (background jobs)
```

**Strengths:**
✅ Fast and simple
✅ Direct routing (low latency)
✅ Error recovery working
✅ Cost optimization
✅ Monitoring active

**Weaknesses:**
❌ No formal coordination
❌ No structured planning
❌ No validation gate (OPS)
❌ No learning from failures
❌ No single dashboard
❌ No Telegram-driven admin
❌ Limited traceability

---

### Proposed OpenClaw Orchestration (Enterprise Grade)

```
Telegram/CLI
    ↓
HATAKE (Parser Agent)
    ↓ [Structured Brief]
ED/RED (Front Controller)
    ↓ [Execution Plan]
Specialist Agents (ENG, RESEARCH, FINANCE, OPS, etc.)
    ↓ [Results]
OPS (Validation Gate)
    ↓ [Approved/Failed]
ED/RED (Final Assembly)
    ↓
Telegram Response

Supporting Systems:
- ScrumMaster (error → issue → SLA → fix → learn)
- Mission Control (single dashboard)
- Knowledge Engine (long-term learning)
- Control Plane (Telegram admin)
- Change Manager (safe upgrades)
```

**Strengths:**
✅ Formal coordination (ED/RED)
✅ Structured planning
✅ Validation gate (quality)
✅ Mandatory error learning
✅ Full traceability
✅ Single dashboard
✅ Telegram-driven admin
✅ Safe upgrade mechanism
✅ SLA enforcement
✅ Knowledge accumulation

**Weaknesses:**
❌ More complex
❌ Higher latency (multiple hops)
❌ Single point of failure (ED/RED)
❌ More coordination overhead
❌ Bigger implementation effort

---

## Hybrid Architecture: Best of Both Worlds

### Design Philosophy

**Keep:**
- Direct routing for speed (current system)
- Smart cost optimization (current system)
- Resilient error handling (current system)

**Add:**
- HATAKE parser for structure
- ED/RED coordinator for complex tasks
- OPS validation gate
- ScrumMaster for error learning
- Mission Control dashboard
- Control Plane for Telegram admin

**Strategy: Two-Track System**

```
Simple Track (Fast Path):
  Telegram → HATAKE → Smart Router → Ollama → Response
  Use for: Simple queries, single-agent tasks

Complex Track (Orchestrated Path):
  Telegram → HATAKE → ED/RED → Multi-Agent → OPS → ED/RED → Response
  Use for: Complex tasks requiring coordination

Both tracks share:
  - Error Handler → ScrumMaster → Ticket System
  - Mission Control (observability)
  - Knowledge Engine (learning)
  - Control Plane (admin)
```

---

## Component Specifications

### 1. SYSTEM ROLES & RESPONSIBILITIES

#### YOU (User)
- **Role:** Initiator
- **Interface:** Telegram, CLI
- **Permissions:** Based on role (Owner, Admin, Operator, Viewer)
- **Actions:**
  - Send tasks/questions
  - View status (/status, /trace)
  - Admin commands (/admin, /upgrade, /policy)
  - Suggest improvements (/suggest)

#### HATAKE (Parser Agent)
- **Role:** Message Intelligence
- **Responsibility:**
  - Parse raw user message
  - Detect intent, entities, complexity
  - Create Structured Brief
  - Route to appropriate track (fast vs orchestrated)
- **Output:**
  ```json
  {
    "brief_id": "brief-123",
    "original_message": "...",
    "intent": "code_generation",
    "entities": ["language:python", "task:web_scraper"],
    "complexity": "high",
    "track": "orchestrated",
    "suggested_agents": ["ENG", "OPS"],
    "constraints": {
      "budget": 0.01,
      "max_time": 300000
    }
  }
  ```

#### ED/RED (Front Controller)
- **Role:** Orchestrator & Coordinator
- **Responsibility:**
  - Receive Structured Brief
  - Create Execution Plan
  - Delegate to specialist agents
  - Coordinate multi-agent collaboration
  - Assemble final response
  - Handle exceptions and retries
- **Functions:**
  - `plan()` - Create execution plan
  - `delegate()` - Assign tasks to agents
  - `coordinate()` - Route agent-to-agent communication
  - `assemble()` - Combine results
  - `escalate()` - Handle failures
- **Output:**
  ```json
  {
    "plan_id": "plan-456",
    "job_id": "job-789",
    "steps": [
      {
        "step_id": "step-1",
        "agent": "ENG",
        "task": "write_python_scraper",
        "dependencies": [],
        "timeout": 120000
      },
      {
        "step_id": "step-2",
        "agent": "OPS",
        "task": "validate_code",
        "dependencies": ["step-1"],
        "timeout": 30000
      }
    ],
    "rollback_strategy": "retry_with_different_agent"
  }
  ```

#### Specialist Agents (ENG, RESEARCH, FINANCE, OPS, etc.)
- **Role:** Domain Experts
- **Responsibility:**
  - Execute assigned tasks
  - Request help from ED/RED if stuck
  - Return structured results
  - Never communicate directly with each other
- **Examples:**
  - **ENG**: Code generation, debugging, technical tasks
  - **RESEARCH**: Information gathering, analysis
  - **FINANCE**: Cost analysis, budget tracking
  - **OPS**: Validation, testing, quality checks
  - **INFOSEC**: Security review, vulnerability checks

#### OPS (Validation Gate)
- **Role:** Quality Gatekeeper
- **Responsibility:**
  - Validate all outputs before delivery
  - Run tests/checks
  - Pass/Fail decisions
  - Return work for revision if needed
- **Validation Rules:**
  - Code: syntax, style, security
  - Text: completeness, accuracy, tone
  - Data: format, schema, integrity
- **Output:**
  ```json
  {
    "validation_id": "val-123",
    "status": "passed" | "failed",
    "checks": [
      {"check": "syntax", "result": "pass"},
      {"check": "security", "result": "pass"},
      {"check": "completeness", "result": "fail", "reason": "missing error handling"}
    ],
    "action": "approve" | "revise" | "reject"
  }
  ```

#### ScrumMaster (Error Governance)
- **Role:** Error Lifecycle Manager
- **Responsibility:**
  - Log EVERY error automatically
  - Create issue tracker entry
  - Assign owner/team
  - Start SLA clock ("round clock")
  - Enforce escalation
  - Ensure fix + OPS revalidation
  - Close only after verified
  - Create knowledge base entry
  - Generate regression test
- **SLA Levels:**
  - **Critical:** 1 hour
  - **High:** 4 hours
  - **Medium:** 24 hours
  - **Low:** 7 days
- **Output:**
  ```json
  {
    "issue_id": "ISSUE-123",
    "error_id": "err-456",
    "job_id": "job-789",
    "trace_id": "trace-abc",
    "severity": "high",
    "assigned_to": "devops",
    "sla_deadline": "2026-02-13T15:30:00Z",
    "status": "open",
    "escalation_path": ["devops", "engineering", "cto"],
    "learning_entry_id": null  // filled after fix
  }
  ```

#### Admin Controller (Control Plane)
- **Role:** System Administration
- **Responsibility:**
  - Handle Telegram admin commands
  - Enforce permissions
  - Process change requests
  - Manage configuration
  - Audit all admin actions
- **Commands:**
  - `/admin status` - System health
  - `/admin restart <component>` - Restart service
  - `/admin config <key> <value>` - Change config
  - `/policy routing <rule>` - Update routing
  - `/policy budget <amount>` - Set budget

#### Change Manager (Upgrade Safety)
- **Role:** Safe System Evolution
- **Responsibility:**
  - Handle upgrade requests
  - Run regression tests
  - Staged rollout (10%→50%→100%)
  - Monitor metrics
  - Auto-rollback on failure
  - Release notes
- **Upgrade Flow:**
  ```
  1. Discover: current vs target version
  2. Propose: show changes, risks
  3. Test: regression test suite
  4. Approve: require confirmation
  5. Stage: 10% traffic
  6. Monitor: error rate, latency
  7. Expand: 50%, then 100%
  8. Verify: all metrics green
  9. Close: release notes + audit
  ```

#### Knowledge Engine (Learning System)
- **Role:** Institutional Memory
- **Responsibility:**
  - Store learned patterns
  - Failure modes + solutions
  - Prompt templates
  - Routing rules
  - Regression tests
  - Best practices
- **Storage:**
  ```json
  {
    "entry_id": "know-123",
    "type": "failure_pattern",
    "pattern": "Ollama timeout on large prompts",
    "solution": "chunk prompt into smaller parts",
    "regression_test": "test_large_prompt_chunking",
    "confidence": 0.95,
    "uses": 47,
    "last_validated": "2026-02-13T10:00:00Z"
  }
  ```

#### Mission Control (Single Dashboard)
- **Role:** Unified Observability
- **Responsibility:**
  - Single dashboard with tabs (NOT multiple dashboards)
  - Real-time updates (WebSocket)
  - Full traceability
  - Deep linking
- **Tabs:**
  1. **Overview** - System health, metrics
  2. **Live Ops** - Real-time job execution
  3. **Jobs** - All jobs, searchable
  4. **Job Detail** - Trace view, timeline
  5. **Issues** - Error tracker
  6. **Agents** - Agent status, load
  7. **Knowledge Base** - Learned patterns
  8. **SLA/Incidents** - SLA tracking
  9. **Settings/Policies** - Configuration

---

### 2. COMMAND PIPELINE (END-TO-END FLOW)

#### Simple Track (Fast Path - 80% of queries)

```
1. Telegram Message
   "What is 2+2?"
   ↓
2. HATAKE (Parser)
   - Detects: simple_calculation
   - Complexity: low
   - Track: fast
   - Creates: Structured Brief
   ↓
3. Smart Router V2
   - Selects: ollama/llama3.1:8b (free, fast)
   - Reason: simple query
   ↓
4. Resilient Handler
   - Calls: Ollama API
   - Retry: 3 attempts if fail
   - Fallback: alternative model
   ↓
5. Response Assembly
   - Format: user-friendly
   - Add: job_id, trace link
   ↓
6. Telegram Response
   "2+2 = 4"
   Job: job-123
   Trace: http://mission.control/trace/job-123

Background (Async):
   - Log to Mission Control
   - Update metrics
   - Store in Job Memory
   - ScrumMaster monitors (no action if success)
```

**Latency:** 2-3 seconds

#### Complex Track (Orchestrated Path - 20% of queries)

```
1. Telegram Message
   "Build a Python web scraper for news sites with error handling and tests"
   ↓
2. HATAKE (Parser)
   - Detects: complex_code_generation
   - Entities: python, web_scraper, testing
   - Complexity: high
   - Track: orchestrated
   - Suggested agents: [ENG, OPS]
   - Creates: Structured Brief
   ↓
3. ED/RED (Front Controller)
   - Reviews brief
   - Creates Execution Plan:
     {
       steps: [
         {id: "1", agent: "ENG", task: "design_scraper"},
         {id: "2", agent: "ENG", task: "implement_code", depends: ["1"]},
         {id: "3", agent: "ENG", task: "add_error_handling", depends: ["2"]},
         {id: "4", agent: "ENG", task: "write_tests", depends: ["2"]},
         {id: "5", agent: "OPS", task: "validate_all", depends: ["3","4"]}
       ]
     }
   - Starts execution
   ↓
4. Step 1: ENG (Design)
   ED/RED → ENG: TASK(design_scraper)
   ENG → ED/RED: RESULT(design_doc)
   ↓
5. Step 2: ENG (Implement)
   ED/RED → ENG: TASK(implement_code, context: design_doc)
   ENG → ED/RED: RESULT(code.py)
   ↓
6. Step 3: ENG (Error Handling)
   ED/RED → ENG: TASK(add_error_handling, context: code.py)
   ENG → ED/RED: RESULT(code_v2.py)
   ↓
7. Step 4: ENG (Tests)
   ED/RED → ENG: TASK(write_tests, context: code_v2.py)
   ENG → ED/RED: RESULT(tests.py)
   ↓
8. Step 5: OPS (Validation)
   ED/RED → OPS: REVIEW(code_v2.py, tests.py)
   OPS runs:
     - Syntax check
     - Security scan
     - Test execution
     - Code quality
   OPS → ED/RED: RESULT(status: PASS, notes: "all checks passed")
   ↓
9. ED/RED (Assembly)
   - Combines all outputs
   - Formats response
   - Adds trace links
   ↓
10. Telegram Response
    "✅ Web scraper built successfully!

    📦 Files:
    - scraper.py (main code)
    - tests.py (unit tests)
    - README.md (usage)

    ✅ All checks passed:
    - Syntax: ✓
    - Security: ✓
    - Tests: ✓ (5/5 passing)

    Job: job-456
    Trace: http://mission.control/trace/job-456"

Background (Async):
   - Log entire trace to Mission Control
   - Update agent metrics
   - Store in Job Memory + Knowledge Memory
   - ScrumMaster monitors (no issues detected)
```

**Latency:** 3-5 minutes (acceptable for complex tasks)

#### Error Scenario (with Recovery)

```
1. Telegram: "Write Python API server"
   ↓
2. HATAKE: complex task, orchestrated track
   ↓
3. ED/RED: Creates plan
   ↓
4. ENG: Attempts to write code
   ↓
5. ERROR: Ollama timeout (prompt too large)
   ↓
6. Error Handler: Detects OLLAMA_TIMEOUT
   ↓
7. ScrumMaster (Automatic):
   a. Logs error with full context
   b. Creates issue: ISSUE-789
   c. Severity: HIGH (blocks user request)
   d. Assigns to: devops
   e. SLA: 4 hours
   f. Checks Knowledge Engine: "Large prompt timeout"
   g. Finds solution: "Chunk prompt into smaller parts"
   h. Applies fix automatically
   ↓
8. Retry: ENG with chunked prompt
   ↓
9. Success: Code generated
   ↓
10. OPS: Validates (PASS)
   ↓
11. Response: Delivered to user
   ↓
12. ScrumMaster (Post-Fix):
   a. Marks issue as RESOLVED
   b. Updates knowledge entry (confidence +1)
   c. No regression test needed (already exists)
   d. Closes issue

User Experience:
   - Sees slight delay (extra 2 seconds for retry)
   - Gets successful response
   - Never knows error occurred
   - System learned and improved
```

---

### 3. MESSAGE PROTOCOL (STRICT)

#### Message Envelope

All messages between components must use this envelope:

```json
{
  "message_id": "msg-abc123",
  "type": "TASK" | "RESULT" | "QUESTION" | "REQUEST_HELP" | "REVIEW" | "ERROR_LOGGED" | "ISSUE_CREATED" | "CHANGE_PROPOSAL" | "CHANGE_APPROVED" | "CHANGE_APPLIED" | "FINAL",
  "from": "agent_name",
  "to": "agent_name",
  "job_id": "job-789",
  "trace_id": "trace-xyz",
  "span_id": "span-123",
  "parent_span_id": "span-122",
  "timestamp": "2026-02-13T14:00:00Z",
  "payload": { /* type-specific data */ },
  "metadata": {
    "priority": "high" | "normal" | "low",
    "timeout_ms": 120000,
    "retry_count": 0,
    "max_retries": 3
  }
}
```

#### Message Types

**TASK** - Assign work to an agent
```json
{
  "type": "TASK",
  "payload": {
    "task_id": "task-456",
    "task_type": "code_generation",
    "description": "Write Python web scraper",
    "context": { /* relevant data */ },
    "constraints": {
      "max_lines": 500,
      "style": "PEP8"
    }
  }
}
```

**RESULT** - Return completed work
```json
{
  "type": "RESULT",
  "payload": {
    "task_id": "task-456",
    "status": "success" | "partial" | "failed",
    "output": { /* result data */ },
    "confidence": 0.95,
    "took_ms": 45000
  }
}
```

**QUESTION** - Ask for clarification (routed through ED/RED)
```json
{
  "type": "QUESTION",
  "payload": {
    "question": "Should the scraper handle JavaScript-rendered pages?",
    "options": ["yes", "no", "optional"],
    "blocking": true
  }
}
```

**REQUEST_HELP** - Agent stuck, needs assistance
```json
{
  "type": "REQUEST_HELP",
  "payload": {
    "stuck_on": "Cannot parse complex HTML structure",
    "attempted": ["BeautifulSoup", "lxml"],
    "need_agent": "RESEARCH"  // ED/RED will route
  }
}
```

**REVIEW** - Submit for validation
```json
{
  "type": "REVIEW",
  "payload": {
    "artifact": "code.py",
    "content": "...",
    "checks_requested": ["syntax", "security", "tests"]
  }
}
```

**ERROR_LOGGED** - Error occurred and logged
```json
{
  "type": "ERROR_LOGGED",
  "payload": {
    "error_id": "err-789",
    "severity": "high",
    "agent": "ENG",
    "task_id": "task-456",
    "error_message": "Ollama timeout",
    "snapshot": { /* inputs/outputs */ }
  }
}
```

**ISSUE_CREATED** - ScrumMaster created issue
```json
{
  "type": "ISSUE_CREATED",
  "payload": {
    "issue_id": "ISSUE-123",
    "error_id": "err-789",
    "assigned_to": "devops",
    "sla_hours": 4,
    "deadline": "2026-02-13T18:00:00Z"
  }
}
```

**FINAL** - Complete response to user
```json
{
  "type": "FINAL",
  "payload": {
    "response": "Your web scraper is ready!",
    "attachments": ["code.py", "tests.py"],
    "job_id": "job-789",
    "trace_link": "http://mission.control/trace/job-789"
  }
}
```

#### Routing Rules (All through ED/RED)

```
ALLOWED:
  User → HATAKE
  HATAKE → ED/RED
  ED/RED → Any Agent
  Any Agent → ED/RED
  ED/RED → OPS
  OPS → ED/RED
  ED/RED → User

FORBIDDEN (Direct):
  Agent → Agent (must go through ED/RED)
  User → Agent (must go through HATAKE)
  Agent → User (must go through ED/RED)
```

#### Stop Rules (Prevent Loops)

```
1. Max Rounds: 20 per job
2. Max Retries: 3 per task
3. Timeout: 10 minutes per job
4. Budget: $1 per job (configurable)
5. Loop Detection:
   - If same agent called >3 times with same input → STOP
   - If job not progressing (same state >5 rounds) → ESCALATE
6. Circuit Breaker:
   - If agent fails >5 times in 1 minute → DISABLE agent for 5 minutes
```

---

### 4. MEMORY / LEARNING MODEL

#### Two-Tier Memory System

**Job Memory (Short-Term - Per Request)**
```json
{
  "job_id": "job-789",
  "external_request_id": "telegram-123",
  "user_id": "user-456",
  "created_at": "2026-02-13T14:00:00Z",
  "brief": { /* Structured Brief */ },
  "plan": { /* Execution Plan */ },
  "trace": [ /* All messages */ ],
  "results": {
    "step-1": { /* ... */ },
    "step-2": { /* ... */ }
  },
  "ops_validation": {
    "status": "passed",
    "checks": [ /* ... */ ]
  },
  "final_response": "...",
  "metrics": {
    "total_time_ms": 180000,
    "cost": 0.0,
    "agents_used": ["ENG", "OPS"],
    "retries": 1
  },
  "ttl": 86400  // 24 hours, then archive
}
```

**Knowledge Memory (Long-Term - Institutional)**
```json
{
  "knowledge_entries": [
    {
      "entry_id": "know-001",
      "type": "failure_pattern",
      "pattern": "Ollama timeout on prompts >8000 tokens",
      "context": {
        "agent": "ENG",
        "task_type": "code_generation",
        "model": "ollama/qwen2.5-coder:7b"
      },
      "solution": {
        "method": "chunk_prompt",
        "implementation": "Split into <5000 token chunks",
        "success_rate": 0.98
      },
      "learned_from": ["job-123", "job-456", "job-789"],
      "regression_test": "test_large_prompt_chunking",
      "confidence": 0.95,
      "uses": 47,
      "created_at": "2026-02-10T10:00:00Z",
      "last_used": "2026-02-13T14:30:00Z"
    },
    {
      "entry_id": "know-002",
      "type": "prompt_template",
      "name": "code_review_prompt",
      "template": "Review this code for: {checks}...",
      "usage": {
        "agent": "OPS",
        "task_type": "validation"
      },
      "success_rate": 0.99,
      "uses": 234
    },
    {
      "entry_id": "know-003",
      "type": "routing_rule",
      "rule": "Python code tasks → ENG with qwen2.5-coder",
      "conditions": {
        "intent": "code_generation",
        "language": "python"
      },
      "performance": {
        "avg_quality": 4.8,
        "avg_time_ms": 180000
      },
      "uses": 156
    }
  ]
}
```

#### Learning Rules

**Nothing Learned Until OPS Passes:**
```
1. Agent produces result
2. OPS validates
3. IF OPS PASS:
     - Store successful pattern in Knowledge Memory
     - Update confidence scores
     - Create/update prompt templates
4. IF OPS FAIL:
     - Log failure pattern
     - DO NOT learn wrong approach
     - ScrumMaster creates issue
5. After Issue Fixed + OPS Revalidates:
     - NOW store corrected pattern
     - Create regression test
     - Update knowledge base
```

**"No Error Ignored" Policy:**
```
EVERY error must:
  1. Be logged with full context
  2. Create issue (ScrumMaster)
  3. Assign owner
  4. Start SLA clock
  5. Get fixed
  6. Get OPS revalidation
  7. Become knowledge entry
  8. Generate regression test
  9. Only then be closed
```

---

### 5. ERROR GOVERNANCE (MANDATORY)

#### Error Record Structure

```json
{
  "error_id": "err-abc123",
  "timestamp": "2026-02-13T14:35:22.123Z",
  "job_id": "job-789",
  "trace_id": "trace-xyz",
  "span_id": "span-456",
  "agent": "ENG",
  "task_id": "task-123",
  "severity": "critical" | "high" | "medium" | "low",
  "error_type": "OLLAMA_TIMEOUT",
  "error_message": "Ollama API timeout after 600000ms",
  "snapshot": {
    "inputs": {
      "prompt": "...",
      "model": "ollama/qwen2.5-coder:7b",
      "max_tokens": 4096
    },
    "outputs": null,
    "context": { /* relevant job data */ }
  },
  "stack_trace": "...",
  "recovery_attempted": {
    "strategy": "retry_with_chunking",
    "attempts": 2,
    "success": true
  },
  "impact": {
    "user_affected": true,
    "job_delayed_ms": 12000,
    "cost_wasted": 0.0
  }
}
```

#### ScrumMaster Error Lifecycle

```
1. ERROR OCCURS
   ↓
2. ERROR LOGGED (automatic)
   - Full context captured
   - Error record created
   ↓
3. SCRUMMASTER CREATES ISSUE
   - Issue ID: ISSUE-123
   - Severity classification
   - Auto-assign based on error type:
     * Gateway errors → devops
     * Model errors → devops
     * Code errors → engineering
     * Validation errors → ops
     * Unknown → engineering
   ↓
4. SLA CLOCK STARTS ("Round Clock")
   - Critical: 1 hour
   - High: 4 hours
   - Medium: 24 hours
   - Low: 7 days
   - Timer visible in Mission Control
   ↓
5. ASSIGNED TEAM NOTIFIED
   - Telegram notification to team
   - Dashboard alert
   - Include: error context, trace link, deadline
   ↓
6. TEAM WORKS ON FIX
   - Updates issue with progress
   - Can request more time (with approval)
   - Can escalate if blocked
   ↓
7. FIX IMPLEMENTED
   - Code changed
   - Configuration updated
   - Workaround deployed
   ↓
8. OPS REVALIDATION (MANDATORY)
   - OPS must test the fix
   - Run regression tests
   - Verify error doesn't recur
   - Status: PASS or FAIL
   ↓
9. IF OPS PASS:
   - Knowledge base entry created
   - Regression test added
   - Issue status → RESOLVED
   - SLA clock stopped
   ↓
10. SCRUMMASTER VERIFIES
   - No recurrence for 24 hours
   - Regression test passes
   - Knowledge entry complete
   - Issue status → CLOSED
   ↓
11. RETROSPECTIVE (Weekly)
   - Review closed issues
   - Identify patterns
   - Update policies
   - Improve processes
```

#### Escalation Path

```
IF SLA deadline approaching (75% time used):
  → Alert assigned team
  → CC team lead

IF SLA deadline missed:
  → Auto-escalate to next level:
     devops → engineering lead → CTO
  → Increase priority: medium → high → critical
  → Increase check-in frequency

IF critical issue >2 hours unresolved:
  → Page on-call engineer
  → Executive notification
  → Consider rollback/hotfix
```

---

### 6. MISSION CONTROL (SINGLE DASHBOARD ONLY)

#### Dashboard Structure

**One Dashboard with Tabs Inside (NOT multiple dashboards)**

```
┌─────────────────────────────────────────────────────────────┐
│ Mission Control                            [Search] [User]  │
├─────────────────────────────────────────────────────────────┤
│ [Overview] [Live Ops] [Jobs] [Issues] [Agents] [Knowledge] │
│           [SLA/Incidents] [Settings]                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TAB CONTENT AREA                                          │
│                                                             │
│                                               [Drawer] ──→ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Tab Specifications

**1. Overview Tab**
```
┌─────────────────────────────────────────────────────────┐
│ System Health: ●  ●  ●  ●  ●  ●  ●                      │
│                 Gateway  Ollama  ED/RED  Agents  ...     │
│                                                          │
│ Live Metrics (Last 5 min):                              │
│   Requests:  247  (↑ 15%)                               │
│   Success:   242  (98%)                                 │
│   Errors:    5    (2%)                                  │
│   Avg Time:  2.3s                                       │
│   Cost:      $0.00                                      │
│                                                          │
│ Open Issues:                                             │
│   Critical: 0                                           │
│   High:     2  [View →]                                 │
│   Medium:   5                                           │
│   Low:      12                                          │
│                                                          │
│ Agent Status:                                            │
│   HATAKE:  ● Active  (247 parses)                       │
│   ED/RED:  ● Active  (89 orchestrations)                │
│   ENG:     ● Active  (45 tasks)                         │
│   OPS:     ● Active  (52 validations)                   │
│   ...                                                    │
└─────────────────────────────────────────────────────────┘
```

**2. Live Ops Tab (Real-Time)**
```
┌─────────────────────────────────────────────────────────┐
│ Live Job Execution (WebSocket Updates)                  │
│                                                          │
│ job-789 | Python Web Scraper          [View Detail →]  │
│   14:30:15  ● HATAKE parsed brief                       │
│   14:30:16  ● ED/RED created plan (5 steps)             │
│   14:30:17  ⟳ ENG step-1 (design) ...                  │
│   14:32:45  ✓ ENG step-1 complete                       │
│   14:32:46  ⟳ ENG step-2 (implement) ...               │
│                                                          │
│ job-790 | Simple Calculation          [View Detail →]  │
│   14:35:22  ● Fast track (Ollama)                       │
│   14:35:24  ✓ Complete (2s)                             │
│                                                          │
│ job-791 | Complex Analysis            [View Detail →]  │
│   14:36:10  ● ED/RED orchestrating                      │
│   14:36:11  ⟳ RESEARCH gathering data...               │
└─────────────────────────────────────────────────────────┘
```

**3. Jobs Tab**
```
┌─────────────────────────────────────────────────────────┐
│ [Search Jobs]  [Filter: All ▼]  [Date: Today ▼]        │
│                                                          │
│ Job ID    User     Type          Status   Time    Cost  │
│ ─────────────────────────────────────────────────────── │
│ job-791  user-1   complex       running  3m     $0.00  │
│ job-790  user-2   simple        success  2s     $0.00  │
│ job-789  user-1   code_gen      success  5m     $0.00  │
│ job-788  user-3   research      failed   2m     $0.00  │
│ ...                                                      │
│                                                          │
│ [← Prev] Page 1 of 45 [Next →]                          │
└─────────────────────────────────────────────────────────┘
```

**4. Job Detail Tab (Trace View)**
```
┌─────────────────────────────────────────────────────────┐
│ Job: job-789 | Python Web Scraper                       │
│ User: user-1 | Telegram: @username                      │
│ Status: ✓ Success | Time: 5m 23s | Cost: $0.00         │
│                                                          │
│ [Timeline] [Trace Graph] [Messages] [Errors] [Metrics]  │
│                                                          │
│ Timeline View:                                           │
│ ├─ 14:30:15  Telegram message received                  │
│ ├─ 14:30:15  HATAKE parsed (50ms)                       │
│ ├─ 14:30:16  ED/RED planned (100ms)                     │
│ ├─ 14:30:17  ENG step-1 start                           │
│ │  └─ 14:32:45  ENG step-1 complete (148s)              │
│ ├─ 14:32:46  ENG step-2 start                           │
│ │  └─ 14:34:20  ENG step-2 complete (94s)               │
│ ├─ 14:34:21  ENG step-3 start                           │
│ │  └─ 14:35:10  ENG step-3 complete (49s)               │
│ ├─ 14:35:11  OPS validation start                       │
│ │  └─ 14:35:35  OPS passed (24s)                        │
│ └─ 14:35:40  Response delivered                         │
│                                                          │
│ Trace IDs:                                               │
│   Job: job-789                                           │
│   Trace: trace-xyz                                       │
│   Spans: 12                                              │
│   Link: http://mission.control/trace/job-789            │
└─────────────────────────────────────────────────────────┘
```

**5. Issues Tab**
```
┌─────────────────────────────────────────────────────────┐
│ [Filter: Open ▼] [Priority: All ▼] [Assignee: All ▼]   │
│                                                          │
│ ID       Priority  Assignee   Description      SLA      │
│ ─────────────────────────────────────────────────────── │
│ ISSUE-15  High     devops    Ollama timeout   1h left  │
│ ISSUE-14  High     engineer  Validation fail  30m left │
│ ISSUE-13  Medium   ops       Test failure     22h left │
│ ...                                                      │
│                                                          │
│ SLA Status:                                              │
│   On Track:  15                                          │
│   At Risk:   2                                           │
│   Overdue:   0                                           │
└─────────────────────────────────────────────────────────┘
```

**6. Agents Tab**
```
┌─────────────────────────────────────────────────────────┐
│ Agent      Status  Load    Avg Time  Success  Errors    │
│ ─────────────────────────────────────────────────────── │
│ HATAKE    ● Active  High   50ms      100%     0         │
│ ED/RED    ● Active  Med    200ms     99.5%    2         │
│ ENG       ● Active  High   3.2m      98%      5         │
│ OPS       ● Active  Med    30s       99.8%    1         │
│ RESEARCH  ● Active  Low    2m        97%      8         │
│ FINANCE   ● Active  Low    1m        100%     0         │
│ ...                                                      │
│                                                          │
│ Circuit Breakers:                                        │
│   All agents operational                                 │
└─────────────────────────────────────────────────────────┘
```

**7. Knowledge Base Tab**
```
┌─────────────────────────────────────────────────────────┐
│ [Search Knowledge]  [Type: All ▼]  [Sort: Uses ▼]       │
│                                                          │
│ Entry          Type            Confidence  Uses  Action  │
│ ─────────────────────────────────────────────────────── │
│ Large prompt   failure_pattern   95%      47   [View]  │
│ Code review    prompt_template   99%      234  [View]  │
│ Python routing routing_rule      98%      156  [View]  │
│ ...                                                      │
│                                                          │
│ Recent Additions (Last 7 days):                          │
│   5 new patterns learned                                 │
│   12 templates updated                                   │
│   3 routing rules added                                  │
└─────────────────────────────────────────────────────────┘
```

#### Global Features

**Global Search:**
```
Search bar at top:
  - Search across: Jobs, Issues, Agents, Knowledge
  - Autocomplete with suggestions
  - Advanced filters
  - Deep link results
```

**Right-Side Drawer:**
```
Click any item → drawer slides in from right
  - Quick preview
  - Key details
  - Actions (view full, close issue, etc.)
  - Related items
  - Deep link
```

**Deep Linking:**
```
Every entity has a permanent URL:
  - Job: /job/job-789
  - Issue: /issue/ISSUE-123
  - Trace: /trace/trace-xyz
  - Agent: /agent/ENG
  - Knowledge: /knowledge/know-001

Shareable, bookmarkable, always valid
```

**Real-Time Updates (WebSocket):**
```
Everything is an event stream:
  - Job status changes → UI updates
  - New errors → Issues tab badge
  - Agent status changes → Agents tab updates
  - Metrics → Overview refreshes

No page refresh needed, always current
```

#### Linking Rules (Strict)

```
JOB ↔ TRACE:
  - Every job has one trace
  - Trace links back to job
  - One-to-one relationship

TRACE ↔ ERRORS:
  - Trace contains error spans
  - Errors link back to trace
  - One-to-many relationship

ERRORS ↔ ISSUES:
  - Each error creates one issue
  - Issue links to error
  - One-to-one relationship

ISSUES ↔ KNOWLEDGE:
  - Fixed issue creates knowledge entry
  - Knowledge entry references issue(s)
  - One-to-many relationship

JOBS ↔ KNOWLEDGE:
  - Jobs that succeed contribute to knowledge
  - Knowledge applied to new jobs
  - Many-to-many relationship
```

---

### 7. TRACEABILITY FROM TELEGRAM (END-TO-END)

#### Identifier Hierarchy

```
external_request_id (Telegram origin)
  ↓
job_id (our internal job)
  ↓
trace_id (distributed trace)
  ↓
span_id (individual operation)
    ↓
    parent_span_id (tree structure)
```

#### Example Trace Tree

```
Telegram: msg-telegram-abc123
  ↓
Job: job-789
  ↓
Trace: trace-xyz
  ↓
  Span: span-1 (HATAKE parse)
    ↓ parent: null
  Span: span-2 (ED/RED plan)
    ↓ parent: span-1
  Span: span-3 (ENG step-1)
    ↓ parent: span-2
    ├─ Span: span-4 (Ollama call)
    │    ↓ parent: span-3
    └─ Span: span-5 (Response processing)
         ↓ parent: span-3
  Span: span-6 (ENG step-2)
    ↓ parent: span-2
  Span: span-7 (OPS validation)
    ↓ parent: span-2
    └─ Span: span-8 (Run tests)
         ↓ parent: span-7
  Span: span-9 (ED/RED assemble)
    ↓ parent: span-2
  Span: span-10 (Telegram response)
    ↓ parent: span-9
```

#### Telegram Integration

**User Commands:**
```
/status [job_id]
  → Returns current job status
  → Example:
    Job: job-789
    Status: ⟳ In Progress (Step 3/5)
    Agent: ENG
    Elapsed: 2m 15s
    Link: http://mission.control/job/job-789

/trace [job_id]
  → Returns trace link
  → Example:
    Trace: http://mission.control/trace/job-789
    Spans: 12
    Duration: 5m 23s
    Errors: 0

/jobs
  → Lists recent jobs
  → Example:
    Recent Jobs:
    • job-791 ⟳ Running (3m)
    • job-790 ✓ Success (2s)
    • job-789 ✓ Success (5m)

/issues
  → Lists open issues
  → Example:
    Open Issues:
    • ISSUE-15 [High] Ollama timeout (1h left)
    • ISSUE-14 [High] Validation fail (30m left)
```

**Auto-Response Format:**
```
When job completes, Telegram response includes:
━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Your request is complete!

[Response content here]

Job: job-789
Trace: http://mission.control/trace/job-789
Time: 5m 23s | Cost: $0.00

Commands:
/status job-789 - Check status
/trace job-789 - View trace
━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 8. TELEGRAM-DRIVEN IMPROVEMENTS & ADMIN CONTROL PLANE

#### Control Plane vs Execution Plane

```
EXECUTION PLANE (handles user requests):
  - HATAKE
  - ED/RED
  - Specialist Agents
  - OPS
  - Smart Router
  - Models

CONTROL PLANE (manages the system):
  - Admin Controller
  - Change Manager
  - Knowledge Engine
  - ScrumMaster (governance)
  - Mission Control (observability)
```

#### Telegram Admin Commands

**1. /suggest** - Propose enhancement
```
User: /suggest Add support for voice messages

Admin Controller:
  1. Creates enhancement proposal
  2. Assigns to: product team
  3. Status: PROPOSED
  4. Returns:
     Enhancement: ENH-123
     Title: Voice message support
     Status: Proposed
     Review: http://mission.control/enhancement/ENH-123
```

**2. /admin** - System operations
```
User: /admin status

Response:
━━━━━━━━━━━━━━━━━━━━━━━━━
🔧 System Status

Services:
  Gateway:   ● Running
  Ollama:    ● Running
  ED/RED:    ● Running
  Agents:    ● 7/7 Active

Performance:
  Requests:  247 (last 5m)
  Success:   98%
  Avg Time:  2.3s

Issues:
  Open:      19
  Critical:  0
  Overdue:   0
━━━━━━━━━━━━━━━━━━━━━━━━━

More: /admin help
```

**3. /upgrade** - OpenClaw upgrade
```
User: /upgrade check

Response:
━━━━━━━━━━━━━━━━━━━━━━━━━
📦 OpenClaw Upgrade

Current:  v3.0 Resilient
Latest:   v3.1 Enhanced
Released: 2026-02-10

Changes:
  • Improved error recovery
  • Faster Ollama API calls
  • Better cost tracking

Risk: LOW
Tests: 95 passing

Actions:
  /upgrade propose v3.1
  /upgrade details v3.1
━━━━━━━━━━━━━━━━━━━━━━━━━
```

**4. /policy** - Configuration changes
```
User: /policy budget daily 10

Response:
━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Policy Change

Change:    Daily budget
From:      $5.00
To:        $10.00
Risk:      MEDIUM (increases spending)

⚠️ Requires Approval
Confirm: /policy approve POLICY-123

Or cancel: /policy cancel POLICY-123
━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Roles & Permissions

```
OWNER:
  - Full access
  - Can: everything
  - Approve: high-risk changes

ADMIN:
  - System management
  - Can: restart, configure, upgrade
  - Approve: medium-risk changes

OPERATOR:
  - Daily operations
  - Can: view, restart services
  - Approve: low-risk changes

VIEWER:
  - Read-only
  - Can: view status, traces
  - Approve: nothing

Mapping:
  Telegram ID → Role
  Stored in: config/roles.json
  Enforced by: Admin Controller
```

#### Change Lifecycle

```
1. PROPOSED
   - User submits via /suggest, /policy, /upgrade
   - Admin Controller creates change record
   - Assigns reviewer based on type
   ↓
2. ASSESSED
   - Reviewer evaluates:
     * Risk level (low/medium/high)
     * Impact (users, performance, cost)
     * Tests needed
     * Rollback plan
   - Status: ASSESSMENT_COMPLETE
   ↓
3. APPROVED (if needed)
   - High-risk: requires Owner approval
   - Medium-risk: requires Admin approval
   - Low-risk: auto-approved
   - Status: APPROVED
   ↓
4. STAGED
   - Change Manager prepares:
     * Regression tests
     * Staged rollout plan (10%→50%→100%)
     * Monitoring thresholds
     * Rollback procedure
   - Status: STAGED
   ↓
5. ROLLED OUT
   - Stage 1: 10% traffic (5 minutes)
   - Monitor: error rate, latency, cost
   - IF threshold exceeded → AUTO ROLLBACK
   - IF green → Stage 2: 50% traffic (15 minutes)
   - IF green → Stage 3: 100% traffic
   - Status: DEPLOYED
   ↓
6. VERIFIED
   - OPS validates:
     * All tests passing
     * No regression
     * Metrics within bounds
     * User feedback positive
   - Status: VERIFIED
   ↓
7. CLOSED
   - Generate release notes
   - Update documentation
   - Add to audit log
   - Notify users
   - Status: CLOSED
```

#### High-Risk Actions (2-Step Confirmation)

```
Commands requiring confirmation:
  - /admin restart gateway (downtime risk)
  - /policy budget [significant change] (cost risk)
  - /upgrade [major version] (stability risk)
  - /admin delete [data] (data loss risk)

Flow:
  1. User: /admin restart gateway
  2. Response:
     ⚠️ WARNING: System Restart

     Impact: 30s downtime
     Risk: MEDIUM
     Affects: All users

     Confirm:
     /admin confirm RESTART-123

     Expires in 60 seconds

  3. User: /admin confirm RESTART-123
  4. Action executed with audit log entry
```

---

### 9. OPENCLAW UPGRADE PLAYBOOK (SAFE)

#### Version Management

```
VERSIONS:
  - Current: v3.0 Resilient
  - Latest Stable: v3.1 Enhanced
  - Beta: v3.2 Experimental

STABILITY LEVELS:
  - Stable: Production-ready, thoroughly tested
  - Beta: Feature-complete, testing phase
  - Experimental: Bleeding edge, not recommended

UPGRADE POLICY:
  - "Latest stable" = highest stable version only
  - Beta/Experimental require explicit opt-in
  - No automatic upgrades without approval
```

#### Safe Upgrade Flow

```
1. DISCOVER
   User: /upgrade check
   ↓
   System:
     - Current: v3.0
     - Target: v3.1 (stable)
     - Changes: [list]
     - Risk: LOW
     - Tests: 95 passing
   ↓
2. PROPOSE
   User: /upgrade propose v3.1
   ↓
   Change Manager:
     - Creates upgrade proposal: UPGRADE-123
     - Status: PROPOSED
     - Requires: Admin approval
   ↓
3. REGRESSION TEST SUITE
   Change Manager:
     - Runs full regression tests
     - Tests: 95/95 passing
     - Performance: within 5% of baseline
     - Status: TESTS_PASSED
   ↓
4. APPROVE
   Admin: /upgrade approve UPGRADE-123
   ↓
   Status: APPROVED
   ↓
5. STAGED ROLLOUT
   Stage 1 (10% traffic):
     - Deploy v3.1 to 10% of requests
     - Monitor for 5 minutes:
       * Error rate: <2%
       * Latency: <+10%
       * Cost: <+5%
     - IF threshold exceeded → ROLLBACK
     - IF green → continue
   ↓
   Stage 2 (50% traffic):
     - Deploy v3.1 to 50% of requests
     - Monitor for 15 minutes
     - Same thresholds
     - IF exceeded → ROLLBACK
     - IF green → continue
   ↓
   Stage 3 (100% traffic):
     - Deploy v3.1 to 100% of requests
     - Monitor for 30 minutes
     - Same thresholds
     - IF exceeded → ROLLBACK
     - IF green → complete
   ↓
6. MONITOR
   Change Manager:
     - Real-time dashboard showing:
       * Current stage
       * Error rate trend
       * Latency trend
       * Cost trend
       * Rollback button (manual override)
   ↓
7. AUTO ROLLBACK (if needed)
   IF any threshold exceeded:
     - Immediate rollback to v3.0
     - Notification to admin
     - Issue created: "Upgrade v3.1 failed"
     - Status: ROLLED_BACK
   ↓
8. VERIFY
   OPS:
     - All tests passing
     - No user complaints
     - Metrics stable
     - Status: VERIFIED
   ↓
9. CLOSE
   Change Manager:
     - Generate release notes
     - Update documentation
     - Send notification:
       "✅ OpenClaw upgraded to v3.1"
     - Add to audit log
     - Status: CLOSED
```

#### Monitoring Thresholds

```
ROLLBACK TRIGGERS:
  - Error rate: >5% (baseline +3%)
  - Latency P95: >+20% vs baseline
  - Cost: >+10% vs baseline
  - User reports: >3 complaints in 5 minutes
  - Manual override: Admin clicks rollback

METRICS COLLECTED:
  - Every 10 seconds during rollout
  - Compared to 7-day baseline
  - Displayed in Mission Control
  - Logged for analysis
```

---

### 10. STOP RULES / SAFEGUARDS

#### Budget & Token Limits

```
PER JOB:
  - Max cost: $1.00 (configurable)
  - Max tokens: 100,000
  - Max time: 10 minutes
  - IF exceeded → STOP + notification

PER DAY:
  - Max cost: $10.00 (configurable)
  - Max jobs: 10,000
  - IF exceeded → throttle (slow down)
  - IF critical → queue jobs

PER USER:
  - Max concurrent: 3 jobs
  - Max per hour: 100 requests
  - IF exceeded → rate limit + message
```

#### Max Rounds & Retries

```
PER JOB:
  - Max rounds: 20
  - Max retries per task: 3
  - Max agent calls: 50
  - IF exceeded → ESCALATE

LOOP DETECTION:
  - Same agent + same input >3 times → STOP
  - Same state >5 rounds → ESCALATE
  - Infinite recursion detection → STOP

TIMEOUT RULES:
  - HATAKE parse: 5s
  - ED/RED plan: 10s
  - Agent task: 5m
  - OPS validation: 1m
  - Total job: 10m
```

#### Circuit Breakers

```
PER AGENT:
  - IF failures >5 in 1 minute:
    → OPEN circuit breaker
    → Disable agent for 5 minutes
    → Use fallback agent

PER MODEL:
  - IF Ollama fails >3 times:
    → Switch to alternative model
    → Notify devops

PER USER:
  - IF abuse detected:
    → Temporary ban (1 hour)
    → Notify admin
```

#### Escalation Rules

```
AUTOMATIC ESCALATION:
  1. Task fails >3 times → ED/RED escalates to ScrumMaster
  2. Job stuck >5 minutes → Notify admin
  3. Critical error → Page on-call
  4. Budget 90% used → Alert owner
  5. SLA overdue → Escalate to next level

ESCALATION PATH:
  Agent → ED/RED → ScrumMaster → Team Lead → CTO
```

#### Immutable Audit Log

```
LOGGED EVENTS (cannot be deleted):
  - All user requests (Telegram messages)
  - All admin commands (/admin, /policy, /upgrade)
  - All approvals
  - All changes (configuration, upgrades)
  - All errors
  - All escalations
  - All rollbacks

STORAGE:
  - Append-only log
  - Cryptographically signed
  - Periodic backups
  - Tamper-evident

ACCESS:
  - Owner: full access
  - Admin: read-only
  - Audit: automated reports
```

#### Tool Permissions Model

```
AGENTS CAN:
  ENG:
    - Read/write code
    - Call Ollama
    - Access Knowledge Engine (read)

  OPS:
    - Read code
    - Run tests
    - Validate outputs
    - Access Knowledge Engine (read/write)

  RESEARCH:
    - Web search
    - Read documents
    - Access Knowledge Engine (read)

  FINANCE:
    - Read cost data
    - Generate reports
    - Access budget settings (read-only)

AGENTS CANNOT:
  - Access system configuration
  - Modify other agents
  - Delete data
  - Access user credentials
  - Call admin functions

ENFORCEMENT:
  - Permission checks before every action
  - Logged in audit trail
  - Violation → immediate stop + alert
```

---

## Summary: Hybrid Architecture Benefits

### What We Keep (Fast & Simple):
1. ✅ Direct Ollama API calls
2. ✅ Smart cost optimization
3. ✅ Resilient error handling
4. ✅ Fast routing for simple queries

### What We Add (Enterprise & Governance):
1. ✅ HATAKE for intelligent parsing
2. ✅ ED/RED for complex orchestration
3. ✅ OPS validation gate
4. ✅ ScrumMaster error governance
5. ✅ Mission Control dashboard
6. ✅ Telegram admin control
7. ✅ Knowledge engine learning
8. ✅ Safe upgrade mechanism

### Result:
**Best of Both Worlds** - Fast for simple tasks, governed for complex tasks, always learning, always improving.

---

## Next Steps

1. **Phase 1: Foundation** (Week 1)
   - Add HATAKE parser
   - Add track routing (fast vs orchestrated)
   - Keep existing fast path working

2. **Phase 2: Orchestration** (Week 2)
   - Implement ED/RED controller
   - Add OPS validation
   - Complex track working

3. **Phase 3: Governance** (Week 3)
   - Enhance ScrumMaster with SLA
   - Add Knowledge Engine
   - Learning from failures

4. **Phase 4: Observability** (Week 4)
   - Build Mission Control dashboard
   - Full traceability
   - Real-time updates

5. **Phase 5: Admin Control** (Week 5)
   - Telegram admin commands
   - Control plane implementation
   - Safe upgrade mechanism

**Timeline:** 5 weeks to full enterprise-grade system
**Risk:** LOW (incremental, existing system keeps working)
**Benefit:** HIGH (bulletproof + governed + learning)

---

END OF SPECIFICATION
