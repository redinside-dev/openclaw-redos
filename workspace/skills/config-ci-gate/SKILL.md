# Skill: config-ci-gate

**Use this skill before ANY change to `openclaw.json` or any gateway config file.**

## Purpose

Prevent config schema errors from reaching the gateway. Every config change must pass validation before reload. This eliminates the class of failures where unknown keys or invalid values cause the gateway to refuse to start.

---

## Protocol (MANDATORY — before every openclaw.json edit)

### Step 1 — Validate current config
```bash
/opt/homebrew/Cellar/node@22/22.22.0/bin/node /opt/homebrew/lib/node_modules/openclaw/dist/index.js doctor
```
- If errors found: **STOP** — do not proceed with the edit
- Open a ticket in `../workspace/ops/TICKET-TRACKER.md` describing the existing errors
- Fix existing errors first, then re-validate before making new changes

### Step 2 — Make the config change

Apply the change to `openclaw.json`.

### Step 3 — Validate after change
Run `openclaw doctor` again after the edit.
- If new errors introduced: **revert the change immediately**
- Log the revert to `../workspace/logs/config-changes.jsonl`

### Step 4 — Reload gateway only if clean
Only restart/reload the gateway if Step 3 passes with zero errors:
```bash
launchctl stop ai.openclaw.gateway
launchctl start ai.openclaw.gateway
```
Wait 15 seconds, then verify:
```bash
curl -s --max-time 5 http://localhost:18789/health
```

---

## Known Invalid Keys (never add these)

| Key | Why invalid |
|---|---|
| `agents.defaults.session` | Must be at top-level `session{}` |
| `agents.defaults.tools` | Must be at top-level `tools{}` |
| `session.maintenance.resetArchiveRetention` | Unrecognized — use `pruneAfter` |
| `hooks.token` same as `auth.token` | Must be distinct tokens |

---

## Log Format

Append to `../workspace/logs/config-changes.jsonl` after every config change:
```json
{"ts":"<ISO>","agent":"<agentId>","change":"<one-line summary>","validated":true,"reloaded":true}
```
