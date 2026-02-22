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
- **Summary:** OpenClaw LLM tool is `message` not `slack`; use `action="sendMessage"` with `to="channel:C0..."` for Slack
- **Details:** All cron prompts had "Use slack tool: action='sendMessage'..." — this caused Ollama models to output pseudocode instead of calling the actual tool. The runtime tool is named `message` and supports: `action="sendMessage"` (send to Slack), `action="read"` (read Slack messages), `to="channel:C0XXXXX"` (Slack channel ID format). Fixed in cron/jobs.json (7 occurrences) and SOUL.md.
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
