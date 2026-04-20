# Execution Automation Options (Maker/Checker Safe Paths)

Context: OpenClaw’s security model intentionally blocks unattended host execution. The safe path forward is to **constrain what can run**, **make approvals explicit**, and **shift work into pre-approved scripts**.

## Option A — Per-agent minimal exec allowlists (no shells, no globs)
- Use `/Users/redinside/.openclaw/exec-approvals.json`.
- Set defaults: `security=allowlist`, `ask=on-miss`.
- Keep `agents["*"]` empty.
- Allowlist exact binaries only (e.g., `/usr/bin/git`, `/opt/homebrew/bin/openclaw`).
- Add on-miss only when a real need is observed.

## Option B — Pre-approved scripts (preferred)
- Put scripts in a dedicated directory (e.g., `workspace/scripts/approved/`).
- Scripts should:
  - avoid shells (use Python/Node directly if risk accepted)
  - have explicit input validation
  - write logs/audit trails
- Allowlist only the interpreter + the script entrypoint (or a single wrapper binary).

## Option C — Human-in-the-loop runbooks for sudo / privileged actions
- Maintain `workspace/ops/runbooks/*.md` with copy/paste commands.
- Agent outputs a runbook section + exact commands.
- Human runs locally; agent verifies via read-only logs/status.

## Option D — Node-side execution (when available)
- For macOS-only automation, run via paired node using `nodes.run` with explicit command allowlists.
- Still keep a policy boundary: no generic shells.

## Guardrails
- Never allowlist: shells (`/bin/bash`, `/bin/zsh`, `/bin/sh`) or directory globs.
- Avoid allowlisting network exfil tools (`curl`, `wget`, `ssh`, `scp`, `rsync`) except with explicit risk acceptance.
- Treat interpreters (node/python) as “arbitrary code execution” permissions.

## Next Implementation Candidates
1) Add a tiny regression test script to validate:
   - an allowlisted command runs
   - a non-allowlisted command triggers approval
2) Add a linter to prevent `exec-approvals.json` from containing shells or globs.
