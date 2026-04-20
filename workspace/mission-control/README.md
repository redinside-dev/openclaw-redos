# 🦞 AgentOS Mission Control

Real-time web UI for monitoring and controlling your AI company.

## 🚀 Quick Start

```bash
cd ~/.openclaw/workspace/mission-control
./start.sh
```

Then open: **http://127.0.0.1:8080/**

## 📊 What You Can See (Real-Time)

### ✅ Live Agent Monitoring
- **7 agents** with real-time status (active/idle/offline)
- Each agent shows:
  - Current model being used
  - Role & department
  - Activity indicator (pulsing dot when active)

### 📈 Live Metrics Dashboard
- **Active agents count** (how many working right now)
- **Active sessions** (current conversations)
- **Running tasks** (tasks in progress)
- **Models available** (total AI models configured)

### 💰 Real-Time Cost Tracking
**Daily Budget:**
- Visual progress bar
- Current spend vs limit ($X / $2.00)
- Percentage used

**Monthly Budget:**
- Visual progress bar
- Current spend vs limit ($X / $30.00)
- Percentage used
- Fixed monthly costs ($460)

### 🎯 Current Tasks
Real-time list of what your agents are doing:
- Task name
- Assigned agent
- Status (running/queued/done)
- Color-coded by status

### 📊 Model Usage Statistics
Bar charts showing today's API calls:
- Codex gpt-5.2 calls
- Claude Code calls
- Perplexity Pro calls
- Z.AI glm-4.7 calls (with cost)
- Ollama local calls

### 📜 Event Log
Live stream of recent events:
- Tasks started/completed
- Projects created
- Commands received
- Agent assignments
- Errors & warnings

### 🎛️ Controls
- **Refresh Now** - Force update data
- **Open Gateway Dashboard** - OpenClaw native UI
- **View Full Logs** - Detailed logs viewer
- **Settings** - Configuration panel (coming soon)

## 🔄 Auto-Refresh

The dashboard **auto-refreshes every 3 seconds** to show live data.

Watch your agents work in real-time!

## 🌐 URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Mission Control** | http://127.0.0.1:8080/ | Real-time monitoring UI |
| **Gateway API** | http://127.0.0.1:18789/ | OpenClaw native dashboard |
| **Gateway API Status** | http://127.0.0.1:18789/api/status | JSON status endpoint |

## 🔧 Future Features (Coming Soon)

- **Admin Controls:**
  - Pause/resume agents
  - Change routing profiles
  - Adjust budget limits
  - Kill stuck tasks

- **Flow Visualization:**
  - Live flow diagram showing:
    - Command → HATAKE → Router → Agents → Output
  - Animated task flow
  - Real-time model selection visualization

- **Advanced Analytics:**
  - Cost breakdown by agent
  - Model performance stats
  - Response time graphs
  - Success/failure rates

- **Notifications:**
  - Desktop notifications for events
  - Budget alerts
  - Task completion alerts

## 📝 Technical Details

**Tech Stack:**
- React 18 (via CDN)
- Vanilla JavaScript
- Python HTTP Server
- OpenClaw Gateway API

**Data Source:**
- Polls OpenClaw Gateway API every 3 seconds
- Parses agent status, sessions, and system info
- Falls back to cached data if gateway offline

## 🛠️ Customization

Edit `index.html` to customize:
- Refresh interval (default 3000ms)
- Color scheme
- Layout
- Metrics displayed

## 🐛 Troubleshooting

**"Failed to connect to gateway"**
- Make sure OpenClaw is running: `openclaw gateway status`
- Start if needed: `openclaw gateway start`

**"No data showing"**
- Check browser console (F12) for errors
- Verify gateway is accessible: `curl http://127.0.0.1:18789/api/status`

**"Port 8080 already in use"**
- Kill existing server: `pkill -f "python3 -m http.server 8080"`
- Or change port in start.sh

---

**Your AI company dashboard is live!** 🚀
