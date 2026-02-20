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
