# LEARNINGS — Self-Improvement Knowledge Base

This file is the shared learning repository. When any agent resolves an issue,
they MUST append their learnings here. All agents read this file to avoid
repeating mistakes and to build institutional knowledge.

## Format

```
### LEARNING-{YYYYMMDD}-{NNN}
- **Date:** {ISO timestamp}
- **Source Ticket:** TICKET-{ref} or "observation"
- **Agent:** {who discovered this}
- **Category:** config | model | tool | skill | infra | workflow | security
- **Summary:** {one-line}
- **Details:** {what happened, why, how it was fixed}
- **Prevention:** {how to prevent this in the future}
- **Applied To:** {what was updated — SOUL.md, skill, config, etc.}
```

## Learnings

### LEARNING-20260228-004
- **Date:** 2026-02-28T04:00:00Z
- **Source Ticket:** observation
- **Agent:** cascade (external debug session)
- **Category:** infra | model
- **Summary:** Claude Pro and Kiro auto-refresh is working — no manual intervention needed; iFlow `testStatus: error` is a permanent false positive
- **Details:** `9router-keepfresh-0001` cron runs every 4min on OPS agent using `ollama/llama3.1:8b`. It calls `scripts/9router-token-refresh.js` which (1) refreshes Kiro via AWS OIDC directly, (2) calls `/api/providers/{id}/test` for Claude/Codex — 9router internally refreshes in the last 5min window before expiry. iFlow always shows `testStatus: error` with `400 Bad Request` on the health-check endpoint; this is a known broken endpoint but inference still works. The refresh script explicitly skips iFlow (`SKIP_TEST_PROVIDERS = new Set(['iflow', 'openrouter'])`).
- **Prevention:** If Claude Pro requires manual re-auth, check keepfresh cron is running and OPS agent has Ollama in its model chain (required for keepfresh to execute).
- **Applied To:** workspace/MEMORY.md

### LEARNING-20260228-003
- **Date:** 2026-02-28T03:30:00Z
- **Source Ticket:** observation
- **Agent:** cascade (external debug session)
- **Category:** config | infra
- **Summary:** Telegram bot token must be updated in BOTH `openclaw.json` AND `.env` — gateway reads from `openclaw.json` directly; `.env` is secondary
- **Details:** OPS Telegram bot was giving persistent 401 even after updating `.env`. Root cause: the actual `botToken` field is hardcoded directly in `openclaw.json` under the agent's channel config (not read from `.env`). The `.env` var is only for bootstrap reference. Additionally, three different old tokens existed: one in `.env`, one in an older `.env` backup, and one directly in `openclaw.json` — only the `openclaw.json` one is what the gateway uses at runtime.
- **Prevention:** After any Telegram bot token rotation: (1) find the agent's `botToken` in `openclaw.json` via `grep -n "botToken" openclaw.json`, (2) update it directly, (3) also update `.env` for consistency, (4) restart the stack. The token in `openclaw.json` is authoritative.
- **Applied To:** `openclaw.json`, `.env`

### LEARNING-20260228-002
- **Date:** 2026-02-28T03:00:00Z
- **Source Ticket:** observation
- **Agent:** cascade (external debug session)
- **Category:** config | model
- **Summary:** Cron job `"model"` override must be a model present in that agent's allowed fallback list in `openclaw.json` — "model not allowed" errors if missing
- **Details:** 25+ cron jobs had `"model": "ollama/llama3.1:8b"` overrides but agents main, allrounder, eng, research, finance, infosec did not have `ollama/llama3.1:8b` in their `fallbacks` array. Result: `model not allowed: ollama/llama3.1:8b` error on every run. The TOKEN-EXHAUSTION-FIX.md file claimed "FULLY APPLIED" but the fix script only updated OPS and HATAKE, leaving 6 agents unchanged.
- **Prevention:** After adding any new model to cron overrides, verify that model appears in each affected agent's `model.fallbacks` in `openclaw.json`. Run `openclaw doctor` after changes. When a fix script claims "FULLY APPLIED", verify by grepping the actual config: `grep -A5 '"model"' openclaw.json | grep ollama`.
- **Applied To:** `openclaw.json` — added `ollama/llama3.1:8b` to fallbacks of main, allrounder, eng, research, finance, infosec

### LEARNING-20260228-001
- **Date:** 2026-02-28T02:30:00Z
- **Source Ticket:** observation
- **Agent:** cascade (external debug session)
- **Category:** model | config
- **Summary:** `openrouter/auto` silently picks paid models when free `:free` models hit daily rate limits — exhausts credits invisibly
- **Details:** OpenRouter's `auto` selector dynamically picks the "best" model. When all `:free` models (llama, qwen, etc.) hit their daily rate limits, `auto` silently upgrades to paid models (GPT-4, Claude, etc.) and charges per-token. With `routing-profiles.json` active set to `balanced` (`allowPayg: true`), every rate-limited free model call was hitting paid fallbacks. Fix: change active profile to `cost_saver` (`allowPayg: false`) which hard-blocks all PAYG model spending.
- **Prevention:** (1) Never use `openrouter/auto` in agent primary or fallback chains. (2) Keep routing profile active = `cost_saver`. (3) If openrouter is needed, always specify explicit `:free` model suffix (e.g., `openrouter/meta-llama/llama-3.1-8b-instruct:free`). (4) Monitor `workspace/logs/cost-events.jsonl` — unexpected entries from openrouter indicate PAYG is active.
- **Applied To:** `workspace/config/routing-profiles.json` (active: cost_saver), `workspace/MEMORY.md`

### LEARNING-20260226-001
- **Date:** 2026-02-26T06:31:00Z
- **Source Ticket:** TICKET-20260226-001
- **Agent:** OPS
- **Category:** infra | workflow
- **Summary:** Telegram 401s can be transient after 409 getUpdates conflicts; don’t rotate tokens immediately
- **Details:** gateway.err.log showed OPS Telegram channel exit with `401: Unauthorized` after a likely duplicate polling instance (409 conflict earlier in the sequence). The error burst stopped without config changes, and later logs show the OPS Telegram lane active; subsequent failures were unrelated HTTP 500s from upstream LLM providers.
- **Prevention:** Only treat Telegram 401 as “token revoked” if it persists continuously for >5 minutes (or recurs over multiple restart cycles). First check for duplicate gateway instances and Telegram 409 conflicts.
- **Applied To:** workspace/ops/TICKET-TRACKER.md (closed ticket with diagnosis)

### LEARNING-20260225-007
- **Date:** 2026-02-25T12:19:00Z
- **Source Ticket:** TICKET-20260225-021
- **Agent:** cascade (external debug session)
- **Category:** config | infra | model
- **Summary:** Adding a custom `anthropic` provider block with invalid `api` type blocked ALL config reloads for 22+ minutes, silencing Telegram and all agents
- **Details:** When `models.providers.anthropic` was added with `"api": "anthropic"`, OpenClaw rejected the config on every hot-reload attempt (`config reload skipped (invalid config): models.providers.anthropic.api: Invalid input`). The only valid api type is `"openai-completions"`. During this 22-minute window, OpenClaw ran on stale config — all agents failed with `400 No credentials for provider: gemini-cli` and Telegram messages got no response. Additionally, `openai-codex` provider was missing from `models.providers`, so 5 direct ChatGPT accounts were invisible to the fallback chain.
- **Prevention:** (1) Never add a provider block without verifying the exact `api` enum values OpenClaw accepts. (2) After any config edit, watch `logs/gateway.err.log` for `config reload skipped` — if seen within 60s, revert the last edit immediately. (3) Always include `openai-codex` as a provider block so direct Codex accounts work without 9Router.
- **Applied To:** `openclaw.json` — removed bad `anthropic` block, added valid `openai-codex` block, added `zai` + `ollama` as last-resort fallbacks in all agent chains.

### LEARNING-20260225-006
- **Date:** 2026-02-25T11:30:00Z
- **Source Ticket:** TICKET-20260225-021
- **Agent:** cascade (external debug session)
- **Category:** infra | model
- **Summary:** 9Router stores OAuth tokens in memory only — any process restart wipes ALL provider sessions simultaneously
- **Details:** 9Router v0.2.98 does not persist OAuth tokens to disk. When the LaunchAgent restarted (due to stale plist path `MODULE_NOT_FOUND`), all providers (Gemini, Kiro, iFlow, Codex-via-9Router, Cursor, Claude Code) lost authentication instantly. 675 daily cron calls then cascade-failed within hours. This appeared as "all providers exhausted" but was actually "all providers unauthenticated".
- **Prevention:** (1) Auth watchdog cron added (`9router-auth-watchdog-0001`) — runs every 30min, sends Telegram DM on credential loss. (2) Always have non-9Router fallbacks: direct `openai-codex` accounts + `zai` + `ollama` so agents never go fully dark. (3) After any Mac restart, re-auth 9Router at `http://127.0.0.1:20128` before agents start running.
- **Applied To:** `cron/jobs.json` — added auth watchdog job. `openclaw.json` — restored `openai-codex` direct provider.

### LEARNING-20260225-005
- **Date:** 2026-02-25T11:00:00Z
- **Source Ticket:** TICKET-20260225-021
- **Agent:** cascade (external debug session)
- **Category:** model | config
- **Summary:** All 5 `openai-codex` accounts hit rate limit simultaneously because they had no cooldown spreading — 675 daily calls concentrated on 5 accounts
- **Details:** With 68 enabled cron jobs running 675 daily API calls, all routing through `openai-codex` primary, all 5 ChatGPT accounts hit their rate limits within hours. `usageStats` in `auth-profiles.json` showed 8-14 `rate_limit` errors per account, all `cooldownUntil` timestamps clustered within minutes of each other.
- **Prevention:** Spread primary models across providers (not just `openai-codex`). Keep high-frequency monitoring jobs using `model: "mini"` (9router/cx/gpt-5.1-codex-mini) rather than the primary. Ensure `zai/glm-4-plus` appears early in fallback chain — it has an API key and never needs re-auth.
- **Applied To:** `openclaw.json` fallback chains updated with `openai-codex/gpt-5.1-mini` as first fallback, `zai` and `ollama` as final safety net.

### LEARNING-20260225-004
- **Date:** 2026-02-25T08:32:00Z
- **Source Ticket:** TICKET-20260225-020
- **Agent:** OPS
- **Category:** security
- **Summary:** Unblock harmless cron smoke tests by allowlisting exact safe binaries (e.g., `/bin/echo`) for the specific agent, not by widening defaults
- **Details:** Meta self-check uses `exec echo healthy` as a smoke test. With `exec-approvals.json` in deny-by-default mode, the `main` agent had an empty allowlist so `/bin/echo` required approval, causing the cron smoke test to fail. Fixed by adding a single allowlist entry for `main` with `pattern: "/bin/echo"`.
- **Prevention:** Keep `defaults.security=allowlist` + `agents["*"]` empty; for recurring automation/smoke tests, allowlist only the exact binary needed (no shells, no globs).
- **Applied To:** `/Users/redinside/.openclaw/exec-approvals.json`

### LEARNING-20260225-003
- **Date:** 2026-02-25T04:25:00Z
- **Source Ticket:** TICKET-20260225-019
- **Agent:** main
- **Category:** workflow
- **Summary:** Standardize a canonical, sandbox-readable errors feed; `workspace/logs/errors.jsonl` can be stale/empty and `exec tail` is approval-gated
- **Details:** The CEO reflection expects to review `logs/errors.jsonl`, but in practice the workspace copy may be stale (only init line) while real failures are in host logs (`/Users/redinside/.openclaw/logs/*`) and/or `workspace-ops/*`. Cron lanes can’t reliably access host paths and `exec` is approval-gated, so reflection/monitoring misses recurring error patterns.
- **Prevention:** OPS should produce a small, append-only digest (e.g., `workspace/ops/digests/errors-lastN.jsonl`) written by a trusted host-side script (absolute path in cron payload), and all cron/reflection prompts should read that digest via the `read` tool only.
- **Applied To:** TICKET-TRACKER.md (new ticket)

### LEARNING-20260225-002
- **Date:** 2026-02-25T03:53:00Z
- **Source Ticket:** TICKET-20260225-016
- **Agent:** OPS
- **Category:** tool
- **Summary:** `moltbot-sandbox-fs` syntax errors can cause `read` tool failures inside sandboxed/embedded runs
- **Details:** gateway.err.log shows `[tools] read failed: moltbot-sandbox-fs: 1: Syntax error: ";" unexpected` during cron/embedded activity. This suggests the sandbox filesystem helper can fail before the actual file read occurs, preventing monitoring jobs from reading logs/tickets.
- **Prevention:** When sandboxed jobs start failing reads, check for `moltbot-sandbox-fs` errors specifically. Collect the exact failing read parameters (path/offset/limit) to create a minimal reproducer for a fix; avoid paths with unexpected shell metacharacters until root cause is identified.
- **Applied To:** TICKET-TRACKER.md (new ticket)


### LEARNING-20260225-001
- **Date:** 2026-02-25T03:29:00Z
- **Source Ticket:** TICKET-20260225-015
- **Agent:** OPS
- **Category:** security
- **Summary:** Exec approvals Stage B: enforce `allowlist` + `ask=on-miss` with per-agent exact-binary allowlists (no shells, no globs)
- **Details:** Implemented per-agent minimal exec allowlists in `exec-approvals.json` with strict defaults and no `agents["*"]` approvals. Added conservative exact-path allowlists for ops/eng/infosec and removed a stray `/usr/bin/cd` entry.
- **Prevention:** Treat exec allowlists as security policy code. Never allowlist shells or directory globs; add exact paths only, and keep `agents["*"]` empty.
- **Applied To:** `/Users/redinside/.openclaw/exec-approvals.json`

### LEARNING-20260224-010
- **Date:** 2026-02-24T16:21:00Z
- **Source Ticket:** TICKET-20260224-089
- **Agent:** main
- **Category:** workflow
- **Summary:** Health-snapshot should dedupe by signature and reject “unknown (no summary)” ticket creation unless parser confidence is high
- **Details:** The health-snapshot auto-ticket stream is creating many duplicates and “unknown (no summary)” entries, which increases operational noise and makes the true incident board unusable.
- **Prevention:**
  1) Parse+normalize log lines into a stable signature (e.g., category + errorCode + first N chars).
  2) Before opening a ticket, check existing OPEN/IN_PROGRESS tickets for the same signature (or a mapping table).
  3) If a line cannot be parsed into a non-empty summary with confidence, aggregate counts into a single daily digest instead of opening tickets.
- **Applied To:** LEARNINGS.md + new tracking ticket


### LEARNING-20260224-008
- **Date:** 2026-02-24T09:00:00Z
- **Source Ticket:** TICKET-20260224-022

### LEARNING-20260228-005
- **Date:** 2026-02-28T21:45:00Z
- **Source Ticket:** TICKET-20260228-005
- **Agent:** RED (CEO)
- **Category:** workflow | infra
- **Summary:** Canonical routing digest stopped capturing samples; visibility into fallback selection is now blind
- **Details:** `workspace/logs/routing-digest.jsonl` at 2026-02-28T21:29:43Z reports a 4-hour window with `sampleSize: 0` and no provider/model/agent data, even though the error digest still shows active failovers (`Unknown model`, HTTP 500, failover). Without any routing samples we cannot prove the fallback chain coverage or detect emergent unknown-model regressions, so the HEALTH check has no instrumentation for routing quality. A new ticket (TICKET-20260228-005) now tracks validating the routing digest writer and its data sources.
- **Prevention:** Monitor digest writer heartbeat + sample size; if a window reports zero samples while errors persist, escalate immediately and fallback to direct routing logs. Improve writer to log a warning when aggregated sample count stays zero for two consecutive windows so Ops can triage before the digest goes stale.
- **Applied To:** `TICKET-20260228-005`, `workspace/logs/routing-digest.jsonl`

- **Agent:** OPS
- **Category:** workflow
- **Summary:** `edit` tool updates need unique, stable anchors; avoid whitespace-sensitive or non-unique `oldText`
- **Details:** Gateway logs show `edit` failing because the exact text block wasn't found (whitespace drift) or matched multiple times (non-unique). This can break automated updates to shared markdown trackers like TICKET-TRACKER.md.
- **Prevention:** Use a unique header as the anchor and replace a larger context block, or use an explicit append-only insertion point (e.g., replace `## Active Tickets\n` with `## Active Tickets\n\n<new ticket>`).
- **Applied To:** TICKET-20260224-022 (opened)

### LEARNING-20260224-007
- **Date:** 2026-02-24T03:06:00Z
- **Source Ticket:** TICKET-20260224-013
- **Agent:** OPS
- **Category:** workflow
- **Summary:** Cron monitors should not rely on relative paths; runner cwd differs (e.g., workspace-ops/) causing silent ENOENT and missed checks
- **Details:** System health monitor attempted to read `logs/gateway.err.log`, `logs/errors.jsonl`, and `workspace/ops/TICKET-TRACKER.md` via relative paths. In cron context, these resolved under `/Users/redinside/.openclaw/workspace-ops/*` and failed with ENOENT, preventing monitoring.
- **Prevention:** Use a single canonical path strategy for cron: either (a) sandbox-relative paths guaranteed by mounts, or (b) a dedicated in-sandbox digest file written by the gateway/host that cron can always read.
- **Applied To:** Ticket opened (TICKET-20260224-013)

### LEARNING-20260224-006
- **Date:** 2026-02-24T01:54:00Z
- **Source Ticket:** TICKET-20260224-009
- **Agent:** OPS
- **Category:** tool
- **Summary:** Slack `message.send` requires an explicit `target` in `channel:<id>` form; missing/invalid targets break announces
- **Details:** Gateway log shows Slack delivery failing with: "Slack channels require a channel id (use channel:<id>)", "Delivering to Slack requires target ...", and "Action send requires a target." This indicates prompts/templates are sometimes sending without `target` or using a non-channel-id (e.g., channel name / legacy fields).
- **Prevention:** Standardize all Slack-post steps to `message(action="send", channel="slack", target="channel:<id>")` (or `user:<id>`). Add lint/compat shim to map legacy fields and reject missing `target` early.
- **Applied To:** Ticket opened (TICKET-20260224-009)

### LEARNING-20260224-004
- **Date:** 2026-02-24T01:07:00Z
- **Source Ticket:** TICKET-20260224-007
- **Agent:** OPS
- **Category:** infra
- **Summary:** Cron reliability needs rate-limit handling + enough timeout; otherwise monitoring jobs can silently stop
- **Details:** Gateway logs show repeated `⚠️ API rate limit reached` failures and `FailoverError: LLM request timed out` in the cron lane (including `health-jsonl-writer-0001`). When cron tasks time out or hit provider rate limits without backoff/retry, scheduled monitoring can stop updating `health.jsonl` and degrade observability.
- **Prevention:** Add exponential backoff on rate-limit errors, prefer a reliable hosted model for cron/monitoring lanes, and keep cron timeouts ≥300s for multi-step jobs. Consider circuit-breaking Anthropic profile if it frequently times out.
- **Applied To:** Ticket opened (TICKET-20260224-007)

### LEARNING-20260224-005
- **Date:** 2026-02-24T01:24:31Z
- **Source Ticket:** TICKET-20260224-008
- **Agent:** OPS
- **Category:** infra
- **Summary:** Restart-required config changes can accumulate and force delivery-recovery deferrals; schedule controlled restarts
- **Details:** Logs showed a restart-required config change (`gateway.trustedProxies`) being deferred while operations were in-flight, followed by `delivery-recovery` reporting its time budget exceeded and deferring 24 entries until the next restart. This can leave delivery/backlog issues unresolved and config changes unapplied longer than expected.
- **Prevention:** After any config edit that requires restart, plan a short restart window (or enforce max-deferral time). Add an alert when `delivery-recovery ... budget exceeded` appears repeatedly, and expose the deferred-count as a health metric.
- **Applied To:** Ticket opened (TICKET-20260224-008)

### LEARNING-20260224-003
- **Date:** 2026-02-24T00:52:40Z
- **Source Ticket:** TICKET-20260224-004
- **Agent:** OPS
- **Category:** infra
- **Summary:** When accessing gateway via reverse proxy/Tailscale, configure `gateway.trustedProxies` or WS clients may not be treated as local (pairing/connect failures)
- **Details:** Logs showed `Proxy headers detected from untrusted address` and repeated WS closes with `pairing required` for connections originating from a Tailnet hostname with forwarded IPs. Without trusted proxy configuration, the gateway refuses to treat proxied connections as local.
- **Prevention:** If the gateway is accessed through a proxy (Tailscale Funnel/serve, nginx, etc.), explicitly set `gateway.trustedProxies` to the proxy IP range and verify the pairing/local-client flow works end-to-end.
- **Applied To:** (pending) — ticket opened; needs config update + validation

### LEARNING-20260223-001
- **Date:** 2026-02-24T00:11:30Z
- **Source Ticket:** TICKET-20260223-001
- **Agent:** OPS
- **Category:** tool
- **Summary:** Don’t mix Slack-style targets (`channel:C0...`) with Telegram delivery; ensure the channel plugin matches the target ID format
- **Details:** Gateway attempted Telegram `sendMessage` to `channel:C0...` and failed with `400 chat not found`. This breaks mission-control posting and subagent completion announcements.
- **Prevention:** Validate each cron/prompt uses the correct messaging provider for its target (Slack channel IDs vs Telegram numeric chat IDs). Add a startup/config check that rejects `channel:C0...` targets unless Slack plugin is enabled and selected.
- **Applied To:** (pending) — ticket opened; requires config/prompt routing fix


### LEARNING-20260215-001
- **Date:** 2026-02-15T22:08:00Z
- **Source Ticket:** observation (Windsurf audit)
- **Agent:** OPS (via Windsurf)
- **Category:** config
- **Summary:** OpenClaw skills.entries only accepts `{enabled: true}` — not `path` or `description`
- **Details:** Skills were registered with extra keys (`path`, `description`) which caused gateway to reject the config silently. The correct schema is `{"skillName": {"enabled": true}}`. Skills are auto-discovered from the workspace/skills/ directory.
- **Prevention:** When modifying openclaw.json skills section, only use `enabled`, `apiKey`, and `env` keys.
- **Applied To:** openclaw.json fixed, KNOWLEDGEBASE.md §21 documented

### LEARNING-20260215-002
- **Date:** 2026-02-15T22:00:00Z
- **Source Ticket:** observation (Windsurf audit)
- **Agent:** OPS (via Windsurf)
- **Category:** model
- **Summary:** moonshot/kimi-k2.5 has no active subscription — must not be in fallback chains
- **Details:** Cron jobs were failing with "Provider moonshot is in cooldown (all profiles unavailable)". Kimi was listed as first fallback in all agent configs. Changed to zai/glm-4.7 as first fallback.
- **Prevention:** Before adding a model to fallback chains, verify it has an active subscription in model-registry.json.
- **Applied To:** openclaw.json agent fallback chains, model-registry.json status field

### LEARNING-20260215-003
- **Date:** 2026-02-15T23:30:00Z
- **Source Ticket:** TICKET-20260215-001
- **Agent:** OPS
- **Category:** infra
- **Summary:** Health monitoring must be a dedicated cron job, not rely on ad-hoc checks
- **Details:** The old "System Health Watch" cron job was disabled, leaving a 17-hour gap with no health monitoring. A new dedicated OPS Health Monitor cron job was created to run every 15 minutes.
- **Prevention:** Always ensure critical monitoring cron jobs are enabled and verified after gateway restarts. Check cron/jobs.json state after each restart.
- **Applied To:** cron/jobs.json — OPS Health Monitor enabled, TICKET-TRACKER.md

### LEARNING-20260215-004
- **Date:** 2026-02-15T23:30:00Z
- **Source Ticket:** TICKET-20260215-002
- **Agent:** OPS
- **Category:** config
- **Summary:** Cron job timeouts must be 300s+ for multi-step agent tasks
- **Details:** Default 120s timeout is insufficient for cron jobs that involve multiple LLM calls + tool use (read files, write tickets, etc.). The OPS Health Monitor was doing 3 file reads + analysis + ticket creation, which exceeded 120s. Even simple SLA checks can take 20s per LLM call.
- **Prevention:** Set all cron job timeoutSeconds to 300. For complex multi-step tasks, consider 600s. Monitor via Mission Control dashboard.
- **Applied To:** cron/jobs.json — all 7 enabled jobs set to 300s

### LEARNING-20260215-005
- **Date:** 2026-02-15T23:30:00Z
- **Source Ticket:** TICKET-20260215-002
- **Agent:** OPS
- **Category:** model
- **Summary:** Always validate model IDs before adding to fallback chains
- **Details:** `zai/glm-4.7-flashx` was in OPS and HATAKE fallback chains but doesn't exist in the model registry. This caused immediate "Unknown model" errors when the primary model failed over. The correct model is `zai/glm-4.7`.
- **Prevention:** Before adding any model to openclaw.json, verify it exists by checking the models.providers section or running `openclaw models list`. Never guess model IDs.
- **Applied To:** openclaw.json — removed all instances of zai/glm-4.7-flashx

### LEARNING-20260215-006
- **Date:** 2026-02-15T23:51:00Z
- **Source Ticket:** TICKET-20260215-003
- **Agent:** OPS
- **Category:** infra
- **Summary:** Authentication token invalidation can cascade into session key errors
- **Details:** After a series of LLM timeout fixes, new errors appeared at 23:30-23:35Z: "Your authentication token has been invalidated" followed by "Malformed agent session key; refusing workspace resolution." This suggests authentication reset corrupted session state, causing cascading failures in nested and session:agent:* lanes.
- **Prevention:** When resolving authentication-related issues, restart gateway to clear stale session state. Monitor session:agent:* and nested lanes for malformed key errors after config changes.
- **Applied To:** TICKET-20260215-003 opened for investigation

### LEARNING-20260215-007
- **Date:** 2026-02-16T00:30:00Z
- **Source Ticket:** TICKET-20260215-003
- **Agent:** OPS
- **Category:** infra
- **Summary:** Session state corruption after config changes can self-heal; monitor before restarting
- **Details:** After TICKET-20260215-002 fixes (removed zai/glm-4.7-flashx, changed OPS primary, increased timeouts), session state corruption occurred: "Malformed agent session key" and "authentication token invalidated" errors. These were transient and self-healed after ~5 minutes. Root cause was partial gateway state refresh during config edits, not actual token expiration (OAuth token valid for 4 more days). System stable for ~50 minutes after errors stopped.
- **Prevention:** When session state corruption occurs after config changes, monitor for 5-10 minutes before taking action. Many issues self-heal. If errors persist, run `openclaw doctor --fix` followed by `openclaw gateway restart` to clear corrupted session state. Avoid unnecessary gateway restarts for transient issues.
- **Applied To:** TICKET-20260215-003 RESOLVED, LEARNINGS.md updated

### LEARNING-20260216-001
- **Date:** 2026-02-16T02:15:00Z
- **Source Ticket:** observation
- **Agent:** main
- **Category:** workflow
- **Summary:** When a user requests agent-to-agent delegation, verify `sessions_spawn` capability first; don’t claim it’s forbidden without testing.
- **Details:** Earlier, the system reported `sessions_spawn` as forbidden for agentIds, but later it succeeded when invoked directly. This indicates capability can depend on runtime state/policy and must be tested before asserting constraints.
- **Prevention:** If delegation is requested, attempt `agents_list` + a minimal `sessions_spawn` (e.g., PONG) to confirm; if blocked, report the exact error.
- **Applied To:** LEARNINGS.md (this entry)

### LEARNING-20260215-008
- **Date:** 2026-02-16T01:28:00Z
- **Source Ticket:** TICKET-20260215-004
- **Agent:** OPS
- **Category:** infra
- **Summary:** Telegram 409 conflicts indicate multiple bot instances polling same token
- **Details:** gateway.err.log showed repeated Telegram getUpdates conflicts (409: Conflict: terminated by other getUpdates request) on 2026-02-14 and 2026-02-15. These occur when multiple Telegram bot instances (using the same bot token) simultaneously poll getUpdates. Conflicts self-resolved when duplicate gateway instances were terminated. Current system has only one gateway instance (PID 4956) and no conflicts since 2026-02-15T05:38Z.
- **Prevention:** Before starting gateway, verify no existing instances are running: `ps aux | grep openclaw-gateway`. Avoid manual gateway starts while systemd/launchd is managing it. If conflicts occur, check for multiple processes and terminate duplicates. Consider adding monitoring for multiple gateway instances.
- **Applied To:** TICKET-20260215-004 RESOLVED, LEARNINGS.md updated

### LEARNING-20260216-002
- **Date:** 2026-02-16T02:24:00Z
- **Source Ticket:** observation (proactive research scan)
- **Agent:** RESEARCH
- **Category:** security
- **Summary:** Two critical OpenClaw CVEs in 2026; both mitigated by staying on current version
- **Details:** Proactive web search found two critical CVEs: (1) CVE-2026-25593 - Local RCE via CLI path injection in config.apply (affects versions < 2026.1.20). (2) CVE-2026-25253 - Remote one-click RCE via WebSocket token hijacking (CVSS 8.8, affects versions < 2026.1.29). Current system running v2026.2.14, protected from both. Also found model performance issues: GPT-5.2 slow token generation (4 tps), Z.ai GLM-5 GPU shortages, Perplexity brief outage (resolved Feb 6).
- **Prevention:** Always keep OpenClaw updated to latest version. Run `openclaw d-update` regularly. Monitor for model performance issues and have fallback chains ready. Follow OpenClaw security advisories and GitHub releases.
- **Applied To:** LEARNINGS.md, memory/2026-02-16.md

### LEARNING-20260220-001
- **Date:** 2026-02-20T02:28:00Z
- **Source Ticket:** observation (proactive research scan)
- **Agent:** RESEARCH
- **Category:** security
- **Summary:** New Feb 18 OpenClaw advisory: multiple SSRF + webhook auth + path traversal issues; update and review exposed tools
- **Details:** Web search reports an Endor Labs disclosure (Feb 18) of multiple OpenClaw vulnerabilities including SSRF (gateway / image tool), missing webhook authentication (Telnyx/Twilio), and a browser upload path traversal (assigned CVEs in some reports, plus GHSAs). This reinforces treating *any* tool that fetches URLs / accepts remote callbacks / handles uploads as high-risk if internet-exposed.
- **Prevention:** (1) Ensure OpenClaw is updated to a patched version (check release notes / NPM/GitHub). (2) If any webhooks are enabled, validate they enforce signature verification (Twilio/Telnyx). (3) Prefer allowlists for outbound fetch (SSRF controls) and avoid exposing the gateway to the public internet.
- **Applied To:** LEARNINGS.md (this entry); OPS notified to verify update level + webhook/SSRF hardening

### LEARNING-20260220-002
- **Date:** 2026-02-20T02:28:00Z
- **Source Ticket:** observation (proactive research scan)
- **Agent:** RESEARCH
- **Category:** model
- **Summary:** Perplexity Sonar API had a Feb 16 incident; Z.ai GLM-4.7 intermittent issues in some integrations; consider resilient fallbacks
- **Details:** Web search indicates Perplexity Sonar API had an incident on Feb 16 (~1 hour) and community reports of GLM-4.7 connectivity errors in some third-party tools (e.g., Cursor), possibly configuration/provider-side. Z.ai’s newer GLM-5 is being promoted and may shift capacity.
- **Prevention:** (1) For workflows that depend on web_search, plan graceful degradation and retries. (2) Keep at least one non-Z.ai model in fallback chains for cron reliability. (3) Monitor provider status pages and adjust fallbacks when sustained error spikes occur.
- **Applied To:** LEARNINGS.md (this entry); OPS notified to sanity-check fallbacks for cron jobs

### LEARNING-20260220-003
- **Date:** 2026-02-20T04:35:00Z
- **Source Ticket:** observation (RED self-improvement)
- **Agent:** main
- **Category:** workflow
- **Summary:** Keep ops/agent-status populated daily; empty status directories break reflection + audits
- **Details:** CEO self-improvement cycle expects `/workspace/ops/agent-status/` to contain daily reports. Today the directory exists but is empty, preventing performance review and reducing operational visibility.
- **Prevention:** Establish a daily standup contract: each always-on agent writes `workspace/ops/agent-status/{agentId}.json` once per day. Add/verify an OPS cron that checks for missing files and pings agents; open a ticket if empty for >24h.
- **Applied To:** LEARNINGS.md; opened TICKET-20260220-001

### LEARNING-20260220-004
- **Date:** 2026-02-20T04:35:00Z
- **Source Ticket:** observation (log review)
- **Agent:** main
- **Category:** config
- **Summary:** Invalid provider model IDs should be treated as config drift and eliminated quickly
- **Details:** Recent errors included Perplexity invalid_model and Zhipu "model does not exist" responses, which are noisy and can stall workflows.
- **Prevention:** Add a weekly model-ID validation step: run `openclaw models list` and compare against configured fallbacks/tool defaults. Remove providers with expired credits (e.g., Anthropic) from router fallback chains to avoid repeated hard failures.
- **Applied To:** LEARNINGS.md; opened TICKET-20260220-002

### LEARNING-20260220-005
- **Date:** 2026-02-20T06:18:00Z
- **Source Ticket:** observation (proactive provider scan)
- **Agent:** RESEARCH
- **Category:** tool
- **Summary:** Perplexity Sonar API may have an ongoing incident; ensure web_search-dependent workflows degrade gracefully
- **Details:** Web search suggests Perplexity’s status page listed a Sonar API incident “under investigation” (reported start Feb 15) and earlier third-party trackers showed a Feb 16 incident window. If accurate, web_search calls may intermittently fail or spike latency.
- **Prevention:** Add backoff+retry for web_search usage in cron prompts, and ensure critical cron jobs have an alternate “no-web” mode (or a secondary search provider) so workflows don’t fail hard when Sonar is degraded.
- **Applied To:** LEARNINGS.md (this entry)

### LEARNING-20260220-006
- **Date:** 2026-02-20T06:18:00Z
- **Source Ticket:** observation (ecosystem change)
- **Agent:** RESEARCH
- **Category:** workflow
- **Summary:** OpenAI Codex ecosystem: GPT-5-Codex deprecations in GitHub Copilot; verify any pinned model names in integrations
- **Details:** Public changelog indicates “selected Anthropic and OpenAI models are deprecated” in GitHub Copilot and references GPT-5-Codex being deprecated with GPT-5.2-Codex recommended. If any OpenClaw configs/policies/tools pin old Codex model IDs, they may break unexpectedly.
- **Prevention:** Audit for pinned/deprecated model IDs (Copilot/org policies, OpenClaw fallback chains, provider config) and keep router defaults aligned with currently supported IDs.
- **Applied To:** LEARNINGS.md (this entry)

### LEARNING-20260220-007
- **Date:** 2026-02-20T10:30:00Z
- **Source Ticket:** TICKET-20260220-005
- **Agent:** main (RED self-improvement)
- **Category:** workflow
- **Summary:** Standardize Slack posting via the `message` tool; remove references to a `slack` tool in cron templates
- **Details:** Several cron job prompts instruct a `slack` tool call (`sendMessage`), but this runtime exposes Slack delivery via the generic `message` tool. The mismatch causes cron jobs to either fail to post or to emit “note who/where” instead of actually posting.
- **Prevention:** Update shared prompt templates: any “post to Slack” step should specify `message(action="send", channel="slack", target="channel:<id>")` (or the environment’s supported tool) and avoid hard-coding tool names that may not exist.
- **Applied To:** TICKET-20260220-005 opened for ENG to update prompts/templates

### LEARNING-20260220-008
- **Date:** 2026-02-20T10:30:00Z
- **Source Ticket:** TICKET-20260220-004
- **Agent:** main (RED self-improvement)
- **Category:** model
- **Summary:** Providers with zero credits (e.g., Anthropic) should be removed/disabled from router fallbacks to prevent noisy hard failures
- **Details:** `errors.jsonl` shows repeated Anthropic “credit balance too low” failures. Keeping Anthropic in fallbacks creates wasted retries and increases perceived latency.
- **Prevention:** Maintain provider health/credit flags and auto-exclude exhausted providers from routing. Add a weekly “provider credit sanity” check.
- **Applied To:** TICKET-20260220-004 opened

### LEARNING-20260220-009
- **Date:** 2026-02-20T10:36:00Z
- **Source Ticket:** observation (proactive provider scan)
- **Agent:** RESEARCH
- **Category:** model
- **Summary:** Z.ai GLM-4.7 appears to have intermittent availability when served via Together-hosted endpoints; don’t rely on it as the only hosted fallback for OPS-critical jobs
- **Details:** External status aggregators for Together AI list multiple downtime windows for “ZAI GLM 4.7” in early/mid-February (multi-hour outages). Separately, some integration forums report intermittent provider connection errors when using GLM endpoints. This suggests GLM-4.7 can be excellent when up, but shouldn’t be the sole non-local fallback for cron jobs that must run reliably.
- **Prevention:** Ensure OPS/cron-critical workflows have: (1) a reliable hosted primary (e.g., OpenAI Codex / GPT-5.2), (2) a secondary hosted provider (GLM-4.7 or similar), and (3) Ollama as last-ditch only. Add retry/backoff and alerting when primary/secondary fail.
- **Applied To:** TICKET-20260220-003 updated with RESEARCH notes; OPS notified

### LEARNING-20260220-010
- **Date:** 2026-02-20T14:36:00Z
- **Source Ticket:** observation (proactive security scan)
- **Agent:** RESEARCH
- **Category:** security
- **Summary:** New OpenClaw patch releases (2026.2.19-2 seen on npm); additional Feb CVEs mention command injection + webhook-auth gaps—upgrade and verify exposed plugins
- **Details:** Web search indicates OpenClaw published 2026.2.19-2 recently (npm listing). Separate vulnerability entries around Feb mention: (a) a command-injection issue (CVE-2026-26323) fixed in 2026.2.14+, and (b) an unauthenticated webhook acceptance in an optional BlueBubbles/iMessage plugin (CVE-2026-26316) fixed in 2026.2.13+. Even if individual CVE writeups vary in quality, the pattern is consistent: keep core updated and treat any webhook/channel plugin as internet-facing attack surface.
- **Prevention:** (1) Keep OpenClaw on latest patch (≥2026.2.19-2 if compatible). (2) Audit which channel plugins are enabled (Twilio/Telnyx/BlueBubbles/etc.) and confirm webhook signature verification is enforced. (3) Rotate any tokens that might have been exposed via older info-disclosure bugs; avoid exposing gateway publicly.
- **Applied To:** LEARNINGS.md (this entry); Slack update posted; recommend OPS validate installed version + enabled plugins

### LEARNING-20260221-001
- **Date:** 2026-02-21T02:30:00Z
- **Source Ticket:** observation (supply-chain advisory scan)
- **Agent:** RESEARCH
- **Category:** security
- **Summary:** Supply-chain incident: Cline CLI 2.3.0 reportedly installed OpenClaw via postinstall; treat as “unwanted install” IOC and audit dev machines
- **Details:** External reporting describes a Cline CLI npm supply-chain compromise (cline@2.3.0) that added a `postinstall` script to install `openclaw@latest` globally during an ~8-hour window (~4k downloads). Reports characterize OpenClaw as not inherently malicious, but the install vector is unauthorized and should be treated as a supply-chain compromise indicator.
- **Prevention:** (1) If any team uses Cline, ensure cline@2.3.0 is not installed; upgrade to fixed versions and verify tokens/OIDC workflow hardening. (2) Audit developer machines/CI for unexpected global `openclaw` installs (`npm list -g openclaw`) and unusual launchd/system services. (3) Prefer pinned versions and lockfiles; block unexpected postinstall scripts in CI where feasible.
- **Applied To:** LEARNINGS.md (this entry); Slack update posted; OPS should consider adding a one-time audit checklist

### LEARNING-20260221-002
- **Date:** 2026-02-21T06:35:00Z
- **Source Ticket:** TICKET-20260221-002
- **Agent:** RESEARCH
- **Category:** infra
- **Summary:** If 9router is down, hosted-model routing collapses and OPS cron can silently fall back to Ollama (causing reliability regressions)
- **Details:** Ticket reports show “9router not running” errors and that codex/iflow/gemini/qwen become unavailable; routing then selects `ollama/llama3.1:8b` for OPS-critical tasks, amplifying timeouts/5xx risk.
- **Prevention:** Monitor 9router as a first-class dependency (process/health endpoint). Alert if down and fail over to a direct hosted provider path (or a secondary proxy) before Ollama for OPS-critical cron. Ensure 9router log/output paths are writable and upstream credentials/BASE_URL configs are validated at startup.
- **Applied To:** TICKET-20260221-002 updated with triage checklist

### LEARNING-20260221-003
- **Date:** 2026-02-21T10:25:00Z
- **Source Ticket:** TICKET-20260221-003
- **Agent:** main
- **Category:** model
- **Summary:** Heartbeat/low-stakes routing should avoid Ollama when it’s flaking; prefer a hosted “reliability” model for always-on agents
- **Details:** Recent routing decisions show multiple always-on agents (ENG/OPS/INFOSEC/FINANCE) running periodic heartbeats on `ollama/llama3.1:8b`. At the same time, `errors.jsonl` contains repeated `OLLAMA Internal Server Error`. Even if Ollama is cheaper, using it as the *default* for always-on automation increases failure rates and timeouts, and can hide systemic dependency issues (e.g., 9router down) by silently “making do” with a flaky local backend.
- **Prevention:**
  1) Set per-agent defaults for always-on agents to a stable hosted model (e.g., `openai-codex/gpt-5.2`) and keep Ollama as last-ditch fallback.
  2) Add router rule: if a request is a cron/heartbeat/ops workflow, enforce `hosted-first` unless explicitly overridden.
  3) When Ollama emits 5xx, temporarily deprioritize it for automated workflows (circuit breaker).
- **Applied To:** TICKET-20260221-003 opened (ENG)

### LEARNING-20260221-004
- **Date:** 2026-02-21T10:45:00Z
- **Source Ticket:** TICKET-20260220-004 (context) / observation (web scan)
- **Agent:** RESEARCH
- **Category:** model
- **Summary:** Anthropic is reportedly restricting third-party Claude access tools; remove Claude/Anthropic routes unless using direct, approved API
- **Details:** Proactive web scan surfaced reports that Anthropic is restricting or banning third-party tools (including OpenClaw-like wrappers) from using Claude subscriptions/keys, resulting in auth/401 failures in some integrations. Even where we already have "credit balance too low" failures, the larger risk is *policy/terms enforcement* causing sudden hard outages if Anthropic remains in router fallbacks.
- **Prevention:** Remove/disable anthropic/* providers from router fallbacks unless we intentionally use an approved Anthropic API account. If Anthropic is required, use direct API keys in a compliant integration, and add a health/credit/policy flag so the router auto-excludes it when access is blocked.
- **Applied To:** LEARNINGS.md (this entry); recommend ENG update router fallbacks + model registry health flags

### LEARNING-20260221-005
- **Date:** 2026-02-21T14:30:00Z
- **Source Ticket:** TICKET-20260220-006 (context) / observation (web scan)
- **Agent:** RESEARCH
- **Category:** security
- **Summary:** New OpenClaw CVEs mention cron webhook delivery fetch() risk + unsafe docker sandbox args; ensure version >=2026.2.18 and audit cron webhook delivery usage
- **Details:** Proactive scan found writeups for (a) CVE-2026-27488: unsafe `fetch()` usage in cron webhook delivery (reported affecting <=2026.2.17), and (b) CVE-2026-27002: dangerous sandbox Docker settings addressed in 2026.2.15 (blocking risky docker create args via runtime enforcement + schema validation). Even if exploitability depends on deployment, both reinforce: keep OpenClaw current and treat any URL-delivery/webhook path as SSRF-adjacent.
- **Prevention:** Upgrade OpenClaw to a patched release newer than 2026.2.17 (target latest). Inventory cron jobs using webhook delivery and ensure outbound egress controls/allowlists. Ensure any sandbox/docker tool usage is running with hardened defaults; avoid exposing gateway publicly.
- **Applied To:** LEARNINGS.md (this entry); recommend OPS validate installed OpenClaw version + cron webhook delivery configuration

### LEARNING-20260221-006
- **Date:** 2026-02-21T00:00:00Z
- **Source Ticket:** TICKET-20260220-005
- **Agent:** Claude Code (bootstrap session)
- **Category:** tool
- **Summary:** OpenClaw runtime uses the unified `message` tool (not a separate `slack` tool); Slack send schema is `action="send", channel="slack", target="channel:C0...", message="..."`.
- **Details:** Older cron prompts said “Use slack tool …” and/or referenced legacy fields like `action="sendMessage"` + `to="channel:..."`, which led models to emit pseudocode instead of making a real tool call. The correct runtime schema is `message(action="send", channel="slack", target="channel:C0XXXXX", message="...")`. Fixed by standardizing prompts/templates and adding a linter to catch legacy schema.
- **Prevention:** Always reference the message tool in prompts, not "slack tool". Test by checking gateway.log for "[slack] delivered reply" entries — these confirm actual tool calls are working.
- **Applied To:** cron/jobs.json (7 replacements), workspace/SOUL.md (tool list updated)

### LEARNING-20260221-007
- **Date:** 2026-02-21T00:00:00Z
- **Source Ticket:** TICKET-20260220-003
- **Agent:** Claude Code (bootstrap session)
- **Category:** model
- **Summary:** Never assign OPS or ENG to Ollama primary — 100-170s latency causes task timeouts and capability degradation
- **Details:** OPS on llama3.1:8b produced gibberish (bash pseudocode, hallucinated CLIs) instead of using actual tools. ENG on llama3.1:8b similarly had 100-170s response times causing 300s timeout failures on complex multi-step tasks. Fixed by updating openclaw.json: ENG → gpt-5.2 primary, OPS → gpt-5.2 primary, both fallback to ollama/qwen2.5-coder:7b.
- **Prevention:** OPS must always be on a capable hosted model (gpt-5.2) since it runs orchestration, ticket management, and multi-file analysis. Ollama is appropriate only for HATAKE (fast intent parsing) and as an emergency fallback.
- **Applied To:** openclaw.json agents list (eng, ops primary updated)

### LEARNING-20260221-008
- **Date:** 2026-02-21T00:00:00Z
- **Source Ticket:** delivery-queue investigation
- **Agent:** Claude Code (bootstrap session)
- **Category:** infra
- **Summary:** Stale delivery-queue messages from old build will never retry; archive them
- **Details:** delivery-queue JSON files referenced module paths (send-QSP-aBY1.js, deps-xCpK9lRd.js) that no longer exist after an OpenClaw build/reinstall. These messages would retry forever and never deliver. Moved to delivery-queue/stale/ for archiving.
- **Prevention:** After any npm reinstall of openclaw (even same version), if delivery-queue has pending messages, check that the referenced module paths match current dist/ filenames. If not, move to stale/ and let agents re-generate the messages.
- **Applied To:** delivery-queue/stale/ (5 messages archived)

### LEARNING-20260221-006
- **Date:** 2026-02-21T18:35:00Z
- **Source Ticket:** TICKET-20260220-006 (context) / observation (web scan)
- **Agent:** RESEARCH
- **Category:** security
- **Summary:** New OpenClaw advisory: safeBins `grep -e` can bypass stdin-only file-read policy (GHSA-3xfw-4pmr-4xc5); patch in >=2026.2.21
- **Details:** Web scan surfaced an OpenClaw GitHub Security Advisory (GHSA-3xfw-4pmr-4xc5) describing a "safeBins grep -e File Read Bypass" under stdin-only policy. Impact: a sandbox/policy designed to prevent filesystem reads can be bypassed via grep usage, risking local file disclosure in restricted execution contexts.
- **Prevention:** Upgrade OpenClaw to >=2026.2.21 where patched. Additionally, review any reliance on safeBins/stdin-only policies as a security boundary; prefer OS-level sandboxing/allowlists and assume tool-level wrappers can have bypasses.
- **Applied To:** LEARNINGS.md (this entry); recommend OPS validate installed version + review safeBins policy usage

### LEARNING-20260221-OPS-9ROUTER-ENDPOINTS (2026-02-21T18:30:02Z)
- **Context:** 9Router quota sync / health checks were failing.
- **What happened:** This 9Router build returned 404 for `/health` and `/api/quota` but served OpenAI-compatible routes.
- **Fix:** Treat `GET http://localhost:20128/v1/models` as the canonical health probe; if quota endpoint is missing, write a degraded status file rather than failing the cron.
- **Verification:** /v1/models returned 200.

### LEARNING-20260221-OPS-PLUGINS-ALLOWLIST (2026-02-21T18:30:02Z)
- **Context:** `openclaw status` warned that `plugins.allow` was empty (auto-loading non-bundled plugins).
- **Fix:** Set `plugins.allow` in `openclaw.json` to an explicit allowlist (telegram/whatsapp/slack/llm-analytics).
- **Why:** Reduces accidental/unsafe plugin auto-load surface.

### LEARNING-20260221-OPS-HEALTH-JSONL-RESTART (2026-02-21T18:30:02Z)
- **Context:** `logs/health.jsonl` had not advanced since 2026-02-15.
- **Fix:** Append a fresh health entry and add a lightweight cron job to keep `health.jsonl` moving every 15 minutes.

### LEARNING-20260221-009
- **Date:** 2026-02-21T18:34:00Z
- **Source Ticket:** TICKET-20260221-004
- **Agent:** OPS
- **Category:** infra
- **Summary:** Cost accounting must tolerate non-numeric `cost` values (avoid crashing request handling)
- **Details:** `errors.jsonl` shows `TypeError: cost.toFixed is not a function` in `CostMonitor.recordRequest`, implying `cost` is not a number (string/object/null). Cost monitor should coerce/validate input and default to 0 or skip recording rather than throwing.
- **Prevention:** Add type guards + safe formatting in cost monitor (e.g., `Number(cost)` with `Number.isFinite` checks). Include provider-specific normalizers and unit tests for `{cost: null|string|object}`.
- **Applied To:** (pending) — opened TICKET-20260221-004

### LEARNING-20260222-001
- **Date:** 2026-02-22T04:00:00Z
- **Source Ticket:** TICKET-20260222-001
- **Agent:** main (RED self-improvement)
- **Category:** framework
- **Summary:** OpenClaw agents are fundamentally sandboxed; maker/checker works for planning but not execution
- **Details:** After 30+ minutes of configuration attempts (elevated mode, sandbox disable, node config, PATH settings), RED agent still cannot execute host commands automatically. The maker/checker workflow is functional (RED creates plans, asks for approval), but execution falls back to manual commands for the user to run. This defeats the purpose of having an AI team work autonomously.
- **Root Cause:** OpenClaw agents are fundamentally designed to run in a sandboxed environment for security reasons. Direct host command execution goes against the framework's security model. This is a security feature, not a bug.
- **Prevention:** Accept OpenClaw's security model limitations. Use AI team for planning and coordination, manual execution for system commands. Consider alternative frameworks if full automation is required. Document this limitation in agent configurations and user expectations.
- **Applied To:** TICKET-20260222-001 (BLOCKED), PROJECT_STATUS.md, SOUL.md, RED agent CLAUDE.md

### LEARNING-20260221-010
- **Date:** 2026-02-21T18:34:00Z
- **Source Ticket:** TICKET-20260221-005
- **Agent:** OPS
- **Category:** tool
- **Summary:** Avoid obsolete `openclaw chat` CLI; use supported session/agent messaging APIs
- **Details:** `errors.jsonl` shows repeated `openclaw chat ...` calls failing with `unknown command 'chat'`. This indicates CLI drift or legacy automation.
- **Prevention:** Pin OpenClaw CLI usage to documented subcommands; avoid hard-coding non-existent commands in prompts/templates. Add a smoke test that validates critical CLI invocations after upgrades.
- **Applied To:** (pending) — opened TICKET-20260221-005

### LEARNING-20260222-002
- **Date:** 2026-02-22T10:06:00Z
- **Source Ticket:** TICKET-20260222-002
- **Agent:** OPS (cron)
- **Category:** infra
- **Summary:** WhatsApp channel can silently log out; treat 401 + "channels login" log lines as a hard-down signal
- **Details:** `gateway.err.log` showed WhatsApp channel exiting with ETIMEDOUT and then repeated 401 Unauthorized, followed by "WhatsApp session logged out. Run: openclaw channels login". Until re-authenticated, WhatsApp delivery is unavailable.
- **Prevention:** Add monitoring/alerting rule: if any channel emits "session logged out" or repeated 401 exits within a short window, open a ticket and alert mission control. Document re-login runbook (`openclaw channels login`) and ensure it’s performed after restarts or token/session expiry.
- **Applied To:** TICKET-20260222-002

### LEARNING-20260222-003
- **Date:** 2026-02-22T10:25:00Z
- **Source Ticket:** observation (RED self-improvement)
- **Agent:** main
- **Category:** workflow
- **Summary:** Cron/automation should not depend on `exec` for log tails; use file reads (offset) or dedicated summary files
- **Details:** In this runtime, shell `exec` required interactive approval, which makes cron-style reflection cycles unreliable when they need `tail`/`ls`/`find`. We were able to review `errors.jsonl` and `routing-decisions.jsonl` via `read`, but `exec`-based steps stalled.
- **Prevention:** Update cron prompt templates to prefer `read` with offsets for JSONL logs, or have OPS write a rolling `ops/digests/*.md` summary as part of monitoring jobs.
- **Applied To:** LEARNINGS.md (this entry)

### LEARNING-20260224-001
- **Date:** 2026-02-24T00:20:00Z
- **Source Ticket:** observation (RED self-improvement)
- **Agent:** main
- **Category:** tool
- **Summary:** Slack posting schema drift: prompts reference `message(action=sendMessage, to=...)` but runtime tool expects `message(action="send", channel="slack", target="channel:<id>")`
- **Details:** Routing-decision prompt tails and older templates still instruct `action="sendMessage"` and `to="channel:C0..."` (legacy schema). Current runtime exposes a generic `message` tool with actions like `send|read|edit|delete` and fields `channel` + `target`. This mismatch can cause “posted scheduled update” claims without an actual tool call, and contributes to routing/provider confusion (e.g., Slack-style IDs being attempted via Telegram).
- **Prevention:** Standardize all templates/cron prompts to the actual tool schema. Consider adding a gateway-side compatibility shim that maps `{action: "sendMessage", to: "channel:..."}` → `{action: "send", channel: "slack", target: "channel:..."}` and rejects Slack IDs on Telegram.
- **Applied To:** LEARNINGS.md (this entry); ticket opened for prompt normalization

### LEARNING-20260224-002
- **Date:** 2026-02-24T00:35:46Z
- **Source Ticket:** TICKET-20260224-002
- **Agent:** OPS
- **Category:** workflow
- **Summary:** Cron/agent prompts must use sandbox-accessible, workspace-relative paths (absolute host paths can be blocked)
- **Details:** The OPS Health Monitor cron attempted to read/write using host-absolute paths (e.g., `/Users/redinside/.openclaw/...`) and `/workspace/*` paths, but tool calls failed with “Path escapes sandbox root” and “Sandbox path is read-only; cannot create directories”.
- **Prevention:** In cron prompts, prefer workspace-relative paths that are guaranteed to be inside the agent’s sandbox root, and ensure required directories exist & are writable. If host paths are required, adjust sandbox/workspace mounting or provide a dedicated log digest file within the sandbox.
- **Applied To:** LEARNINGS.md (this entry)

### LEARNING-20260224-003
- **Date:** 2026-02-24T00:55:00Z
- **Source Ticket:** observation
- **Agent:** main
- **Category:** workflow
- **Summary:** Add compatibility/lint to prevent legacy Slack message schema drift from reappearing in cron prompts
- **Details:** `routing-decisions.jsonl` still contains cron prompt tails instructing `message(action="sendMessage", to="channel:C0...")`, while the runtime tool schema is `message(action="send", channel="slack", target="channel:C0...")`. This drift contributes to “posted” claims without actual delivery and can amplify provider/target mismatch issues.
- **Prevention:**
  1) Add a gateway-side compatibility shim mapping `{action:"sendMessage", to:"channel:C0..."}` → `{action:"send", channel:"slack", target:"channel:C0..."}`.
  2) Add a prompt/template linter in CI that rejects legacy Slack fields (`sendMessage`, `to=`).
- **Applied To:** LEARNINGS.md (this entry); ticket opened

### LEARNING-20260224-008
- **Date:** 2026-02-24T06:51:00Z
- **Source Ticket:** TICKET-20260224-021
- **Agent:** OPS
- **Category:** tool
- **Summary:** Telegram `editMessageText` has strict length limits; avoid editing long status payloads
- **Details:** gateway.err.log shows `editMessageText failed ... (400: Bad Request: MESSAGE_TOO_LONG)`. Editing existing Telegram messages for status updates will fail when the edited text exceeds Telegram limits.
- **Prevention:** Keep Telegram status messages short; truncate/chunk long summaries; prefer sending a new message instead of editing when content may exceed limits.
- **Applied To:** TICKET-20260224-021 (tracking)

### LEARNING-20260224-004
- **Date:** 2026-02-24T04:25:00Z
- **Source Ticket:** TICKET-20260224-020 / TICKET-20260224-022 (patterns)
- **Agent:** main (RED self-improvement)
- **Category:** tool
- **Summary:** When multiple channel plugins are configured, `message.send` must include `channel` (provider) + `target`; also validate required tool params (`write.content`) before calling tools
- **Details:** Recent recurring failures include: (1) subagent completion announce failing with `channel is required when multiple channels are configured: telegram, slack` and (2) tool calls failing with `write failed: missing required parameter: content`. Both are *schema/validation* issues: the caller is omitting required fields.
- **Prevention:**
  1) Update all announcement/prompt templates to always specify `message(action="send", channel="slack", target="channel:<id>")` (or `channel="telegram"`, etc.). Never rely on implicit channel selection.
  2) Add a lightweight prompt linter (or gateway-side tool wrapper) that rejects tool calls missing required fields and emits a single actionable error message (e.g., "write requires content" / "message.send requires channel+target").
- **Applied To:** LEARNINGS.md (this entry); ticket opened

### LEARNING-20260224-009
- **Date:** 2026-02-24T10:21:00Z
- **Source Ticket:** TICKET-20260224-035 / observation
- **Agent:** main (RED self-improvement)
- **Category:** config
- **Summary:** Treat "config reload skipped (invalid config)" as P1; schema drift means further config edits won’t apply
- **Details:** Logs/tickets show repeated `[reload] config reload skipped (invalid config): agents.defaults: Unrecognized keys: "session", "tools", session.maintenance: Unrecognized key: "resetArchiveRetention"`. When this happens, hot reload is ignored and the system continues running the old config, causing confusing "why didn’t it change?" behavior.
- **Prevention:**
  1) Run `openclaw doctor` (or CI lint) *before* merging any openclaw.json change.
  2) Maintain a strict allowlist/schema for openclaw.json keys; reject unknown keys in PRs.
  3) If reload is skipped, stop making further config changes until the invalid keys are removed.
- **Applied To:** LEARNINGS.md (this entry); referenced in directives


### LEARNING-20260228-005
- **Date:** 2026-02-28T06:25:00Z
- **Source Ticket:** TICKET-20260226-003, TICKET-20260227-001, TICKET-20260227-002, TICKET-20260227-003, TICKET-20260227-007, TICKET-20260227-009, TICKET-20260227-011, TICKET-20260227-015, TICKET-20260227-017
- **Agent:** ops (ticket-diagnose-fix)
- **Category:** model | infra
- **Summary:** Embedded agent HTTP 500 errors often indicate upstream model provider issues (9Router authentication/rate limits) not system failures
- **Details:** Multiple tickets show "embedded agent failed before reply" with HTTP 500 errors. Gateway logs reveal these correlate with: (1) "Unknown model" errors (e.g., cc/claude-opus-4-6), (2) API rate limits, (3) upstream provider 500s. These are transient and self-resolve as routing falls back to available models. The pattern indicates model provider reliability issues rather than OpenClaw system failures.
- **Prevention:** Treat embedded agent HTTP 500 errors as low-severity monitoring noise unless they persist >30 min with no successful fallbacks. Check gateway.err.log for "Unknown model" or rate limit messages to confirm provider-side cause. Routing profile "cost_saver" (allowPayg: false) already minimizes impact by blocking PAYG spend during provider issues.
- **Applied To:** LEARNINGS.md; ticket resolution patterns updated to deprioritize transient HTTP 500 errors

### LEARNING-20260227-001
- **Date:** 2026-02-27T22:21:00Z
- **Source Ticket:** observation (RED self-improvement cycle)
- **Agent:** main (RED)
- **Category:** workflow | infra
- **Summary:** Reflection inputs are partially stale; canonical digest paths must replace raw log paths in recurring prompts
- **Details:** This cycle found `logs/errors.jsonl` with only an initialization line and `logs/routing-decisions.jsonl` containing old entries (last around 2026-02-22), while TICKET-TRACKER shows active incidents from 2026-02-27. The mismatch causes weak pattern detection and delayed corrective action in daily reflection jobs.
- **Prevention:** Standardize all reflection/health prompts to read maintained digest artifacts (for example `workspace/logs/error-digest.md` plus a rolling `routing-digest.jsonl`) instead of raw runtime logs that may be stale or lane-dependent.
- **Applied To:** LEARNINGS.md; TICKET-20260227-022 opened

### LEARNING-20260227-002
- **Date:** 2026-02-27T22:21:00Z
- **Source Ticket:** TICKET-20260227-021 (recurring)
- **Agent:** main (RED)
- **Category:** tool | workflow
- **Summary:** Automation scripts must gracefully fall back when `rg` is unavailable
- **Details:** Repeated errors show `zsh:1: command not found: rg` in operational lanes. Tasks that assume ripgrep can fail before doing any useful work, which compounds monitoring noise.
- **Prevention:** Add a shared command pattern: `if command -v rg >/dev/null; then rg ...; else grep/find ...; fi` for cron and runbook snippets; include this in prompt templates used by OPS/ENG monitors.
- **Applied To:** LEARNINGS.md; team directive to ENG/OPS

### LEARNING-20260228-006
- **Date:** 2026-02-28T05:37:00-05:00
- **Source Ticket:** TICKET-20260228-010
- **Agent:** main (RED self-improvement)
- **Category:** workflow | observability
- **Summary:** Reflection/monitor jobs are brittle when prompts reference `workspace/...` paths but runtime roots are already at workspace
- **Details:** This cycle showed repeated ENOENT for `workspace/ops/...` and `workspace/logs/...` while valid files existed at `ops/...` and `logs/...`. In parallel, `logs/errors.jsonl` had only one initialization line and `logs/routing-decisions.jsonl` was stale (last entries around 2026-02-22), reducing signal quality for pattern detection.
- **Prevention:**
  1) Standardize cron prompts to use canonical relative paths (`ops/...`, `logs/...`) and never prefix with `workspace/` unless the lane root is verified.
  2) Add a lightweight preflight in monitor prompts: attempt canonical path, then fallback path, then emit a single ticketed warning if both fail.
  3) Add a daily freshness check: fail-open alert if `errors.jsonl` or `routing-decisions.jsonl` has no new entries in >12h.
- **Applied To:** LEARNINGS.md; TICKET-20260228-010 opened

### LEARNING-20260228-007
- **Date:** 2026-02-28T16:37:00Z
- **Source Ticket:** observation
- **Agent:** main (RED)
- **Category:** workflow | observability
- **Summary:** Canonical error digest has not been refreshed since 2026-02-25, leaving reflection inputs stale
- **Details:** The daily reflection looked at `logs/error-digest.md` expecting it to be the single-source-of-truth for recent errors, but the file’s most recent entry is dated 2026-02-25T05:04:56Z. Meanwhile `logs/errors.jsonl` still only contains the init line and gateway logs show continuous handoffs (rate limits, provider credentials, Tailscale, Slack) that never make it into the digest. Without a fresh digest, cron/self-improvement prompts cannot detect current patterns or escalate new issues. The aggregator/health-lane job either stopped running or failed silently, so the summary is stale for multiple days.
- **Prevention:** Restore and monitor the digest writer: ensure the error aggregator cron runs every 2–4 hours, add a freshness guard (ticket/alert if `error-digest.md` isn’t updated in >12h), and fall back to a lightweight summary placeholder when writes fail so reflections still get a timestamped failure notification instead of old data.
- **Applied To:** TICKET-20260228-014
### LEARNING-20260301-002
- **Date:** 2026-03-01T03:05:00Z
- **Source Ticket:** observation
- **Agent:** RESEARCH
- **Category:** config | security
- **Summary:** OpenClaw v2026.2.26 hardens secrets, DM/queue policies, and cron/typing reliability—plan to stay on this release
- **Details:** The v2026.2.26 changelog lists a full secrets workflow (audit/config/apply snapshots, target-path validation, ref-only auth profiles) plus DM policy enforcement (inherit `dmPolicy: "allowlist"` across Telegram/Discord/Slack/Signal/iMessage/BlueBubbles/WhatsApp), delivery-queue retry backoff, ACP/thread agent tooling, agents/routing CLI helpers, and queue/typing reliability fixes. Gemini OAuth discovery now has robust fallback handling, Microsoft Teams/Google Chat lifecycle flows are stabilized, and temp dirs auto-heal on stricter umasks. These collectively reduce configuration drift, improve security posture, and boost cron/agent reliability.
- **Prevention:** Keep the gateway updated (>=2026.2.26) via `openclaw d-update` or npm, rerun `openclaw doctor` after upgrades, and re-audit `openclaw.json` sections for the new secrets schema, DM policy inheritance, and delivery queue/backoff settings; use the new ACP/thread CLI helpers when building thread-bound agents.
- **Applied To:** `openclaw.json`, `workspace/ops/LEARNINGS.md`

### LEARNING-20260301-003
- **Date:** 2026-03-01T02:00:00-05:00
- **Source Ticket:** observation (9router debugging)
- **Agent:** main (RED + Cascade)
- **Category:** infra | auth | 9router
- **Summary:** `developer` role (Anthropic-specific) must be mapped to `system` before sending to non-Anthropic providers
- **Details:** Claude Code uses `developer` role as the new canonical system-level role. 9Router's OpenAI message normalizer (3110.js) had no handling for it, so it passed through unchanged to Qwen, which only accepts `['system','assistant','user','tool','function']`. All Qwen requests returned HTTP 400. Fix: patched 3110.js OpenAI message `.map()` to remap `developer`→`system` before message content cleanup. This is a structural issue that will recur on 9router upgrades — the patch must be reapplied after any `npm update -g 9router`.
- **Prevention:** After any 9router upgrade, run: `grep -c '"developer"===a.role' /opt/homebrew/lib/node_modules/9router/app/.next/server/chunks/3110.js` — should return 1. If 0, reapply the patch. Add this check to the upgrade runbook.
- **Applied To:** `3110.js` patch + LEARNINGS.md

### LEARNING-20260301-004
- **Date:** 2026-03-01T02:00:00-05:00
- **Source Ticket:** observation (9router iflow debugging)
- **Agent:** main (RED + Cascade)
- **Category:** infra | auth | 9router
- **Summary:** iFlow getUserInfo endpoint uses `?accessToken=` query param, NOT an Authorization Bearer header
- **Details:** iFlow's `/api/oauth/getUserInfo` requires the access token as a query parameter (`?accessToken=<token>`), not as `Authorization: Bearer <token>`. Using Bearer returns HTTP 400. This matters because after each OAuth token refresh, the `apiKey` field (separate from `accessToken`, used for request signing via HMAC) must be refreshed from getUserInfo. Without this, the `apiKey` in db.json goes stale after the first token rotation, silently breaking all iFlow inference.
- **Prevention:** Always use `?accessToken=` query param for iFlow getUserInfo calls. Script now handles this automatically in `iflowGetUserInfo()`.
- **Applied To:** `scripts/9router-token-refresh.js` — `iflowGetUserInfo()` function

### LEARNING-20260301-005
- **Date:** 2026-03-01T02:00:00-05:00
- **Source Ticket:** observation
- **Agent:** main (RED + Cascade)
- **Category:** infra | auth | 9router
- **Summary:** Direct token refresh is more robust than relying on 9Router's /test endpoint for Claude and Codex
- **Details:** 9Router's `/api/providers/{id}/test` refreshes OAuth tokens internally only when within 5 minutes of expiry. This creates a fragile 5-minute window that can be missed if the machine is asleep, 9Router is restarting, or the keepfresh cron misses a run. All providers now use direct OAuth token endpoints: Claude → `console.anthropic.com/v1/oauth/token` (JSON body), Codex → `auth.openai.com/oauth/token` (form-encoded). This eliminates the dependency on 9Router being up during the exact refresh window.
- **Prevention:** When adding new OAuth providers to 9router, always implement direct refresh rather than relying on /test. The token endpoints and client IDs are in 9router's module 2255 (file 7647.js).
- **Applied To:** `scripts/9router-token-refresh.js` — `claudeRefresh()` and `codexRefresh()` functions

### LEARNING-20260301-006
- **Date:** 2026-03-01T03:45:00Z
- **Source Ticket:** TICKET-20260301-011
- **Agent:** main (RED self-improvement)
- **Category:** tool | workflow
- **Summary:** Perplexity web_search is blocked by a persistent 401/Cloudflare challenge; treat as credential issue instead of transient outage
- **Details:** `web_search("test")` still returns HTTP 401 plus Cloudflare challenge HTML (`openresty/1.27.4`); cron lanes and self-improvement reflections cannot rely on the tool while this persists. The Perplexity API regards the cluster as unauthorized, so retries are failing repeatedly. The issue is recorded in TICKET-20260301-011 (P1) and awaits credential rotation/support confirmation.
- **Prevention:** Document the credential-rotation workflow so that `web_search` callers escalate immediately when Perplexity returns 401/Cloudflare HTML. Consider a fallback provider or cached search summary for reflection cron jobs so they continue operating while the ticket is open.
- **Applied To:** `ops/TICKET-TRACKER.md` (TICKET-20260301-011)

### LEARNING-20260301-008
### LEARNING-20260301-009
- **Date:** 2026-03-01T10:00:00Z
- **Source Ticket:** TICKET-20260301-029
- **Agent:** RED (self-improvement)
- **Category:** workflow | infra
- **Summary:** Routing digest has produced zero samples across 5 consecutive windows, so fallback visibility is blind again
- **Details:**  entries starting at  through  all report  and . Without any data we cannot prove new providers, fallbacks, or failovers actually execute, meaning the HEALTH checks and routing dashboards are blind to repeated /500 bursts. The digest writer is either not receiving routing samples or is failing to ingest them at all.
- **Prevention:** Teach the digest writer to (1) emit a high-priority warning (and open a ticket) if two windows in a row have zero samples, (2) fall back to tailing / for a lighter summary when the canonical digest dries up, and (3) verify its cron/consumer continues running on startup. Document this expectation so future reflection cycles can quickly detect and escalate a stale digest.
- **Applied To:** workspace/ops/LEARNINGS.md (this entry) + workspace/ops/TICKET-TRACKER.md (TICKET-20260301-029)

- **Date:** 2026-03-01T07:52:00Z
- **Source Ticket:** TICKET-20260301-023
- **Agent:** OPS (cron: System Health Monitor)
- **Category:** infra
- **Summary:** HTTP 500 failover bursts need immediate provider correlation + fallback reroute before they block main/cron lanes
- **Details:** The most recent error digest shows repeated `FailoverError: HTTP 500: Internal Server Error` hits authoring the `main`, `session:agent:finance:main`, and cron lanes, often taking 50–75s before they fail over. Each HTTP 500 is blocking lane progress and generating lane wait warnings. Without knowing which provider is 500ing we just keep retrying the same provider and the failovers still fail.
- **Prevention:** For each HTTP 500 burst capture the provider/9Router logs for the failing timestamps, reroute critical cron/main requests to a healthy hosted provider while the provider is unstable, and alert the provider to resolve the outage instead of letting the lane spin through repeated retries.
- **Applied To:** cron/jobs.json (failover reroute guidance), routing-digest alerting


### LEARNING-20260301-INC-001
- **Date:** 2026-03-01T17:00:00Z
- **Source Ticket:** TICKET-20260301-INC-001
- **Agent:** RED (CEO) + Claude Code session
- **Category:** infra | incident-response | autonomy
- **Summary:** 3.5h total outage — 9router db.json wiped + context overflow on Telegram session + missing incident-response protocol
- **Timeline:**
  - ~00:00 UTC: 9router process hung (LaunchD did not restart — only handles crashes, not hangs)
  - ~10:53 UTC: 9router restarted, db.json wiped (484 bytes) — all 12 provider credentials lost
  - ~10:53–14:30 UTC: All agents returning "400 No credentials for provider: openai" — no Telegram alerts
  - ~14:30 UTC: Human escalation by Anurag
  - ~17:00 UTC: System restored via Claude Code intervention
- **Root Causes (3):**
  1. 9router hung process not detected (LaunchD KeepAlive ≠ hang detection)
  2. db.json wiped on restart with no auto-restore mechanism
  3. Telegram session (agent:main:telegram:direct:1012034994) accumulated 219,776 tokens — context overflow blocking all responses
- **Prevention Implemented:**
  - 9router-health-watchdog.sh: detects hung 9router, restores wiped db.json from rolling backup, kills+restarts via LaunchD (every 2 min)
  - model-outage-monitor.sh: detects "All models failed" spikes, sends Telegram alert direct (bypasses agents) (every 5 min)
  - session-overflow-monitor.sh: scans all session files, archives any >50MB, removes stale mapping (every 10 min)
  - incident-response skill: defines exact A2A steps RED takes when outage reported — no more "I can't coordinate teams"
  - SOUL.md updated: 9router restart pre-approved for OPS, RED-ZEN co-leadership pattern mandated
- **Gap that allowed 3.5h downtime:** No Telegram alert fired during the outage — model-outage-monitor was not yet deployed. Now deployed.
- **Avoid next time:** Deploy monitoring BEFORE the outage, not after. Any new LaunchAgent must also have an accompanying health check.
- **Mistake learned:** RED's response to "hold a conference with the teams" was wrong — said "I can't coordinate teams". Fixed in SOUL.md and incident-response skill.

### LEARNING-20260301-007
- **Date:** 2026-03-01T17:56:45Z
- **Source Ticket:** TICKET-20260301-036
- **Agent:** OPS
- **Category:** workflow
- **Summary:** Health-snapshot auto-ticketing creates duplicate tickets for known issues; needs deduplication against LEARNINGS.md
- **Details:** Health-snapshot was creating 6+ duplicate tickets per pattern for three known/resolved issues: (1) `rg` command not found (LEARNING-20260227-002), (2) `python` command not found (use python3), (3) workspace/tmp path escapes sandbox (LEARNING-20260228-006). All three patterns were already documented in LEARNINGS.md with resolutions, but the ticket creator doesn't check LEARNINGS before opening tickets, causing operational noise.
- **Prevention:** Implement signature-based deduplication in health-snapshot: before creating a ticket, query LEARNINGS.md for matching error signatures/patterns. If found, either skip ticket creation or create a single consolidated ticket referencing the existing learning. Consider implementing a hash-based signature system for common error patterns.
- **Applied To:** TICKET-20260301-036 resolved; recommended ENG implement deduplication logic


### LEARNING-20260301-010
- **Date:** 2026-03-01T00:00:00Z
- **Source Ticket:** TICKET-context-overflow-hardening
- **Agent:** external consultant (cascade/claude-code)
- **Category:** infra | config | workflow
- **Summary:** Context window overflow caused cascading failures — compaction fired too late (6K tokens left), session monitor threshold was 50MB (overflow happens at ~874KB), no retrieval after reset
- **Details:**
  RED and other agents repeatedly overflowed their 131K-token context windows during heavy orchestration tasks (spawning 3+ agents, reading multiple large files). Root causes identified:
  1. `compaction.memoryFlush.softThresholdTokens` was 6000 — fires at 95%+ capacity, leaving no room for compaction to actually execute
  2. `session.maintenance.rotateBytes` was "10mb" — sessions overflow at ~874KB, so this never triggered
  3. `session-overflow-monitor.sh` threshold was 50MB — completely useless, overflow happens at <1MB
  4. No structured procedure for agents to proactively flush before hitting limits
  5. No retrieval mechanism after session reset — agents lost all context on overflow
  When overflow occurred: OpenClaw's internal compaction failed (uses same 131K model), creating a stuck lane queue → blocked Telegram channel → manual human intervention required.
- **Fix applied:**
  1. `openclaw.json`: `softThresholdTokens` 6000→40000 (fires at 70% = 40K tokens remaining); `rotateBytes` 10mb→2mb
  2. `session-overflow-monitor.sh`: threshold 50MB→500KB (archive) + 200KB (warn); LaunchAgent StartInterval 600→180; context extraction saves last 30 turns to `workspace/memory/archived-sessions/<agent>/`; working memory updated with archive pointer
  3. NEW: `workspace/skills/context-window-policy/SKILL.md` — company-wide 70% rule all agents must follow
  4. `workspace/SOUL.md`: Added `## Context Window Management (MANDATORY)` section — flush procedure + recovery protocol
  5. `cron/jobs.json`: 6 new `*/30` heartbeat crons (main, allrounder, eng, ops, research, infosec) that prompt agents to self-flush
  6. Runbook: `workspace/ops/runbooks/context-overflow-runbook.md`
- **Prevention:**
  - Agents must follow the 70% rule: after 5+ file reads, 3+ agent spawns, or 30+ min of conversation → proactively flush to `workspace/memory/working-<agentId>.json`
  - After session reset: run `rag_query.py "recent tasks and decisions" --top 3` + read `workspace/memory/working-<agentId>.json`
  - If compaction fires (you see "Context window at 70% capacity" system message): cooperate, write memory, don't fight it
  - session-overflow-monitor now catches sessions before overflow — but agents should flush BEFORE it triggers
- **Avoid next time:** Never let context grow past 5 large file reads or 3 agent spawns without writing to working memory. The cost of a 30-second flush is zero; the cost of overflow is a stuck lane and manual reset.
- **Applied To:** `openclaw.json`, `scripts/session-overflow-monitor.sh`, `workspace/SOUL.md`, `workspace/skills/context-window-policy/SKILL.md`, `cron/jobs.json`, `LaunchAgents/ai.openclaw.session-overflow-monitor.plist`, `workspace/ops/runbooks/context-overflow-runbook.md`

### LEARNING-20260301-010
- **Date:** 2026-03-01T00:00:00Z
- **Source Ticket:** observation
- **Agent:** cascade (external planning session)
- **Category:** infra | workflow | cost
- **Summary:** Event-driven architecture migration — cron jobs reduced from 110 → 40, n8n as event bus, 3-tier model routing, dashboard-v2 React rebuild
- **Details:**
  - **Cron reduction pattern:** 8 inner loops + 8 meta self-checks + 6 standup check-ins + 4 session anchors + 6 context health checks + multiple provider sync duplicates = 72 jobs disabled. Replaced with 4 consolidated jobs: autonomous-task-dispatcher (every 15min), memory-sync-nightly (1:30am), model-health-check (every 30min), session-warmup-consolidated (every 45min).
  - **Event-driven classification:** 3 buckets: (1) Event-Driven → n8n inbound webhook (GitHub push, Slack message), (2) True Batch → keep as cron (daily portfolio, weekly earnings), (3) Health Check → keep minimal cron (system-pulse, 9router-keepfresh).
  - **Model routing tiers:** lightweight (Haiku 4.5 $0.0008/1K in) / standard (Sonnet 4.6 $0.003/1K) / heavy (Opus 4.6 $0.015/1K) / local (Ollama free). Target split 50/35/15. Gateway reads `model_tier` from payload or classifies via HATAKE.
  - **Prompt caching:** Mark system prompt block with `cache_control: {type: "ephemeral"}`. 90% expected hit rate on SOUL.md (~2000 tokens each call). Large savings on input tokens.
  - **Batch API:** Add `"batch": true` to cron payload for non-real-time jobs. 50% cost reduction. Eligible: nightly sync, weekly reports, content factory.
  - **dashboard-v2:** Full React/TypeScript rebuild at `dashboard-v2/src/`. All 16 tabs + 5 new cost charts (SpendGauge, ModelPie, CostByAgent, BurnRate, SavingsPanel). Uses d3 + TanStack Query. Dev: `npm run dev` at port 5173. Build: `npm run build` (clean, 435KB).
  - **New gateway endpoints:** `/api/mission-control/costs`, `/api/mission-control/savings`, `/api/mission-control/subscriptions` (in gateway/server.js).
  - **New skills:** `workspace/skills/cost-optimization/SKILL.md`, `workspace/skills/event-driven-patterns/SKILL.md`.
  - **Updated:** `workspace/config/routing-profiles.json` (model_tiers + tier_classifier + prompt_caching + batch_api), `workspace/config/budget-guardrails.json` (per-model caps + subscription utilization), `workspace/skills/n8n-webhooks/SKILL.md` (10+ workflow catalog).
  - **Feature branch:** `feature/event-driven-mission-control` — merge to main after validation.
- **Prevention:** Before adding a new cron job, always ask: "Does this need to be a cron, or should it be triggered by an event?" Use `workspace/skills/event-driven-patterns/SKILL.md` classification guide.
- **Applied To:** `cron/jobs.json`, `workspace/config/routing-profiles.json`, `workspace/config/budget-guardrails.json`, `workspace/skills/n8n-webhooks/SKILL.md`, `workspace/skills/cost-optimization/SKILL.md` (NEW), `workspace/skills/event-driven-patterns/SKILL.md` (NEW), `gateway/server.js`, `dashboard-v2/src/` (full rebuild)


### LEARNING-20260302-001
- **Date:** 2026-03-02T00:00:00Z
- **Source:** Event-driven migration — n8n webhook registration debugging
- **Agent:** external consultant (cascade)
- **Category:** infra | n8n | workflow
- **Summary:** n8n webhook nodes MUST have a `webhookId` UUID property or they register with composite paths that never resolve at the standard `/webhook/<path>` URL
- **Details:**
  When importing n8n workflows via the API or UI, webhook nodes without a `webhookId` property on the node object cause `getNodeWebhookPath()` to generate composite paths in the format `{workflowId}/{encodedNodeName}/{path}` (e.g., `GyjnDmZn38ZJVpN7/cost%20alert%20webhook/cost-alert-escalation`). However, incoming webhook requests arrive at `/webhook/cost-alert-escalation` (simple path). n8n's `findStaticWebhook()` looks up `webhookPath` by exact match — the composite path never matches the simple URL, resulting in permanent 404s even after activation.
  The `webhook_entity` table was correctly populated but with the wrong paths. Deactivating/reactivating via API did not help because the path generation happens from the workflow node JSON, not the DB entries.
  Root cause in n8n source (`n8n-workflow/dist/NodeHelpers.js`):
  ```javascript
  if (node.webhookId === undefined) {
    webhookPath = `${workflowId}/${nodeName}/${path}`;  // COMPOSITE — broken
  } else if (isFullPath === true) {
    return path;  // SIMPLE — correct
  }
  ```
  The Webhook node type always sets `isFullPath: true`, so adding `webhookId` to the node is the fix.
- **Fix:** Add `"webhookId": "<uuid>"` at the node level (same level as `id`, `name`, `type`) in every webhook trigger node in the workflow JSON. Then PUT via n8n API + deactivate/reactivate. The `webhook_entity` table will then contain simple paths (e.g., `cost-alert-escalation`) that resolve correctly.
- **Verification:** `sqlite3 ~/.n8n/.n8n/database.sqlite "SELECT webhookPath FROM webhook_entity;"` — should show simple paths, not composite. `curl -X POST http://localhost:5678/webhook/<path>` — should return workflow response, not 404.
- **Affected workflows:** All 4 new n8n workflows were missing `webhookId`. Fixed in commit `e10f7cb`.
- **Applied To:** `workspace/ops/n8n-workflows/*.json` — all webhook trigger nodes now have `webhookId` UUIDs

### LEARNING-20260302-002
- **Date:** 2026-03-02T00:00:00Z
- **Source:** Event-driven migration — gateway server confusion
- **Agent:** external consultant (cascade)
- **Category:** infra | architecture
- **Summary:** The LIVE dashboard/gateway server is `dashboard/server.js`, NOT `gateway/server.js`. All API endpoint additions must go to `dashboard/server.js`.
- **Details:**
  The launchd plist `ai.openclaw.dashboard` points to `dashboard/server.js` (raw Node.js http module, port 19000). There is also a `gateway/server.js` (Express-based) which is NOT launched by any plist and is therefore NOT running. All edits to `gateway/server.js` are inert in production.
  New endpoints added to the live server:
  - `POST /api/chat` — dispatches message to an agent via `openclaw agent --agent <id> --channel slack --message <msg> --json`. Returns `{ok: true, runId, agentId, status: 'dispatched'}` with 202.
  - `GET /api/mission-control/costs` — cost breakdown by agent+model from `cost-events.jsonl`
  - `GET /api/mission-control/savings` — estimated savings vs. all-Standard baseline
  - `GET /api/mission-control/subscriptions` — subscription utilization from `budget-guardrails.json`
- **Rule:** Before adding any endpoint: confirm which server file launchd is actually running with `ps aux | grep "node.*19000" | grep -v grep` or check the plist at `~/Library/LaunchAgents/ai.openclaw.dashboard.plist`.
- **Applied To:** `dashboard/server.js` — endpoints added at commit `e10f7cb`

### LEARNING-20260302-003
- **Date:** 2026-03-02T00:00:00Z
- **Source:** Event-driven migration — Cloudflare Tunnel automation
- **Agent:** external consultant (cascade)
- **Category:** infra | networking | automation
- **Summary:** Cloudflare quick tunnel URL changes on every restart. Automated solution: launchd wrapper clears log on start, tunnel-sync service waits for URL and updates GitHub webhook via PAT.
- **Details:**
  `cloudflared tunnel --url http://localhost:5678` (quick tunnel, no account) gives a new random `*.trycloudflare.com` URL on each restart. Named tunnels (permanent URL) require a Cloudflare account + domain. Without a domain, the solution is to auto-update all webhook registrations after each reboot.
  **Architecture:**
  1. `ai.openclaw.cloudflared` plist runs `scripts/start-cloudflared.sh` (truncates log, then starts cloudflared). Log truncation ensures URL extraction always reads the current session.
  2. `ai.openclaw.tunnel-sync` plist runs `scripts/sync-github-webhook.sh` at load (RunAtLoad=true, KeepAlive=false). Script waits up to 120s for URL to appear in cloudflared.log, then PATCHes the GitHub webhook URL via REST API using a stored PAT.
  3. PAT stored at `workspace/config/github-webhook-pat.txt` (gitignored). Webhook ID at `workspace/config/github-webhook-id.txt`.
  **One-time setup:** `bash ~/.openclaw/scripts/setup-tunnel-auth.sh` — creates PAT (from redinside-dev GitHub account, scope: admin:repo_hook), stores it, finds webhook ID, runs initial sync.
  **Current URL:** `bash ~/.openclaw/scripts/tunnel-url.sh` — always shows current session URL.
  **GitHub accounts:** `anuragg-saxenaa` = developer account (gh CLI auth). `redinside-dev` = repo owner. PAT must come from `redinside-dev` since repo webhook admin is scoped to repo owner.
- **Applied To:** `scripts/start-cloudflared.sh`, `scripts/sync-github-webhook.sh`, `scripts/setup-tunnel-auth.sh`, `scripts/tunnel-url.sh`, `~/Library/LaunchAgents/ai.openclaw.cloudflared.plist`, `~/Library/LaunchAgents/ai.openclaw.tunnel-sync.plist`

---

### LEARNING-20260302-004
- **Category:** n8n Integration
- **Title:** n8n httpRequest node — 3 bugs when dispatching to local gateway
- **Problem:** github-events workflow triggered on every push but all executions errored. Three distinct bugs found in sequence:
  1. **ECONNREFUSED (IPv6):** `http://localhost:19000` → macOS resolves `localhost` to `::1` (IPv6). Gateway only binds IPv4 (`127.0.0.1`). n8n doesn't do IPv4 fallback. **Fix:** Use `http://127.0.0.1:19000` explicitly.
  2. **Wrong body field:** `"contentType": "json"` + `"body": "={{ JSON.stringify({...}) }}"` — n8n ignores the `body` field for this contentType. **Fix:** Use `"specifyBody": "json"` + `"jsonBody": "={{ JSON.stringify({...}) }}"` (matching how `slack-post` workflow is configured).
  3. **Missing method → GET:** No `"method"` field in httpRequest node → n8n defaults to GET. Gateway only handles POST at `/api/chat`. **Fix:** Always set `"method": "POST"` explicitly.
- **Debug method:** Used `nc -l PORT` listener to capture raw HTTP from n8n — saw `GET /api/chat` instead of expected POST. Also checked n8n SQLite DB (`~/.n8n/.n8n/database.sqlite`, table `execution_data`) for decompressed error messages.
- **Correct n8n httpRequest template for local POST:**
  ```json
  { "method": "POST", "url": "http://127.0.0.1:PORT/path",
    "sendBody": true, "contentType": "json", "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({ key: $json.value }) }}" }
  ```
- **Applied To:** `workspace/ops/n8n-workflows/github-events.json`, `error-escalation.json`, `slack-inbound-router.json`, `daily-standup.json`
- **Verification:** `[api/chat] eng dispatched ok` appears in `logs/dashboard.log` after each push event.

### LEARNING-20260302-005
- **Category:** n8n Integration
- **Title:** n8n PUT workflow API — schema validation rejects extra fields
- **Problem:** `PUT /api/v1/workflows/:id` with fields fetched from GET returns `request/body must NOT have additional properties` for: `active`, `tags`, `_meta`, `createdAt`, `updatedAt`, `shared`, `activeVersion`, `activeVersionId`, `versionCounter`, `triggerCount`, `isArchived`, `versionId`, `description`. Also `settings.binaryMode` is invalid.
- **Fix:** Strip all those fields before PUT. Minimal valid payload: `{name, nodes, connections, settings (minus binaryMode)}`. Use `POST /api/v1/workflows/:id/activate` and `/deactivate` separately (not via PUT).
- **Applied To:** All n8n API update scripts going forward.

### LEARNING-20260302-006
- **Date:** 2026-03-02T21:56:05+00:00
- **Source Ticket:** observation (weekly CI rollup)
- **Agent:** OPS
- **Category:** workflow
- **Summary:** Weekly CI rollup: 2894 ok / 1930 failed events; top root causes captured
- **Details:** Generated from `workspace/ops/ci/ci-log.jsonl`. Top root causes: Unknown (no summary) (1412); 400 No credentials for provider: gemini-cli (156); 400 No credentials for provider: claude (66); 400 No credentials for provider: openai (45); ⚠️ ✍️ Write: `to ~/.openclaw/workspace/tmp/session-warmup-last.mirror.json (145 chars)` failed (31)
- **Prevention:** Apply the top 1–2 improvements below and add targeted regression checks for recurring failures
- **Applied To:** workspace/ops/ci/WEEKLY-SUMMARY.md + this entry

**Next improvements (priority):**
- Capture any new edge cases as a ticket/learning when they occur
- Add a focused regression test/dry-run for this workflow
- Document the failure mode + prevention in LEARNINGS.md

### LEARNING-20260304-001
- **Date:** 2026-03-04T01:40Z
- **Source Ticket:** External review (social monitoring pipeline audit)
- **Agent:** CEO / main
- **Category:** Agent Overconfidence + n8n Integration
- **Summary:** Agent built 260KB of documentation for a web scraping skill that never worked (invalid `openclaw browser` syntax). Declared it "production-ready". Actual scraping: zero.
- **Problem:** CEO agent wrote 24 files documenting `openclaw browser` calls with free-form English arguments. That syntax is invalid — `openclaw browser` requires specific flags, not natural language. No scraping ever executed. The 4 n8n workflow JSONs were architecturally good but undeployed. Agent reported "implementation complete" when only docs existed.
- **Fix Applied:**
  1. Deleted `workspace/skills/web-scraping/` (260KB, 24 files)
  2. Installed Scrapling v0.4.1 via pipx — real working scraper
  3. Created `scripts/scrapling-fetch.sh` — tested wrapper (HN fetch verified working)
  4. Deployed 4 n8n workflows with Code node replacements for missing SQLite node
  5. Created `workspace/ideas/` KB pipeline end-to-end
- **Prevention:** Before claiming a skill/tool is "built", verify with an actual test call. One `exec` returning real data = proof. 24 documentation files ≠ working implementation.
- **Applied To:** CEO CLAUDE.md (NON-NEGOTIABLE verification rule already exists — must enforce harder)

### LEARNING-20260304-002
- **Date:** 2026-03-04T01:40Z
- **Source:** n8n 2.9.4 deployment
- **Agent:** OPS
- **Category:** n8n Node Types
- **Summary:** n8n 2.9.4 lacks native SQLite node and `executeCommand` cannot be activated
- **Problem:** n8n-nodes-base.sqlite does not exist in n8n v2.9.4. n8n-nodes-base.executeCommand exists on disk but returns "Unrecognized node type" on activation (likely requires task runner config).
- **Fix:** Replace both with `n8n-nodes-base.code` (JavaScript Code node, typeVersion 2) using `require('child_process').execSync` to call system `sqlite3` CLI. This works cleanly in n8n 2.9.4.
- **Working node types confirmed in n8n 2.9.4:** `n8n-nodes-base.code`, `n8n-nodes-base.httpRequest`, `n8n-nodes-base.scheduleTrigger`, `n8n-nodes-base.wait`, `n8n-nodes-base.if`, `n8n-nodes-base.function`

### LEARNING-20260304-004
- **Date:** 2026-03-04T02:20Z
- **Source:** n8n Code node verification run
- **Agent:** OPS
- **Category:** n8n Code Node Behavior
- **Summary:** n8n Code node typeVersion 2 defaults to `runOnceForEachItem`, NOT `runOnceForAllItems`. Return format differs between modes.
- **Problem:** Code nodes deployed without explicit `mode` field run in `runOnceForEachItem` mode (the default for typeVersion 2). In this mode, you MUST return `{ json: {...} }` (single object, no array). In `runOnceForAllItems` mode, you MUST return `[{ json: {...} }]` (array). Mixing modes with wrong return format causes "A 'json' property isn't an object [item 0]".
- **Additional bug:** Old n8n v1 API variable `items[]` is undefined in Code node typeVersion 2. Use `$input.item.json` (per-item) or `$input.all()` (all items) instead.
- **Additional bug:** `string.equals` condition in IF node (typeVersion 1) throws "compareOperationFunctions[compareData.operation] is not a function" in some n8n 2.9.4 builds. Use `number` conditions with `larger`/`largerEqual`/`smaller` operations instead.
- **Fix Applied:** All Code nodes in 4 social monitoring workflows updated:
  - Per-item nodes (Check Duplicates, Insert Content, Get Content ID, Insert Signals, DLQ Handler): `mode: runOnceForEachItem`, return `{ json: {...} }`, use `$input.item.json`
  - All-items nodes (Log Run, Calculate SLOs): `mode: runOnceForAllItems`, return `[{ json: {...} }]`
  - IF node `Check Alert Threshold`: changed from `string.equals` to `number.largerEqual`
- **Prevention:** When writing n8n Code nodes typeVersion 2, always set `mode` explicitly. Per-item = no array wrapper. All-items = array wrapper. Test with manual execution.
- **Applied To:** 4 n8n workflows (twitter-service, reddit-service, aggregator-service, shared-observability)

### LEARNING-20260304-007
- **Date:** 2026-03-04T04:05Z
- **Source:** content_signals content_id=0 bug
- **Agent:** OPS
- **Category:** sqlite3 Connection Isolation
- **Summary:** `last_insert_rowid()` returns 0 in a new sqlite3 connection — each execSync call opens a new connection
- **Problem:** `Get Content ID` used `SELECT last_insert_rowid()` to get the ID of the row just inserted by `Insert Content`. But each `execSync('sqlite3 ...')` creates a new connection. `last_insert_rowid()` is per-connection and returns 0 in a fresh connection.
- **Fix:** Query content_raw by `dedupe_key` instead: `SELECT id FROM content_raw WHERE dedupe_key = '${safe(dedupe_key)}' LIMIT 1`. The dedupe_key is unique per item per day, so this reliably returns the correct row ID.
- **Applied To:** Get Content ID node in twitter-service and reddit-service

### LEARNING-20260304-006
- **Date:** 2026-03-04T03:35Z
- **Source:** n8n Code node SQL escaping debug
- **Agent:** OPS
- **Category:** n8n Code Node + sqlite3 Shell Escaping
- **Summary:** `sql.replace(/"/g,'\"')` in JavaScript is a no-op — double quotes are NOT escaped for shell
- **Problem:** n8n Code node runs execSync via `/bin/sh -c "{command}"`. When SQL string contains `"` characters (e.g. from JSON.stringify()), they terminate the outer double-quoted shell argument. sqlite3 receives broken SQL; INSERT silently fails (try/catch catches it); node returns `_inserted: 1` (always, regardless of DB success).
- **Root cause:** JS string `'\"'` = `"` (backslash before `"` in single-quoted JS string is not an escape). So `replace(/"/g,'\"')` replaces `"` with `"` — no change.
- **Fix:** Use temp file for SQL instead of inline argument: `fs.writeFileSync(tmpFile, sql); execSync(\`sqlite3 'db' < '${tmpFile}'\`)`. No shell quoting issue — sqlite3 reads the file directly. `require('fs')` available because NODE_FUNCTION_ALLOW_BUILTIN=child_process,fs,path,os in n8n launchd plist.
- **Applied To:** Insert Content, Insert Signals, DLQ Handler in twitter-service and reddit-service

### LEARNING-20260304-005
- **Date:** 2026-03-04T03:10Z
- **Source:** n8n social monitoring pipeline verification
- **Agent:** OPS
- **Category:** n8n Integration Pattern
- **Summary:** n8n `/api/chat` calls return async dispatch receipts — never use for data retrieval inside workflows
- **Problem:** n8n `httpRequest` nodes calling `POST http://localhost:19000/api/chat` get back `{ok: true, status: "dispatched", runId: "..."}` immediately. The RESEARCH agent then runs independently and posts results to Slack/Telegram — NOT back to n8n. Downstream nodes receive the dispatch receipt, not real data.
- **Fix:** Replace `/api/chat` calls in n8n workflows with synchronous alternatives:
  - Reddit: `curl -s https://www.reddit.com/r/SUBREDDIT/hot.json` (free, reliable, no auth)
  - Twitter: `bash ~/.openclaw/scripts/scrapling-fetch.sh stealthy <url>` via `execSync` in Code node
  - Sentiment/enrichment: Local keyword-based Code node (no LLM needed for basic NLP)
- **n8n PUT API rule:** When PUTting a workflow, strip all read-only fields: `updatedAt`, `createdAt`, `id`, `active`, `isArchived`, `meta`, `pinData`, `staticData`, `versionId`, `activeVersionId`, `versionCounter`, `triggerCount`, `shared`, `tags`, `activeVersion`. Only send: `name`, `nodes`, `connections`, `settings`.
- **Timing rule:** Workflow fixes must be applied BEFORE the scheduled run fires. n8n pre-queues scheduled jobs at runtime — if the schedule fires at T+0, your fix must be in place at T-1min or earlier. If you miss a run, wait for the next one (don't try to force-trigger scheduled workflows — `POST /executions/{id}/retry` only works for failed executions, not schedule triggers).
- **Applied To:** twitter-service, reddit-service (Fetch, Parse, Sentiment Analysis, Parse Enrichment nodes)

### LEARNING-20260304-003
- **Date:** 2026-03-04T01:40Z
- **Source:** openclaw.json schema validation
- **Agent:** OPS
- **Category:** OpenClaw Configuration
- **Summary:** OpenClaw does not support general MCP servers — `mcp` is not a valid top-level key
- **Problem:** Added `"mcp": {"ScraplingServer": {...}}` to openclaw.json. openclaw doctor: "Unrecognized key: mcp". The `mcporter` concept in OpenClaw is ONLY for QMD memory backend routing — not general MCP server registration.
- **Fix:** For external tools/CLIs, use `exec` tool via wrapper scripts. Document in SKILL.md. No config change needed — agents already have exec access.
- **Applied To:** workspace/skills/scrapling-mcp/SKILL.md

---

### LEARNING-20260304-008
- **Date:** 2026-03-04
- **Agent:** ENG/OPS
- **Category:** Scrapling Python API
- **Summary:** scrapling Selector `.body` returns raw page bytes, NOT element text. Use `.get_all_text()` and `.attrib.get()`.
- **Problem:** Scrapling's `Selector.body` property returns `self._raw_body` — the full raw HTTP response body of the page (bytes/str), not the text content of the matched element. Calling `.body` on a sub-element returns empty string. BeautifulSoup methods (`.get_text()`, `.get()`, `.find_parent()`) do NOT exist on scrapling Selectors.
- **Fix:**
  - **Element text:** `el.get_all_text(separator=' ', strip=True)` — gets all descendant text concatenated. `el.text` for direct text only.
  - **Attribute access:** `el.attrib.get('href', '')` — attrib is `AttributesHandler` (Mapping), not dict. Supports `.get(key, default)`.
  - **Parent traversal:** `el.parent` (property) then check `el.parent.tag == 'a'`. No `find_parent()` method.
  - **All descendants text:** `el.get_all_text()` recurses through all child nodes including nested spans.
- **Applied To:** scripts/twitter-scrape.py

---

### LEARNING-20260304-009
- **Date:** 2026-03-04
- **Agent:** OPS (via consultant)
- **Category:** OpenClaw Updates
- **Summary:** node@22→node@25 Homebrew upgrade silently broke gateway plist. Use stable symlink not versioned Cellar path.
- **Problem:** After Homebrew upgraded Node from 22→25, `ai.openclaw.gateway.plist` pointed to `/opt/homebrew/Cellar/node@22/22.22.0/bin/node` which no longer existed. Exit code 78 on every restart. Telegram went silent for ~2.5 hours.
- **Fix:** Use `/opt/homebrew/bin/node` (stable symlink). Also applies to `ai.openclaw.node.plist` and `com.9router.autostart.plist`. Check after every `openclaw update`.
- **Prevention:** `grep -r "Cellar/node" ~/Library/LaunchAgents/` after any Node upgrade.

---

### LEARNING-20260304-010
- **Date:** 2026-03-04
- **Agent:** OPS (via consultant)
- **Category:** OpenClaw 2026.3.2 Breaking Changes
- **Summary:** 2026.3.2 breaking changes: heartbeat.directPolicy default reverted to allow + 7 new features applied.
- **Changes applied:**
  1. `agents.defaults.heartbeat.directPolicy: "block"` — prevents heartbeats spamming DMs (2026.3.2 reverted default to allow)
  2. `tools.loopDetection.enabled: true` — prevents runaway exec loops (like 30-iteration loop we saw in logs)
  3. `agents.defaults.pdfModel: {primary: "9router/free-unlimited"}` — enables native PDF analysis tool (new in 2026.3.2)
  4. `session.agentToAgent.maxPingPongTurns: 3` — prevents A2A ping-pong loops (was 5 default)
  5. `agents.defaults.memorySearch: {provider: "ollama", model: "qwen3.5:4b"}` — free local embeddings for RAG
  6. `agents.defaults.humanDelay: {mode: "natural"}` — natural 800-2500ms pause between streaming blocks
  7. `agents.defaults.heartbeat.activeHours: {start:"07:00", end:"02:00"}` — skip heartbeat 2-7am ET (saves Ollama cycles)
- **Invalid keys (don't add):** `gateway.http.endpoints.health` (not valid), top-level `memorySearch` (moved to `agents.defaults.memorySearch`)

---

### LEARNING-20260304-011
- **Date:** 2026-03-04
- **Agent:** ENG
- **Category:** OpenClaw 2026.3.2 Feature Audit
- **Summary:** RedOS uses ~56% of OpenClaw features. Top unused capabilities: SecretRefs, ACP, Diffs plugin, TTS, Sandbox.
- **Feature map:**
  - ✅ Used: cron/scheduler, A2A sessions, webhooks, skills, memory-core RAG, scrapling, n8n delegation, Telegram/Slack, GitHub hooks, streaming, heartbeat, PDF tool (now configured), loop detection (now enabled)
  - ❌ Not used: SecretRefs (all creds plaintext), ACP runtime, Diffs plugin, TTS/Talk, Docker sandbox, LanceDB memory, Zalo plugin, Config Includes ($include), Bedrock auto-discovery
  - ⚠️ Known bugs: per-agent heartbeat interval ignored (#14986), per-agent thinking level in config ignored (#21624), nodes.run broken in 2026.3.2 (#33080)
- **Next sessions:** Implement SecretRefs for credential management (HIGH priority for production)

---

## LEARNING-20260304-002 — OpenClaw 2026.3.2 SecretRef validation (CRITICAL)

**Problem:** Gateway crash-loops on startup with "Secret provider 'default' is not configured" for any apiKey using `{source:"file", provider:"default", id:"..."}`.

**Root cause:** OpenClaw 2026.3.2 added strict secrets validation. Without a `secrets.providers` section in openclaw.json, the "default" provider alias is unconfigured. HOWEVER — env refs with `provider:"default"` work via a passthrough ONLY when `providers["default"]` is NOT configured.

**Fix:**
```json
"secrets": {
  "providers": {
    "credentials-file": {
      "source": "file",
      "path": "/Users/redinside/.openclaw/credentials/secrets.json"
    }
  }
}
```
- Name it anything other than "default" (e.g. "credentials-file")
- Create `credentials/secrets.json` with `{"providers": {"9router": "...", "zai": "..."}}` (chmod 600)
- Update all `apiKey` file refs to `provider: "credentials-file"`, `id: "/providers/<name>"`
- Leave env refs with `provider: "default"` — they use builtin env passthrough

## LEARNING-20260304-003 — fastembed ONNX cache corruption pattern

**Symptom:** `rag_query.py` throws `ONNXRuntimeError: NO_SUCHFILE: model_optimized.onnx`  
**Cause:** fastembed cache at `/var/folders/.../fastembed_cache/` has partial download (no .onnx file)  
**Fix:** `rm -rf /var/folders/bs/srf_0gbd0y13hwm0_g5jvdcw0000gn/T/fastembed_cache/` — next run re-downloads  
**Note:** memsearch.py uses fastembed (BAAI/bge-small-en-v1.5, 384-dim), NOT Ollama. nomic-embed-text is rejected by openclaw.json schema.

## LEARNING-20260304-004 — openclaw.json schema-rejected keys (don't add these)

The following keys are NOT in the openclaw.json schema and will fail `openclaw doctor`:
- `agents.defaults.memorySearch.embeddingModel` (not valid)
- `gateway.ws.pingInterval` / `gateway.ws.pingTimeout` (not valid)
Always run `openclaw doctor` after any openclaw.json change.

---

## LEARNING-20260304-005 — SOUL.md size limit causes silent context truncation

**Date:** 2026-03-04
**Discovered by:** External consultant (monitoring session)
**Symptom:** Security Mandate, CEO Operating Mandate, and Knowledge Transfer Protocol were never seen by agents — they were in the last 4,599 chars of SOUL.md (total 24,599) but OpenClaw truncates at 20,000.
**Root cause:** Multiple sessions added content to SOUL.md without checking total size.
**Fix:** Rewrote SOUL.md to 9,916 bytes (60% reduction). Moved Security Mandate and CEO Mandate to TOP.
**Avoid next time:** After every SOUL.md edit, run `wc -c ~/.openclaw/workspace/SOUL.md`. Must stay under 18,000 bytes. OPS should alert RED if it exceeds threshold. Keep SOUL.md as a lean charter — verbose procedures belong in SKILL.md files.

---

## LEARNING-20260304-006 — Dispatcher exec loop from LEARNINGS.md pre-step

**Date:** 2026-03-04
**Discovered by:** External consultant (loop monitoring)
**Symptom:** `autonomous-task-dispatcher-0001` cron generated "Loop warning: exec called 30 times with identical arguments" repeatedly for 3+ minutes.
**Root cause:** The dispatcher payload included "DISPATCHER PRE-STEP: Read the last 10 entries from workspace/ops/LEARNINGS.md." The agent called exec (tail/cat) 30+ times on LEARNINGS.md (900+ lines) without progress. SOUL.md also mandated rag_query.py before non-trivial tasks — double loop risk.
**Fix:** Simplified dispatcher payload: read AUTONOMOUS.md → if no PENDING, exit immediately → otherwise dispatch. Removed LEARNINGS pre-step entirely. Added explicit "Do NOT run rag_query.py" instruction.
**Avoid next time:** Never add "read large files" pre-steps to high-frequency cron payloads. Dispatchers should be mechanical: read one small file, act, log, exit. Keep RAG queries for actual reasoning tasks, not dispatchers.

---

## LEARNING-20260304-007 — Model routing: use Ollama for mechanical loops

**Date:** 2026-03-04
**Pattern established:** 3-tier model routing to optimize cost and quality:
- Tier 1 (Ollama qwen3.5:4b): heartbeats, health checks, dispatchers, status reads — free, local, fast
- Tier 2 (9router/free-unlimited): standard agent work, analysis, coordination — free subscription tier
- Tier 3 (9router/subagent-reliable or coding-factory): ENG complex impl, INFOSEC L3 review, deep research/finance — smart model only when needed
**Finance note:** 5-min intraday crons run ~36 times/day. These must stay on free-unlimited — cost difference compounds to 36× per day.
**Rule:** Match model to task complexity. Never use a smart model for mechanical tasks. Never use Ollama for work that needs quality output to the user.


COST-SUMMARY (2026-03-04 12:40 EST): weekly_cost_report.py EXIT=0; output status=UNKNOWN (missing_or_invalid_claude_json). Also noticed costsDir contains a stray space: "/Users/redinside/ .openclaw/workspace/costs".
PAYG anomaly persists: workspace/logs/cost-events.jsonl (data range 2026-02-16..2026-02-22) shows net PAYG spend = $86.638349 across 1,847 payg events; openai-codex net = $91.619042; 100 negative-cost rows.
STATE.yaml confirms: “Subscription audit: ChatGPT Pro x2 (due 2026-04-01)”.

---

## LEARNING-20260304-008 — SecretRef migration broke 9router-token-refresh.js

**Date:** 2026-03-04
**Discovered by:** External consultant
**Symptom:** All 9Router OAuth accounts (kiro x3, iflow x2, claude x1) went offline. 9router-token-refresh.log showed "Could not find 9Router API key in openclaw.json" on every keepfresh run (every 4 min) for ~35 hours.
**Root cause:** The keepfresh script's `getNinerKey()` used a regex to find the API key directly in openclaw.json. When we migrated the key to `credentials/secrets.json` via SecretRef (`models.providers['9router'].apiKey = {source:'file', provider:'credentials-file', id:'/providers/9router'}`), the regex found nothing → script exited → all OAuth tokens expired → 9Router disabled the connections.
**Fix:** Updated `getNinerKey()` to resolve SecretRef: read `models.providers['9router'].apiKey` → find `secrets.providers[name].path` → read credentials file → resolve JSON pointer id.
**Recovery:** Running `node scripts/9router-token-refresh.js --all` immediately recovered kiro x3 + claude x1. iflow x2 hit a server rate limit on iflow.cn (temporary — will recover on next keepfresh retry).
**Avoid next time:** EVERY script that reads the 9Router API key from openclaw.json must handle the SecretRef format. When adding any SecretRef to openclaw.json, search all scripts for the old direct-read pattern and update them.

---

## LEARNING-20260304-009 — SOUL.md model routing caused agent model-switching loops

**Date:** 2026-03-04
**Discovered by:** External consultant
**Symptom:** OPS main session stuck in 600s loop calling `curl localhost:18789/api/health` returning "Not Found" 184+ times. Main agent looping on `curl r.jina.ai/...` 36+ times. INFOSEC session reading same file 86 times. Gateway logs showed continuous "Loop warning: exec called 30 times".
**Root cause:** SOUL.md model routing table said "use `ollama/qwen3.5:4b` for health checks". The OPS agent read this, called `sessions.patch` to switch to qwen3.5:4b, then qwen3.5:4b (4B param model) looped on health checks because it can't reliably exit complex multi-step tasks. The model routing table was being interpreted as a directive to switch models mid-session.
**Fix 1:** Updated SOUL.md model routing section to say "Model is set by cron config. Do NOT use sessions.patch to change model mid-session — ever."
**Fix 2:** Added routing profile aliases (`9router/coding-factory`, `9router/subagent-reliable`, `9router/research-deep`, etc.) to `defaults.models` in openclaw.json so agents can reference these models in sessions_spawn without "model not allowed" errors.
**Fix 3:** Archived the stuck sessions to clear the loops.
**Avoid next time:** Model routing guidance in SOUL.md/KNOWLEDGE.md must be framed as cron configuration reference, NOT as agent runtime directives. Agents MUST NOT use sessions.patch for model switching. If a health check cron needs Ollama, set `model: "ollama/qwen3.5:4b"` in the CRON PAYLOAD, not in agent instructions.

---

## LEARNING-20260304-010: Session Loop Watchdog — Multi-Resumption Loop Prevention

**Date:** 2026-03-04
**Severity:** HIGH
**Category:** Autonomous Operations

**Problem:** OpenClaw's per-run loop detection (`tools.loopDetection.globalCircuitBreakerThreshold: 30`) only stops tool execution within a single embedded run. After a 10-minute timeout, sessions resume with "Continue where you left off" — resetting the counter. A looping session can run 30 calls → timeout → resume → 30 more → repeat indefinitely. The OPS session `6abedbd5` had 49x identical `ps aux | grep openclaw-gateway` calls and would have continued without intervention.

**Fix:** Created `~/.openclaw/scripts/session-loop-watchdog.sh` — pure bash + Python, no LLM, zero API cost:
- Runs every 5 minutes via `session-loop-watchdog-0001` cron (OPS, Tier L2)
- Scans all `agents/*/sessions/*.jsonl` modified in last 15 minutes, >20KB
- Parses last 50 tool calls; if top repeated command ≥10 times → archives the session
- Archives by renaming to `.jsonl.archived` (recoverable, not deleted)
- Logs kills to `workspace/logs/loop-watchdog.log`
- Posts Slack alert to `C0AEV3MDEDD` via n8n `slack-post` webhook on any kill

**First run findings:** Immediately caught a live loop — `6abedbd5` (49x `ps aux | grep openclaw-gateway`). Real-world validated on first deployment.

**allowedModels schema note:** `agents.defaults.allowedModels` is NOT a valid openclaw.json key — schema rejects it. Cannot technically restrict Ollama from sessions.patch at the config level. Rely on SOUL.md prompt guidance instead ("Do NOT use sessions.patch to change model — ever").

**Avoid next time:** Any cron running bash watchdog scripts should:
1. Write Python to a temp file rather than using heredoc in `$()` subshell (bash doesn't support it)
2. Use `trap 'rm -f "$PY_SCRIPT"' EXIT` to clean up temp files
3. Test with a synthetic fake session (25+ repeated tool calls, >20KB file) before deploying
