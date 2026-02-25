# Exec Approvals Stage B — Per-Agent Minimal Allowlists

**Status:** PENDING (awaiting OPS/INFOSEC coordination)
**Ticket:** TICKET-20260224-072 (Stage A complete; Stage B deferred to follow-up P2)
**Created:** 2026-02-25T04:56:21Z

## Overview

Stage A (completed): Removed global wildcards and broad patterns from exec-approvals.json. Deny-by-default restored.

Stage B (this document): Define minimal per-agent binary allowlists. Each agent gets only the tools it needs, no shells/interpreters, no directory globs.

## Conservative Minimal Allowlists (Recommended)

### OPS Agent
**Purpose:** Infrastructure monitoring, cron management, log inspection
**Minimal binaries:**
- `/opt/homebrew/bin/openclaw` — gateway control
- `/usr/bin/python3` — scripting
- `/usr/bin/node` — scripting
- `/usr/bin/git` — version control
- `/usr/bin/grep` — log search
- `/usr/bin/sed` — text processing
- `/usr/bin/tail` — log tail
- `/usr/bin/head` — log head
- `/usr/bin/tee` — output tee
- `/usr/bin/jq` — JSON processing
- `/bin/cat` — file read
- `/bin/ls` — directory listing

**Deny:** shells (`bash`, `zsh`, `sh`), interpreters (`ruby`, `perl`), package managers

### ENG Agent
**Purpose:** Code execution, testing, git operations
**Minimal binaries:**
- `/usr/bin/git` — version control
- `/usr/bin/node` — Node.js runtime
- `/usr/bin/python3` — Python runtime
- `/usr/bin/npm` — package manager (if needed)

**Deny:** shells, sudo, system commands

### INFOSEC Agent
**Purpose:** Security review, audit, verification
**Minimal binaries:**
- `/usr/bin/grep` — pattern search
- `/usr/bin/jq` — JSON inspection
- `/bin/cat` — file read
- `/usr/bin/openssl` — crypto verification (if needed)

**Deny:** shells, write operations, system commands

### Other Agents (RESEARCH, FINANCE, ZEN, HATAKE)
**Default:** Empty allowlist (no exec access by default)
**Rationale:** These agents don't need shell access for their primary functions

---

## Implementation Steps

1. **OPS drafts minimal allowlists** (use template above)
2. **INFOSEC reviews** for security gaps
3. **Apply to exec-approvals.json:**
   ```json
   {
     "agents": {
       "ops": {
         "pattern": [
           "/opt/homebrew/bin/openclaw",
           "/usr/bin/python3",
           "/usr/bin/node",
           "/usr/bin/git",
           "/usr/bin/grep",
           "/usr/bin/sed",
           "/usr/bin/tail",
           "/usr/bin/head",
           "/usr/bin/tee",
           "/usr/bin/jq",
           "/bin/cat",
           "/bin/ls"
         ]
       },
       "eng": {
         "pattern": [
           "/usr/bin/git",
           "/usr/bin/node",
           "/usr/bin/python3",
           "/usr/bin/npm"
         ]
       },
       "infosec": {
         "pattern": [
           "/usr/bin/grep",
           "/usr/bin/jq",
           "/bin/cat",
           "/usr/bin/openssl"
         ]
       }
     }
   }
   ```
4. **Test:** Verify each agent can execute required commands
5. **Document:** Update LEARNINGS.md with per-agent allowlist rationale

---

## Closure Criteria

- [ ] OPS drafts minimal allowlists (no shells/globs)
- [ ] INFOSEC reviews and approves
- [ ] Allowlists applied to exec-approvals.json
- [ ] `openclaw doctor` passes (no config errors)
- [ ] Each agent tested with required commands
- [ ] TICKET-20260224-072 Stage B marked RESOLVED
- [ ] LEARNINGS.md updated with rationale

---

## Notes

- **No shells:** Prevents arbitrary command execution
- **No globs:** Prevents directory traversal
- **No interpreters:** Prevents script injection
- **Explicit paths:** Only absolute paths, no `$PATH` lookup
- **Minimal set:** Each agent gets only what it needs
- **Deny-by-default:** Anything not in allowlist is blocked

---

Last updated: 2026-02-25T04:56:21Z
