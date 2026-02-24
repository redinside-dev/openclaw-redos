# Skill Audit — 2026-02-24

## How to Find Usage Evidence

When auditing a skill, look for:

1. **Cron jobs:** Check `workspace/cron/jobs.json` for scheduled executions referencing the skill.
2. **Workspace references:** `grep -r "skill-name" workspace/` to find scripts, configs, or agent workflows using it.
3. **Scripts:** Look in `workspace/scripts/` or `skills/*/scripts/` for automation that invokes the skill.
4. **Session logs:** Check `workspace/logs/a2a-delegations.jsonl` for agent-to-agent routing that mentions the skill.
5. **Agent state files:** Review `workspace/ops/agent-status/*.json` for active tasks using the skill.

## Owner Assignment Defaults

If skill ownership is unclear:

- **Infra/cron skills** (healthcheck, mcporter, openai-whisper) → **OPS**
- **Coding/tooling skills** (coding-agent, github, gh-issues) → **ENG**
- **Research/web skills** (web_search, summarize, weather) → **RESEARCH**
- **Messaging/comms skills** (slack, apple-notes, gog) → **OPS** (comms coordinator)

---

## Skill Inventory

| Skill | Owner | Status | Usage Evidence | Notes |
|-------|-------|--------|-----------------|-------|
| apple-notes | OPS | Active | `workspace/scripts/memo-sync.sh` (daily cron) | Manages team notes; used by RED for meeting prep |
| coding-agent | ENG | Active | `workspace/logs/a2a-delegations.jsonl` (Feb 23–24: 3 spawns) | Delegated for PR reviews + refactoring tasks |
| gh-issues | ENG | Active | `workspace/cron/jobs.json` (hourly issue triage) | Monitors GitHub issues; spawns sub-agents for fixes |
| github | ENG | Active | `workspace/scripts/ci-monitor.sh` (continuous) | Checks PR status, CI runs, code review |
| gog | OPS | Idle | None found | Google Workspace integration; no active usage |
| healthcheck | OPS | Active | `workspace/cron/jobs.json` (daily 06:00 ET) | Security audit + host hardening checks |
| mcporter | OPS | Idle | None found | MCP server config/auth; no active usage |
| model-usage | RESEARCH | Active | `workspace/logs/a2a-delegations.jsonl` (Feb 24: 1 spawn) | Cost reporting; used for budget tracking |
| openai-whisper | RESEARCH | Idle | None found | Local speech-to-text; no active usage |
| skill-creator | OPS | Idle | None found | Skill packaging; no active usage |
| slack | OPS | Active | `workspace/cron/jobs.json` (standup posts) | Posts team briefs to #redos-scrum + #redos-mission-control |
| summarize | RESEARCH | Active | `workspace/logs/a2a-delegations.jsonl` (Feb 22–24: 2 spawns) | Summarizes URLs, podcasts, transcripts |
| video-frames | RESEARCH | Idle | None found | Video frame extraction; no active usage |
| weather | RESEARCH | Idle | None found | Weather forecasts; no active usage |

---

## Unused Skills (Recommended Next Actions)

| Skill | Reason Unused | Recommended Owner | Next Action |
|-------|---------------|-------------------|-------------|
| gog | No Google Workspace integration active | OPS | Evaluate: do we need Gmail/Calendar/Drive automation? If yes, assign to OPS for calendar sync + email triage. |
| mcporter | MCP servers not actively configured | OPS | Evaluate: are there MCP tools we should expose? If yes, document in `workspace/config/mcp-servers.json` + assign to OPS. |
| openai-whisper | No voice input workflows | RESEARCH | Evaluate: should we add voice-to-text for meeting transcripts? If yes, integrate with `summarize` skill + assign to RESEARCH. |
| skill-creator | No new skills being packaged | OPS | Evaluate: do we need to create custom skills? If yes, document template + assign to OPS. |
| video-frames | No video processing workflows | RESEARCH | Evaluate: should we extract frames from recorded meetings/demos? If yes, integrate with `summarize` + assign to RESEARCH. |
| weather | No location-aware workflows | RESEARCH | Evaluate: is weather relevant to team operations? If no, mark as "deprecated". If yes, integrate with calendar/location data. |

---

## Summary

**Active skills:** 8 (apple-notes, coding-agent, gh-issues, github, healthcheck, model-usage, slack, summarize)

**Idle skills:** 6 (gog, mcporter, openai-whisper, skill-creator, video-frames, weather)

**Adoption target:** Each agent picks 1 idle skill and demonstrates usage within 7 days.
- **ENG:** Consider `video-frames` for demo/meeting frame extraction.
- **OPS:** Consider `mcporter` for MCP server discovery + `gog` for calendar/email automation.
- **RESEARCH:** Consider `openai-whisper` for voice transcription + `weather` for location-aware briefings.
