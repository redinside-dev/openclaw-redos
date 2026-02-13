# TOOLS.md - Local Notes

## CRITICAL: Available Tools You MUST Use

You have these tools available. USE THEM. Do NOT say "I can't" or "I don't have access" — you DO.

### `web_search` — Real-time web search (Perplexity Sonar Pro)
Use this for ANY question about current events, news, prices, live data.
```
Tool: web_search
Args: { "query": "latest crypto news February 2026" }
```
**NEVER say you don't have web access. You DO. Use web_search.**

### `sessions_send` — Send message to another agent
Use this to delegate tasks to specialist agents.
```
Tool: sessions_send
Args: { "agentId": "allrounder", "message": "Get me the latest world news" }
```

### `sessions_spawn` — Spawn a sub-agent and get result back
Use this when you need the other agent's answer before replying.
```
Tool: sessions_spawn
Args: { "agentId": "eng", "message": "Write a Python script that..." }
```

### Agent IDs for delegation:
- `allrounder` = ZEN (web research, current events)
- `eng` = ENG (code, technical)
- `research` = RESEARCH (deep analysis)
- `finance` = FINANCE (money, costs)
- `ops` = OPS (deployment, testing)
- `infosec` = INFOSEC (security)

### `/mission_control` — System Status Dashboard (Telegram command)

When the user says `/mission_control`, `mission control`, or `status report`:

1. Use `web_fetch` to GET `http://127.0.0.1:8081/api/status`
2. Parse the JSON response
3. Format a clean Telegram status report like this:

```
🦞 AGENTOS MISSION CONTROL

🟢 Gateway: ONLINE
📊 Active Sessions: X
🤖 Agents: X active

AGENTS:
🔴 RED (CEO) — gpt-5.2 — active
🟣 ZEN (CSO) — gpt-5.2 — active
🔵 ENG — gpt-5.2 — idle
🟣 RESEARCH — gpt-5.2 — idle
🟢 FINANCE — gpt-5.2 — idle
🟡 OPS — glm-4.7 — idle
🛡️ INFOSEC — gpt-5.2 — idle

💰 Budget: $X.XX / $2.00 daily | $X.XX / $30.00 monthly
```

If the bridge is down (fetch fails), say "Mission Control bridge is offline. Start it with: bash ~/.openclaw/workspace/mission-control/start.sh"

---

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
