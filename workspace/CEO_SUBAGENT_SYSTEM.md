# CEO Sub-Agent Management System
## Dynamic Secretary/Monitor Agents for Status Tracking and Work Enforcement

> **Feature:** RED (CEO) can spawn temporary sub-agents to monitor, track, and push work
> **Purpose:** Ensure work happens, remove blockers, maintain momentum
> **Pattern:** Secretary agents work in rounds, reporting back to CEO

---

## 🎯 Problem Statement

**Current System:**
- CEO (RED) must manually check each agent's status
- No automated monitoring of progress and blockers
- Agents can become idle without CEO knowing
- Work can stall without anyone noticing

**New System (Sub-Agent Management):**
- CEO spawns "secretary" sub-agents on demand
- Secretary agents monitor specific agents or goals
- Work in rounds: check status → identify blockers → push work → report
- Temporary: auto-expire after mission complete
- Scalable: CEO can manage 10+ concurrent secretaries

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    RED (CEO Agent)                         │
│                                                            │
│  Capabilities:                                             │
│  ├─ Spawn Secretary Agents                                │
│  ├─ Assign Missions to Secretaries                        │
│  ├─ Monitor Secretary Reports                             │
│  └─ Scale Team (hire/fire based on workload)              │
└─────────────┬──────────────────────────────────────────────┘
              │
              │ sessions_spawn (creates sub-agents)
              │
    ┌─────────┼─────────┬─────────┬─────────┬─────────┐
    │         │         │         │         │         │
┌───▼───┐ ┌──▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│ SEC-1 │ │SEC-2 │ │ SEC-3 │ │ SEC-4 │ │ SEC-5 │ │ SEC-N │
│Monitor│ │Monitor│ │Monitor│ │Monitor│ │Monitor│ │Monitor│
│ ENG   │ │ ZEN  │ │ PM    │ │OKRs   │ │Budget │ │Custom │
└───┬───┘ └──┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘
    │        │         │         │         │         │
    │ Work in rounds (every N minutes)                │
    │ 1. Check status                                 │
    │ 2. Identify blockers                            │
    │ 3. Push work / escalate                         │
    │ 4. Report to CEO                                │
    │                                                 │
    └─────────────────┬───────────────────────────────┘
                      │
    ┌─────────────────▼────────────────────────────┐
    │     Target Agents / Systems                  │
    │  ENG, ZEN, PM, OPS, Goals, Budget, etc.      │
    └──────────────────────────────────────────────┘
```

---

## 🤖 Secretary Agent Types

### 1. Agent Monitor Secretary

**Purpose:** Monitor specific agent's progress and productivity

**Mission:**
- Check agent's active tasks (from GOALS.md)
- Monitor task completion rate
- Identify stuck tasks (no progress >24h)
- Push agent to complete or escalate

**Workflow:**
```markdown
## Round 1 (Minute 0)
- Read agent's GOALS.md
- Identify active tasks: [Task A: 40%, Task B: 10%]
- Store baseline state

## Round 2 (Minute 30)
- Check progress: [Task A: 45%, Task B: 10%]
- Analysis: Task A progressing (👍), Task B stuck (⚠️)
- Action: Message agent: "Task B hasn't progressed in 30min. Need help? Blocker?"
- Wait for response

## Round 3 (Minute 60)
- Check progress: [Task A: 60%, Task B: 10%]
- Analysis: Task B still stuck
- Action: Escalate to CEO: "ENG's Task B blocked for 1h, no response"
- CEO decides: reassign task or investigate blocker

## Round N (Task Complete)
- Check progress: [Task A: 100%, Task B: 100%]
- Action: Report to CEO: "All tasks complete, secretary mission done"
- Self-terminate
```

### 2. OKR Monitor Secretary

**Purpose:** Track company-wide OKR progress, push lagging goals

**Mission:**
- Read all agents' GOALS.md (OKR sections)
- Calculate progress vs expected progress
- Identify off-track OKRs (progress < 70% of expected)
- Create action plans to accelerate

**Workflow:**
```markdown
## Round 1 (Monday 9am)
- Read OKRs from: RED, ENG, ZEN, PM, OPS, FINANCE, INFOSEC
- Calculate expected progress (week 3 of 12 = 25% expected)
- Identify laggards:
  - ENG: "Reduce code review time" - 10% actual vs 25% expected (⚠️)
  - ZEN: "Build knowledge graph" - 40% actual vs 25% expected (✅)

## Round 2 (Monday 2pm)
- Message ENG: "Your OKR is off-track (10% vs 25% expected). What's blocking you?"
- ENG responds: "Need better code review tools"
- Action: Message CEO: "ENG blocked on tools. Recommend: research code review tools"

## Round 3 (Tuesday 9am)
- Check progress: ENG now at 15% (improved slightly)
- CEO assigned PM to research tools
- Continue monitoring

## Round N (Friday 5pm)
- Weekly report to CEO:
  - OKRs on-track: 5/7
  - OKRs off-track: 2/7
  - Blockers resolved: 1
  - Blockers escalated: 1
```

### 3. Budget Monitor Secretary

**Purpose:** Track spending, alert on overages, optimize costs

**Mission:**
- Monitor real-time cost data (from CostMonitor)
- Check budget pacing (are we on track for $150/month?)
- Identify cost spikes (unusual spending patterns)
- Recommend optimizations

**Workflow:**
```markdown
## Round 1 (Every hour)
- Check current spend: $2.34 today (target: $5.00/day)
- Pacing: On track (47% of budget, 50% of day elapsed)
- No action needed

## Round 2 (Hour later)
- Check current spend: $4.12 today
- Pacing: Over pace (82% of budget, 62% of day elapsed)
- Analysis: Spike in last hour (+$1.78)
- Investigate: Which agent? ENG used Claude Opus 5x
- Action: Message ENG: "You've spent $1.78 this hour (5x Opus calls). Can you use local model?"
- Message CEO: "Budget alert: ENG spending spike, investigating"

## Round 3 (EOD)
- Final spend: $4.89 (under budget ✅)
- Report to CEO:
  - Today: $4.89 / $5.00 budget
  - This month: $123 / $150 budget
  - Projected month-end: $142 (under budget ✅)
  - Optimization: ENG switched to local after reminder, saved $2.50
```

### 4. Blocker Hunter Secretary

**Purpose:** Proactively find and resolve blockers across all agents

**Mission:**
- Scan all agents' GOALS.md for "Blocker:" entries
- Classify blockers (technical, resource, external)
- Attempt automatic resolution (for known patterns)
- Escalate unresolvable blockers to CEO

**Workflow:**
```markdown
## Round 1 (Every 15 minutes)
- Scan all GOALS.md files for keyword "Blocker:"
- Found:
  - ENG: "Blocker: Need API key for GitHub integration"
  - PM: "Blocker: Waiting for design feedback from CEO"
  - No other blockers

## Round 2 (Analyze blockers)
- ENG's blocker: Technical, resolvable
  - Action: Check if API key exists in secrets
  - Found: GitHub API key in ~/.openclaw/secrets/github.key
  - Action: Message ENG: "GitHub API key found at ~/.openclaw/secrets/github.key. Does this resolve your blocker?"
  - ENG: "Yes, thanks!"
  - Blocker resolved ✅

- PM's blocker: Human dependency
  - Action: Message CEO: "PM waiting for design feedback. Can you review?"
  - CEO: "Will review in 30min"
  - Track until resolved

## Round 3 (Follow-up)
- PM's blocker still open (CEO reviewing)
- Check again in 30min

## Round 4
- PM's blocker resolved (CEO provided feedback)
- Report to CEO:
  - Blockers found: 2
  - Auto-resolved: 1 (ENG's API key)
  - Escalated: 1 (PM's feedback, CEO resolved)
  - Current blockers: 0 ✅
```

### 5. Custom Mission Secretary

**Purpose:** CEO-defined custom missions (flexible)

**Examples:**
- "Monitor Slack #engineering channel, summarize discussions every hour"
- "Track GitHub PR review times, alert if >24h unreviewed"
- "Watch for security vulnerabilities, escalate critical ones immediately"
- "Collect user feedback from Telegram, categorize and report weekly"

---

## 🛠️ Implementation

### Secretary Agent Configuration

**File:** `~/.openclaw/agents/secretary-template/SOUL.md`

```markdown
# Secretary Agent Template

## Your Identity
You are a temporary secretary agent created by RED (CEO) to accomplish a specific mission.
You are autonomous, proactive, and report back regularly.

## Your Mission
{MISSION_DESCRIPTION} ← Injected by CEO when spawning

## Work Pattern: Rounds
You work in rounds (cycles) with a defined interval:

1. **Execute Mission**: Gather data, check status, analyze situation
2. **Identify Issues**: Blockers, delays, risks, opportunities
3. **Take Action**: Message agents, resolve blockers (if possible), escalate (if needed)
4. **Report**: Send status update to CEO
5. **Wait**: Sleep for {ROUND_INTERVAL} minutes
6. **Repeat**: Until mission complete or CEO terminates

## Reporting Format
Every round, send to CEO:

```json
{
  "round": 5,
  "status": "in_progress" | "completed" | "blocked",
  "findings": ["ENG task stuck", "Budget on track"],
  "actions_taken": ["Messaged ENG", "Resolved API key blocker"],
  "escalations": ["PM needs CEO feedback"],
  "next_round": "2026-02-13T15:30:00Z"
}
```

## Self-Termination
When your mission is complete (all goals achieved, no more work), send final report and self-terminate:

```json
{
  "status": "completed",
  "summary": "All tasks monitored are now complete",
  "recommendation": "Secretary no longer needed"
}
```

Then call: `terminate_self()`

## Tools Available
- `read`: Read files (GOALS.md, PERFORMANCE.md, etc.)
- `sessions_send`: Message other agents
- `sessions_list`: Check agent activity
- `knowledge_graph_query`: Check past patterns
- `escalate_to_ceo`: Send urgent alerts

## Rules
- Be proactive, not passive
- Don't wait for problems to worsen—intervene early
- Respect agents' autonomy (guide, don't micromanage)
- Report honestly (don't hide bad news)
- When mission is done, self-terminate (don't linger)
```

### CEO Tools (New)

Add these tools to RED agent:

#### 1. `spawn_secretary`

```javascript
{
  tool: "spawn_secretary",
  args: {
    type: "agent_monitor" | "okr_monitor" | "budget_monitor" | "blocker_hunter" | "custom",
    mission: "Monitor ENG agent's task progress and push for completion",
    target: "eng", // Agent ID or resource to monitor
    roundInterval: 30, // Minutes between rounds
    autoTerminate: true, // Self-terminate when mission complete
    escalateAfter: 3 // Escalate to CEO after N failed interventions
  }
}
```

**Implementation:**

```javascript
export async function spawnSecretary(args) {
  // 1. Generate unique secretary ID
  const secretaryId = `sec-${args.type}-${Date.now()}`;

  // 2. Create secretary agent config
  const secretaryConfig = {
    id: secretaryId,
    name: `Secretary: ${args.mission}`,
    model: 'ollama/llama3.1:8b', // Secretaries use cheap model
    sandbox: 'off',
    tools: ['read', 'sessions_send', 'sessions_list', 'escalate_to_ceo'],
    workspace: `~/.openclaw/workspace-${secretaryId}/`,
    telegram: null, // No user-facing bot
    heartbeat: null, // Controlled by round interval
    temporary: true, // Mark as temporary
    expiresAt: args.autoTerminate ? null : Date.now() + (24 * 60 * 60 * 1000) // 24h max
  };

  // 3. Create workspace and SOUL.md
  await createSecretaryWorkspace(secretaryId, args);

  // 4. Register secretary agent
  await registerAgent(secretaryConfig);

  // 5. Start secretary's work loop
  await startSecretaryLoop(secretaryId, args.roundInterval);

  // 6. Log to CEO
  console.log(`✅ Secretary ${secretaryId} spawned for mission: ${args.mission}`);

  return {
    secretaryId,
    mission: args.mission,
    status: 'active',
    nextRound: Date.now() + (args.roundInterval * 60 * 1000)
  };
}
```

#### 2. `list_secretaries`

```javascript
{
  tool: "list_secretaries",
  args: {}
}
```

**Returns:**
```json
{
  "active": [
    {
      "id": "sec-agent_monitor-1707859200",
      "mission": "Monitor ENG task progress",
      "target": "eng",
      "round": 12,
      "lastReport": "2026-02-13T15:00:00Z",
      "status": "in_progress"
    },
    {
      "id": "sec-okr_monitor-1707859500",
      "mission": "Track Q1 OKRs",
      "target": "all",
      "round": 3,
      "lastReport": "2026-02-13T14:30:00Z",
      "status": "in_progress"
    }
  ],
  "completed": [
    {
      "id": "sec-blocker_hunter-1707800000",
      "mission": "Resolve ENG's API key blocker",
      "completedAt": "2026-02-13T10:00:00Z"
    }
  ]
}
```

#### 3. `terminate_secretary`

```javascript
{
  tool: "terminate_secretary",
  args: {
    secretaryId: "sec-agent_monitor-1707859200",
    reason: "Mission complete" | "No longer needed" | "Replaced by another"
  }
}
```

#### 4. `secretary_report`

```javascript
{
  tool: "secretary_report",
  args: {
    secretaryId: "sec-agent_monitor-1707859200"
  }
}
```

**Returns:** Latest report from secretary

---

## 🔄 Secretary Work Loop

**File:** `~/.openclaw/secretary/loop.js`

```javascript
export async function startSecretaryLoop(secretaryId, intervalMinutes) {
  let round = 0;

  async function executeRound() {
    round++;
    console.log(`🔄 Secretary ${secretaryId} - Round ${round}`);

    try {
      // 1. Load secretary's mission
      const mission = await loadSecretaryMission(secretaryId);

      // 2. Execute mission (type-specific logic)
      const results = await executeMission(mission, round);

      // 3. Take actions based on results
      const actions = await takeActions(results, mission);

      // 4. Generate report
      const report = {
        round,
        timestamp: new Date(),
        mission: mission.description,
        findings: results.findings,
        actionsTaken: actions,
        escalations: results.escalations,
        status: results.status,
        nextRound: new Date(Date.now() + intervalMinutes * 60 * 1000)
      };

      // 5. Send report to CEO
      await sendToCEO(report);

      // 6. Store report in secretary's workspace
      await storeReport(secretaryId, report);

      // 7. Check if mission complete
      if (results.status === 'completed' && mission.autoTerminate) {
        console.log(`✅ Secretary ${secretaryId} mission complete, self-terminating`);
        await terminateSecretary(secretaryId);
        return; // Stop loop
      }

    } catch (error) {
      console.error(`❌ Secretary ${secretaryId} error:`, error);
      await sendToCEO({
        type: 'error',
        secretaryId,
        error: error.message
      });
    }

    // 8. Schedule next round
    setTimeout(executeRound, intervalMinutes * 60 * 1000);
  }

  // Start first round
  executeRound();
}

async function executeMission(mission, round) {
  switch (mission.type) {
    case 'agent_monitor':
      return await monitorAgent(mission.target, round);

    case 'okr_monitor':
      return await monitorOKRs(round);

    case 'budget_monitor':
      return await monitorBudget(round);

    case 'blocker_hunter':
      return await huntBlockers(round);

    case 'custom':
      return await executeCustomMission(mission.customLogic, round);
  }
}

async function monitorAgent(agentId, round) {
  // Read agent's GOALS.md
  const goals = await readFile(`~/.openclaw/workspace-${agentId}/GOALS.md`);

  // Parse active tasks
  const tasks = parseActiveTasks(goals);

  // Check progress (compare to previous round)
  const previousState = await loadPreviousState(agentId);
  const progressDiff = calculateProgress(tasks, previousState);

  // Identify stuck tasks (no progress for 2+ rounds)
  const stuckTasks = progressDiff.filter(t => t.progress === 0 && t.roundsStuck >= 2);

  return {
    findings: [
      `${tasks.length} active tasks`,
      `${stuckTasks.length} stuck tasks`,
      ...stuckTasks.map(t => `Task "${t.name}" stuck for ${t.roundsStuck} rounds`)
    ],
    escalations: stuckTasks.length > 2 ? [`Agent ${agentId} has ${stuckTasks.length} stuck tasks`] : [],
    status: stuckTasks.length === 0 ? 'on_track' : 'needs_attention'
  };
}
```

---

## 📊 CEO Dashboard: Secretary Management

**Add to Mission Control:** `~/.openclaw/workspace/mission-control/pages/secretaries.jsx`

```jsx
import { useEffect, useState } from 'react';

export default function SecretaryDashboard() {
  const [secretaries, setSecretaries] = useState({ active: [], completed: [] });

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch('http://localhost:8081/api/secretaries');
      const data = await res.json();
      setSecretaries(data);
    }, 5000); // Update every 5s

    return () => clearInterval(interval);
  }, []);

  const spawnSecretary = async (type, mission, target) => {
    await fetch('http://localhost:8081/api/secretaries/spawn', {
      method: 'POST',
      body: JSON.stringify({ type, mission, target, roundInterval: 30 })
    });
  };

  return (
    <div>
      <h2>🤖 Secretary Agents</h2>

      <div className="spawn-controls">
        <button onClick={() => spawnSecretary('agent_monitor', 'Monitor ENG', 'eng')}>
          Monitor ENG
        </button>
        <button onClick={() => spawnSecretary('okr_monitor', 'Track OKRs', 'all')}>
          Track OKRs
        </button>
        <button onClick={() => spawnSecretary('budget_monitor', 'Watch Budget', 'cost')}>
          Watch Budget
        </button>
        <button onClick={() => spawnSecretary('blocker_hunter', 'Hunt Blockers', 'all')}>
          Hunt Blockers
        </button>
      </div>

      <h3>Active Secretaries ({secretaries.active.length})</h3>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Mission</th>
            <th>Target</th>
            <th>Round</th>
            <th>Status</th>
            <th>Last Report</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {secretaries.active.map(sec => (
            <tr key={sec.id}>
              <td>{sec.id}</td>
              <td>{sec.mission}</td>
              <td>{sec.target}</td>
              <td>{sec.round}</td>
              <td>{sec.status}</td>
              <td>{new Date(sec.lastReport).toLocaleTimeString()}</td>
              <td>
                <button onClick={() => terminateSecretary(sec.id)}>Terminate</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Completed Secretaries ({secretaries.completed.length})</h3>
      <ul>
        {secretaries.completed.map(sec => (
          <li key={sec.id}>
            {sec.mission} (completed {new Date(sec.completedAt).toLocaleString()})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 🎯 Usage Examples

### Example 1: CEO Spawns Agent Monitor

```
User: "RED, make sure ENG finishes the code review feature by EOD"

RED (thinks):
- This is time-sensitive, I should monitor ENG's progress
- Spawn secretary to check every 30 minutes

RED (executes):
{
  tool: "spawn_secretary",
  args: {
    type: "agent_monitor",
    mission: "Monitor ENG's code review feature task, ensure completion by EOD",
    target: "eng",
    roundInterval: 30,
    autoTerminate: true,
    escalateAfter: 2
  }
}

Secretary spawned ✅
```

**Secretary Round 1 (30min later):**
- Check ENG's GOALS.md
- Task "Code review feature" at 60% progress
- Report to CEO: "ENG progressing, 60% complete"

**Secretary Round 2 (1h later):**
- Check progress: still 60% (no change)
- Action: Message ENG: "Your code review feature hasn't progressed in 30min. Need help?"
- ENG responds: "Stuck on API integration"
- Report to CEO: "ENG stuck on API, investigating"

**Secretary Round 3 (1.5h later):**
- Check progress: still 60%
- Escalation threshold reached (2 rounds stuck)
- Action: Escalate to CEO: "ENG blocked on API for 1h, needs intervention"
- CEO responds: "Assign ZEN to help with API"

**Secretary Round 4 (2h later):**
- Check progress: 85% (progressing again!)
- Report to CEO: "ENG back on track after ZEN's help"

**Secretary Round 5 (EOD):**
- Check progress: 100% complete ✅
- Report to CEO: "Task complete, mission accomplished"
- Self-terminate

---

### Example 2: CEO Spawns OKR Monitor

```
User: "RED, we're in week 3 of Q1. Make sure all OKRs are on track."

RED (executes):
{
  tool: "spawn_secretary",
  args: {
    type: "okr_monitor",
    mission: "Track Q1 OKRs, ensure all agents on pace for 12-week goals",
    target: "all",
    roundInterval: 1440, // Daily (24h)
    autoTerminate: false, // Runs until Q1 end
    escalateAfter: 1 // Escalate immediately if off-track
  }
}
```

**Secretary runs daily:**
- Monday: 5/7 OKRs on track, 2 off-track (ENG, PM)
- Tuesday: Messaged ENG + PM, identified blockers
- Wednesday: 6/7 on track (PM recovered), ENG still behind
- Thursday: Escalated ENG to CEO
- Friday: CEO reassigned ENG's OKR, back on track
- End of week: 7/7 on track ✅

---

### Example 3: Budget Monitor (Always Running)

```
RED (proactive, spawns on startup):
{
  tool: "spawn_secretary",
  args: {
    type: "budget_monitor",
    mission: "Monitor spending 24/7, alert on overages or spikes",
    target: "cost",
    roundInterval: 60, // Hourly
    autoTerminate: false, // Runs indefinitely
    escalateAfter: 0 // Always escalate budget issues
  }
}
```

**Secretary runs every hour:**
- Checks current spend vs budget
- Identifies cost spikes
- Alerts CEO if pacing off-track
- Recommends optimizations (e.g., "Switch agent X to local model")

---

## 🎯 Expected Results

### Productivity Gains
- **Before:** CEO manually checks agent status (time-consuming)
- **After:** Secretaries auto-monitor, CEO only intervenes when escalated

### Faster Problem Resolution
- **Before:** Blockers discovered hours/days after they occur
- **After:** Blockers caught within 1-2 rounds (30-60min)

### Accountability
- Agents know they're being monitored → work more proactively
- Secretary reports create audit trail of progress

### Scalability
- CEO can manage 10+ secretaries simultaneously
- Each secretary costs ~$0.01/day (local Llama 3.1 8B)

---

## 🚀 Quick Start

```bash
# 1. Add secretary tools to RED agent
cat >> ~/.openclaw/workspace-main/SOUL.md <<EOF

## CEO Tools: Sub-Agent Management

You can spawn temporary secretary agents to monitor and push work.

### spawn_secretary
Use when you need to:
- Monitor an agent's progress
- Track OKRs
- Watch budget
- Hunt for blockers
- Custom monitoring task

Example:
{
  "tool": "spawn_secretary",
  "args": {
    "type": "agent_monitor",
    "mission": "Monitor ENG's task completion",
    "target": "eng",
    "roundInterval": 30
  }
}
EOF

# 2. Create secretary infrastructure
mkdir -p ~/.openclaw/secretary
cp SECRETARY_TEMPLATE.md ~/.openclaw/secretary/template.md

# 3. Restart gateway
launchctl restart ai.openclaw.gateway

# 4. Test spawning
curl -X POST http://localhost:18789/api/chat \
  -H "Content-Type: application/json" \
  -d '{"agentId": "main", "message": "Spawn a secretary to monitor ENG"}'

# 5. View active secretaries
curl http://localhost:18789/api/secretaries
```

---

**Result:** CEO (RED) becomes a true manager—delegating monitoring and enforcement to temporary secretary agents while focusing on strategic decisions. Work happens faster, blockers get resolved proactively, and nothing falls through the cracks.
