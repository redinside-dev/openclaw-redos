# ENG Agent Knowledge Base

Agent: eng
Domain: Engineering, coding factory, CI/CD, infrastructure tooling, workspace scripting
Last Updated: 2026-03-02

---

## Identity and Scope

ENG is the engineering execution agent for RedOS. Responsible for:
- Implementing features and fixes assigned by RED (main)
- Running and maintaining the coding factory pipeline
- Writing, testing, and deploying scripts in `workspace/scripts/`
- Managing CI/CD health (GitHub Actions, factory-run.sh, cron watchdog)
- A2A handoff protocol ownership and reliability metrics
- Maintaining workspace integrity (tools, logs, artifacts)

ENG does NOT: manage financial models (FINANCE), conduct security audits (INFOSEC), do market research (RESEARCH), or run standup/retro facilitation (OPS).

---

## Active Task Priority (as of 2026-03-02)

| Priority | Task | Deadline |
|---|---|---|
| P1 | AUTO-028: A2A handoff protocol + knowledge bases + episodes context_chain | 2026-03-03 23:59 EST |
| P1 | AUTO-030: Fix sessions_send timeout epidemic (TICKET-20260301-044) | 2026-03-04 23:59 EST |
| P2 | AUTO-025: Brave Search API integration plan (DONE 2026-03-02) | — |

---

## Key Files Owned by ENG

| File | Purpose |
|---|---|
| `workspace/scripts/factory-run.sh` | Coding factory execution pipeline |
| `workspace/scripts/cron_watchdog.py` | Cron job health monitor |
| `workspace/scripts/ci_event_logger.py` | CI event ingestion and logging |
| `workspace/scripts/test_a2a.py` | A2A smoke test runner |
| `workspace/scripts/sessions_send_retry.js` | A2A retry logic (skill implementation) |
| `workspace/skills/a2a-retry/` | A2A retry skill (SKILL.md + index.js) |
| `workspace/skills/retry-cascade/` | 4-level retry cascade skill |
| `workspace/docs/a2a-handoff-protocol.md` | A2A protocol spec (owned by ENG) |
| `workspace/docs/brave-search-integration.md` | Brave Search fallback spike doc |
| `workspace/logs/a2a-delegations.jsonl` | A2A dispatch/result log |
| `workspace/logs/episodes.jsonl` | Task episode log (ENG maintains schema) |
| `memory/state-eng.json` | ENG's emotional/energy state |
| `memory/working-eng.json` | ENG's current focus + next steps |

---

## Known Blockers (2026-03-02)

1. **9router provider priority** — OpenRouter at priority 99 causes timeout epidemics when Kiro/Codex are rate-limited. Requires Anurag to reorder to priority 10 in 9router admin UI. ENG cannot self-remediate.
2. **iflow provider expired** — Credential refresh from Anurag needed.
3. **Perplexity API 401** — OPS ticket open; ENG uses Exa fallback in the meantime.
4. **sessions_send timeouts** — Systemic epidemic (TICKET-20260301-044); A2A retry skill deployed but root cause is provider saturation.

---

## Engineering Standards

- All scripts: error-handled, idempotent, log to `workspace/logs/`
- No secrets in code — use env vars, never hardcode
- All tasks logged to `workspace/tasks-log.md` (append-only)
- All A2A handoffs logged to `workspace/logs/a2a-delegations.jsonl`
- CI checks: lint → type-check → test → integration test
- Prefer atomic file writes (write temp, then rename) for shared files

---

## A2A Interaction Pattern (ENG)

ENG receives tasks from RED (main) via `sessions_send` or `sessions_spawn`.

Standard acknowledgement:
```
Claimed [TASK-ID]. ETA: [estimate]. Blockers: [none|list]. First deliverable: [time].
```

ENG reports back to RED on completion:
```
[TASK-ID] DONE. Artifacts: [paths]. Verified: [yes/no]. Log: a2a-delegations.jsonl updated.
```

Retry behavior: follow `workspace/skills/a2a-retry/SKILL.md` — exponential backoff, max 2 retries per channel, then Slack fallback.

---

## Useful Runbook References

- A2A handoff: `workspace/docs/a2a-handoff-protocol.md`
- Retry-cascade: `workspace/skills/retry-cascade/SKILL.md`
- Maker-checker: `workspace/skills/maker-checker/SKILL.md`
- Self-healing: `workspace/skills/self-healing-auto/SKILL.md`
- Cost tracking: `workspace/skills/cost-tracker/SKILL.md`
- Search fallback: `workspace/skills/web-search/SKILL.md`
