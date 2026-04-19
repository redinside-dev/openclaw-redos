# Skill: Repo Pause Control

## Trigger phrases (RED must use this skill when these are detected in any message)
- "pause [repo]"
- "stop [repo]"
- "don't create PRs for [repo]"
- "halt [repo]"
- "resume [repo]"
- "re-enable [repo]"
- "unpause [repo]"
- "start [repo] again"
- "enable openclaw to work on [repo]"
- "pause for [N] days"
- "status of pauses"
- "what repos are paused"

## What this skill does
Manages the coding factory pause/resume system via `repo-pause-manager.py`.
This is the ONLY way to pause or resume repos — do not edit files manually.

## How to use

### Pause a repo for N days
```
exec: python3 /Users/redinside/.openclaw/scripts/repo-pause-manager.py pause <owner/repo> <days> <reason>
```
Example: user says "pause 9router for 5 days, owner complained"
→ exec: python3 /Users/redinside/.openclaw/scripts/repo-pause-manager.py pause decolua/9router 5 "owner complained about spam"

If user gives short name only (e.g. "9router"), resolve to full name using known repos:
- "9router" → decolua/9router
- "spring-ai" → spring-projects/spring-ai
- "langchain4j" → langchain4j/langchain4j
- "vibers" or "VibeVoice" → microsoft/VibeVoice

If unknown repo, use the short name as-is.

### Pause indefinitely (no time limit)
```
exec: python3 /Users/redinside/.openclaw/scripts/repo-pause-manager.py pause <owner/repo> forever <reason>
```

### Resume immediately
```
exec: python3 /Users/redinside/.openclaw/scripts/repo-pause-manager.py resume <owner/repo>
```

### Check status
```
exec: python3 /Users/redinside/.openclaw/scripts/repo-pause-manager.py status
```

## After running any command
1. Capture the output
2. Reply to the user on Telegram with the exact output message
3. Do NOT say "I'll do it" or "acknowledged" — only reply AFTER running the exec and confirming output

## Critical rule
NEVER say "paused" or "I've stopped it" without first running the exec and seeing exit code 0.
A false acknowledgment (saying you did it without doing it) is a critical failure.
The exec must run and succeed before any confirmation is sent.
