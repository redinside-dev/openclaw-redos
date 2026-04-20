# Skill: command-catalog

**Per-agent command classification and enforcement. Load before every exec/bash/shell call by OPS or ENG.**

## Protocol

Before every `exec`, `bash`, or shell call by OPS or ENG:

1. **Load your agent's YAML** — `commands-ops.yaml` (OPS) or `commands-eng.yaml` (ENG)
2. **Check deny_patterns** — if command matches any deny pattern: HARD FAIL immediately
   - Log `{ "ts": "ISO", "agent": "{id}", "tier": "DENIED", "reason": "deny_pattern_match", "command": "..." }` to `workspace/logs/audit.jsonl`
   - Do NOT proceed. Open a ticket. Notify RED.
3. **Check tier_overrides** — find the matching pattern to get risk tier
   - If no match: default tier is L2 for ENG, L3 for OPS
4. **Apply tier policy from maker-checker/SKILL.md** — auto/INFOSEC/Telegram
5. **Check rate_limits** — read `workspace/tmp/exec-rate-{agentId}.json`
   - If limit exceeded: wait until next window, notify RED
6. **After exec:** if exit code is non-zero:
   - Log failure to `workspace/logs/audit.jsonl`
   - Execute `rollback.on_failure` action
   - Notify `rollback.notify` target

## Rate Limit State File

Format for `workspace/tmp/exec-rate-{agentId}.json`:
```json
{
  "agentId": "ops",
  "minuteCount": 0,
  "minuteStart": "ISO",
  "hourCount": 0,
  "hourStart": "ISO"
}
```
Reset `minuteCount` when `minuteStart` is > 60s ago. Reset `hourCount` when `hourStart` is > 3600s ago.

## Hard-Deny Patterns (All Agents)

These are universal across all agents — never execute regardless of tier:
- `rm -rf /` or `rm -rf ~` (system-destructive)
- Any command piped to `/dev/sda` or raw block devices
- `mkfs` on any device
- `curl ... | sh` or `wget ... | bash` (arbitrary remote exec)
- Commands accessing `/etc/passwd`, `/etc/shadow`, `~/.ssh/` for writes

## Notes

- If the command catalog YAML cannot be read: HARD FAIL and alert RED
- If a command partially matches both deny_patterns and tier_overrides: deny_patterns win
- Log every classified command to `workspace/logs/audit.jsonl` with tier before execution
