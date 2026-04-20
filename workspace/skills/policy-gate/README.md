# policy-gate — Audit Reference Tool (NOT enforcement middleware)

## Status: AUDIT-ONLY

These scripts are **reference/audit tools**, not an enforcement layer.

**Do NOT use check-command.cjs as middleware before exec calls.**
Enforcement is handled natively by OpenClaw:
- `sandbox.mode: "all"` on ops/eng/infosec → Docker container isolation
- `tools.deny` per agent in openclaw.json → gateway-blocked unconditionally
- `tools.sandbox.tools.deny` → gateway-enforced tool restrictions

## What these files are for

| File | Purpose |
|------|---------|
| `check-command.cjs` | Human-run CLI for auditing what tier a command would get |
| `policy-gate.cjs` | Library: classify() + enforce() — used by check-command.cjs |
| `tier-rules.json` | Classification rules L0–L5 for exec commands |

## Human audit usage

```bash
# Manually check what tier a command gets (for debugging/review)
node ~/.openclaw/workspace/skills/policy-gate/check-command.cjs \
  --agent ops \
  --command "git push origin main"
```

Exit codes: 0=ALLOW, 1=HARD_DENY, 2=INFOSEC_REVIEW, 3=TELEGRAM_APPROVAL

## Why not in enforcement path?

Per NON-NEGOTIABLE CONSTRAINTS: OpenClaw-native only. Custom Node.js middleware
intercepting agent tool calls violates the upgrade-safety contract and creates
a dependency outside the OpenClaw runtime.

Behavioral tier classification is documented in:
- `workspace/skills/command-catalog/SKILL.md`
- `workspace/skills/maker-checker/SKILL.md`

These SKILL.md files provide the same guidance to agents without custom middleware.
