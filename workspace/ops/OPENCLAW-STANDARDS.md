# OpenClaw Standards Checklist (Part 3.3)

Ongoing checklist for RedOS. Review when adding crons, skills, or integrations.

---

## 1. Skills are declarative

- **Rule:** New behavior = new `SKILL.md` (or doc update). No executable logic in skills except as documented helpers (scripts called by agents).
- **Where:** All skills live in `workspace/skills/<id>/SKILL.md`. OpenClaw applies them at runtime.
- **Check:** When adding a capability, create or update a SKILL.md; do not embed logic in cron payloads beyond instructions.

---

## 2. No `model` in cron payloads

- **Rule:** Do not hardcode `model` in cron job payloads. Omit the field so agent defaults (from `openclaw.json`) apply.
- **Where:** `cron/jobs.json` — every job's `payload` must not include `"model": "..."`.
- **Reference:** CLAUDE.md → Critical Rules.
- **Note:** Some legacy jobs may still have `model`; when editing those jobs, remove it to use agent defaults.

---

## 3. A2A logging and transparency

- **Rule:** Every `sessions_spawn` and `sessions_send` must be logged to `workspace/logs/a2a-delegations.jsonl` (dispatch + result). High-visibility delegations must post to Slack before/after (per a2a-transparency).
- **Where:** SOUL.md (A2A section), `workspace/ops/autonomy-contract.md`, skills `a2a-transparency` and `a2a-verify`.
- **Check:** Autonomy scorecard expects ≥10 A2A interactions/day when healthy; empty log = no collaboration.

---

## 4. L3 / L4 / L5 — no bypass

- **Rule:** L3 (infra/sensitive) → INFOSEC A2A review (120s timeout). L4/L5 (external/money, critical) → Telegram approval only; no bypass.
- **Where:** `workspace/skills/maker-checker/SKILL.md`, SOUL.md, `workspace/skills/telegram-approvals/SKILL.md`, `workspace/skills/tool-call-validator/SKILL.md`.
- **Check:** No cron or skill may execute L4/L5 actions without going through the approval queue; RED runs the Telegram approval monitor cron.

---

## 5. Secrets only in n8n or env

- **Rule:** API keys, tokens, and credentials live only in (a) n8n credential store (for webhook-called APIs) or (b) environment variables / `openclaw.json` env. Never in skill files, committed config, or repo.
- **Where:** `workspace/skills/n8n-webhooks/SKILL.md` (credential isolation); CLAUDE.md → Critical Rules (never commit credentials).
- **Check:** Before adding a new integration that needs a key, use n8n webhook or add to env; do not put secrets in `workspace/` committed files.

---

## Quick reference

| Item            | Enforced in / See                    |
|-----------------|--------------------------------------|
| Declarative skills | `workspace/skills/`, CLAUDE.md     |
| No model in cron   | CLAUDE.md Critical Rules, this doc |
| A2A logging       | SOUL.md, autonomy-contract.md, a2a-* skills |
| L3/L4/L5          | maker-checker, telegram-approvals, tool-call-validator |
| Secrets            | n8n-webhooks, CLAUDE.md, .gitignore |

*Last updated: 2026-03-01 — Plan Part 3.3*
