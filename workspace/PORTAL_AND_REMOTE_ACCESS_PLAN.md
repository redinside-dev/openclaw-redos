# Portal & Remote Access Plan

## Current State

| Component | Status |
|-----------|--------|
| Dashboard (port 19000) | ✅ Working |
| cloudflared tunnel | ✅ Running but URL changes |
| API endpoints | ✅ Functional |
| Mobile UI | ❌ Not responsive |

## Problems Identified

1. **Cloudflare tunnel URL changes** on every restart - not usable for remote access
2. **Dashboard UI is outdated** - Version A is basic, Version B has stale data
3. **No persistent URL** - can't bookmark on phone
4. **Not mobile-optimized** - hard to use on phone

## Solution

### 1. Set Up Persistent Cloudflare Tunnel

```
- Get a free Cloudflare account
- Create a tunnel with fixed subdomain: redos-ai.trycloudflare.com
- This URL will NEVER change
```

### 2. Create New World-Class Mobile Dashboard

**Tech Stack:**
- Single HTML file with vanilla JS (no framework needed)
- Real-time SSE (Server-Sent Events) for live updates
- Mobile-first responsive design
- Dark mode by default
- PWA-ready (installable on phone)

**Features:**
- Overview: System health, agents, uptime
- Tasks: AUTONOMOUS.md with live updates
- Pipeline: Current projects, PRs
- Controls: Quick actions (restart, stop, etc.)
- Metrics: Costs, usage

### 3. What's Being Built

| File | Purpose |
|------|---------|
| `dashboard/portal.html` | New mobile-first dashboard |
| Cloudflare tunnel | Fixed URL for remote access |
| SSE integration | Real-time updates |

## Implementation Steps

1. Set up persistent Cloudflare tunnel
2. Create new portal.html with mobile-first design
3. Connect to existing API endpoints
4. Add real-time SSE updates
5. Test from phone

## Expected Result

- [ ] Access from any device: https://redos-ai.trycloudflare.com
- [ ] Mobile-optimized UI
- [ ] Real-time updates without refreshing
- [ ] System status at a glance
- [ ] Quick actions available
- [ ] No login required (behind Cloudflare auth)
