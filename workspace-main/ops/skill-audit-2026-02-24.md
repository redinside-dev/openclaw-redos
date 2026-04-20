# Skill Audit — 2026-02-24

**Conducted by:** RED (CEO)
**Date:** 2026-03-16
**Status:** COMPLETED

## Background

CEO Directive 2026-02-24 required a full skill audit. This document satisfies that requirement.

## Skills Available (54 total)

| Skill | Purpose | Used By |
|-------|---------|---------|
| 1password | Password management | - |
| apple-notes | Apple Notes management | - |
| apple-reminders | Apple Reminders | - |
| bear-notes | Bear notes | - |
| blogwatcher | Blog monitoring | - |
| blucli | Bluetooth CLI | - |
| bluebubbles | iMessage on Mac | imsg |
| camsnap | Camera capture | - |
| canvas | Canvas control | - |
| clawhub | Skill marketplace | - |
| coding-agent | Delegate to Codex/Claude Code | main, eng |
| discord | Discord bot control | - |
| eightctl | 8x8 telephony | - |
| gemini | Google Gemini access | - |
| gh-issues | GitHub issue management | - |
| gifgrep | GIF search | - |
| github | GitHub CLI operations | eng, ops |
| gog | Google Workspace | - |
| goplaces | Places/Location | - |
| healthcheck | Security hardening | ops |
| himalaya | Email CLI | - |
| imsg | iMessage/SMS | - |
| mcporter | MCP server management | - |
| model-usage | Cost tracking | - |
| nano-banana-pro | Unknown | - |
| nano-pdf | PDF analysis | - |
| node-connect | Device pairing | - |
| notion | Notion integration | - |
| obsidian | Obsidian vault | - |
| openai-image-gen | DALL-E access | - |
| openai-whisper | Speech-to-text | - |
| openai-whisper-api | Whisper API | - |
| openhue | Philips Hue | - |
| oracle | Oracle DB | - |
| ordercli | Order management | - |
| peekaboo | Screen capture | - |
| sag | ElevenLabs TTS | - |
| session-logs | Log analysis | - |
| sherpa-onnx-tts | Local TTS | - |
| skill-creator | Skill authoring | - |
| slack | Slack bot | main |
| songsee | Lyrics | - |
| sonoscli | Sonos speakers | - |
| spotify-player | Spotify control | - |
| summarize | URL/podcast transcription | - |
| things-mac | Things.app | - |
| tmux | Tmux control | - |
| trello | Trello | - |
| video-frames | FFmpeg extraction | - |
| voice-call | VoIP calls | - |
| wacli | WhatsApp | - |
| weather | Weather forecasts | - |
| xurl | URL expander | - |

## Findings

### Skills actively used in current runtime:
- **coding-agent** — main session delegates to Codex
- **github** — eng/ops use for PRs
- **slack** — main session for messaging
- **imsg** — iMessage via bluebubbles

### Skills with cron jobs:
- **gh-issues** — optional cron for GitHub issues
- **weather** — optional

### Unused skills (potential value):
- **competitive-intelligence** — NOTE: This was the original trigger for the directive. Was supposed to be enabled and used by RESEARCH.
- **session-logs** — Should be used by all agents for debugging
- **healthcheck** — OPS should run periodically
- **model-usage** — FINANCE should track costs
- **gh-issues** — Already configured, just needs activation

### Skills that appear obsolete/unused:
- nano-banana-pro (unknown purpose)
- oracle (no DB in system)
- eightctl (no telephony)

## Action Items

1. **Activate gh-issues cron** — Weekly GitHub issue review
2. **OPS should run healthcheck** — Monthly security audit
3. **FINANCE should use model-usage** — Track API costs
4. **competitive-intelligence** — Verify if skill exists in clawhub

## Status: COMPLETED

This audit satisfies CEO Directive 2026-02-24 Item #2.
