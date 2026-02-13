# Mission Control - Telegram Interface

Monitor and control your AgentOS from Telegram.

## Commands

### 📊 Monitoring Commands

**/status** - System status overview
```
Shows:
- Gateway status
- Active agents count
- Running tasks
- Budget usage
- Last update time
```

**/agents** - List all agents
```
Shows each agent:
- Name & role
- Current status (active/idle)
- Model being used
- Recent activity
```

**/budget** - Budget & costs
```
Shows:
- Daily spend vs limit
- Monthly spend vs limit
- Fixed monthly costs
- Cost breakdown by model
```

**/tasks** - Current tasks
```
Shows:
- Running tasks
- Queued tasks
- Recently completed
- Task assignments
```

**/models** - Model usage stats
```
Shows today's usage:
- Calls per model
- Costs per model
- Performance metrics
```

**/dashboard** - Get dashboard link
```
Returns: http://127.0.0.1:8080/
(Only accessible from your network)
```

### 🎛️ Control Commands

**/pause [agent_name]** - Pause an agent
```
Examples:
/pause eng        → Pause ENG agent
/pause all        → Pause all agents
```

**/resume [agent_name]** - Resume an agent
```
Examples:
/resume eng       → Resume ENG agent
/resume all       → Resume all agents
```

**/routing [profile]** - Change routing profile
```
Profiles:
/routing performance  → Best quality, ignore cost
/routing balanced     → Smart trade-off (default)
/routing cost_saver   → Minimize spend
/routing local_only   → Ollama only (offline mode)
```

**/budget set [amount]** - Adjust budget limits
```
Examples:
/budget set daily 3.00     → Set daily limit to $3
/budget set monthly 50.00  → Set monthly limit to $50
```

**/kill [task_id]** - Kill a stuck task
```
Example:
/kill TASK-001    → Cancel task TASK-001
```

**/logs [lines]** - View recent logs
```
Examples:
/logs           → Last 10 events
/logs 50        → Last 50 events
```

### 🔔 Alert Commands

**/alerts on** - Enable budget alerts
```
Get notified when:
- Daily budget hits 70%, 90%, 100%
- Monthly budget hits 90%, 100%
- Agent fails/errors
- Tasks complete
```

**/alerts off** - Disable alerts

**/notify [event_type]** - Configure notifications
```
Examples:
/notify task_complete on   → Notify on task completion
/notify budget_warning on   → Notify on budget warnings
/notify agent_error on      → Notify on agent errors
```

## Usage in Agent System

When you send a command to RED (CEO) or any agent via Telegram, they can now:

1. **Check their own status**
   - Agent: "What's my current task?"
   - Response: Pulls from Mission Control API

2. **Report to you proactively**
   - Agent sends: "💰 Daily budget at 85% ($1.70/$2.00)"
   - Agent sends: "✅ TASK-001 completed (cost: $0.00)"

3. **Request permissions**
   - Agent: "Task TASK-003 requires $2.50. Daily limit reached. Approve?"
   - You: "approved" or "denied"

## Implementation

This skill hooks into:
- OpenClaw Gateway API (http://127.0.0.1:18789/api/status)
- Mission Control backend
- Telegram bot API

### Example Responses

**`/status`**
```
🦞 AGENTOS STATUS

Gateway: ● ONLINE
Agents: 4/7 active
Tasks: 1 running, 2 queued
Sessions: 0 active

💰 Budget Today:
$1.24 / $2.00 (62%)
██████░░░░

Last update: 22:35:12
```

**`/agents`**
```
🤖 ACTIVE AGENTS (7)

🔴 RED (CEO)
   Status: ● ACTIVE
   Model: openai-codex/gpt-5.2
   Task: Planning project

🟢 HATAKE (Parser)
   Status: ● ACTIVE
   Model: ollama/qwen2.5-coder:7b
   Task: Parsing commands

🔵 ENG (Engineering)
   Status: ○ IDLE
   Model: openai-codex/gpt-5.2

🟣 RESEARCH (Intelligence)
   Status: ● ACTIVE
   Model: openai-codex/gpt-5.2 + Perplexity
   Task: Market research

🟢 FINANCE (Analyst)
   Status: ○ IDLE
   Model: openai-codex/gpt-5.2

🟡 OPS (QA/DevOps)
   Status: ○ IDLE
   Model: zai/glm-4.7

🟣 ZEN (CSO)
   Status: ○ IDLE
   Model: openai-codex/gpt-5.2
```

**`/routing cost_saver`**
```
✅ Routing profile changed

OLD: balanced
NEW: cost_saver

Profile settings:
• Quality priority: 20%
• Speed priority: 30%
• Cost priority: 50%

Effect:
- Prefer cheaper models
- Escalate to expensive models only when needed
- Auto-fallback to Ollama when possible
```

**`/pause eng`**
```
⏸ ENG agent paused

Queued tasks reassigned to:
→ TASK-003 moved to queue
→ TASK-004 moved to queue

To resume: /resume eng
```

## Remote Access Setup (Optional)

To access Mission Control from anywhere (not just local network):

### Option 1: Tailscale (Recommended)
```bash
# Enable in openclaw.json
"gateway": {
  "tailscale": {
    "mode": "on"
  }
}

# Then access via:
http://your-machine.tailnet-name.ts.net:8080/
```

### Option 2: Cloudflare Tunnel
```bash
# Install cloudflared
brew install cloudflared

# Create tunnel
cloudflared tunnel create agentos-mission-control

# Route tunnel
cloudflared tunnel route dns agentos-mission-control mission.yourdomain.com

# Run tunnel
cloudflared tunnel run agentos-mission-control --url http://localhost:8080
```

### Option 3: Share via Telegram
Send yourself a message with ngrok:
```bash
# Install ngrok
brew install ngrok

# Start tunnel
ngrok http 8080

# Copy the https URL to Telegram
# Share with: /dashboard
```

## Security Note

⚠️ **The Mission Control dashboard has NO authentication** currently.

If exposing externally, add authentication:
1. Use Tailscale (authenticated by default)
2. Add HTTP basic auth to the web server
3. Use a reverse proxy with auth (nginx, Caddy)
4. Only share the ngrok URL privately

---

**Now you can control your entire AI company from Telegram!** 🎉
