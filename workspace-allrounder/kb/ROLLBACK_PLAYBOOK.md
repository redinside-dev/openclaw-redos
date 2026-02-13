# Rollback Playbook

Last updated: 2026-02-09 (America/Toronto)

This is the default rollback mechanism for any change.

## 0) Principle
**Never change two things at once.** Patch one field/one file, restart/test, then proceed.

## 1) Config changes (OpenClaw)
Config path (this machine): `~/.openclaw/openclaw.json`

### Before you patch
- Create a timestamped backup:
  - `cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak-YYYYMMDD-HHMM`

### Apply minimal patch
- Prefer `gateway config.patch` (not CLI subcommand).

### Verify
- `openclaw status`
- Run a small functional test (e.g., web_search query).

### Rollback
- Restore backup file:
  - `cp ~/.openclaw/openclaw.json.bak-YYYYMMDD-HHMM ~/.openclaw/openclaw.json`
- Restart gateway.

## 2) Repo / code changes
### Before you change
- Ensure clean baseline:
  - `git status`

### Commit discipline
- Small commits with clear message.
- Push after verify.

### Rollback
- `git revert <commit>` for shared branches.
- `git reset --hard <sha>` only if not pushed.

## 3) Cron job changes
### Before you change
- Export current cron job list (ids + schedule + payload summary).

### Rollback
- Disable the new job first.
- Restore previous job JSON/config if needed.
