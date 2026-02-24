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

---

## What Goes Here

## Messaging transport (IMPORTANT)
- Only **Telegram** and **Slack** channels are enabled/OK on current host.
- Prefer `message` tool for reliable delivery.
  - Slack: `message(action="send", channel="slack", target="channel:<id>", message="...")`
  - Telegram: `message(action="send", channel="telegram", target="telegram:<userId>", message="...")` (or via configured delivery targets)
- If `sessions_send` times out, use `message` with explicit channel/target.

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
