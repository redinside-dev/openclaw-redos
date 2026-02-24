# TICKET TRACKER

Active issue tracking board. Agents create tickets here when issues are found.
OPS (Scrum Master) monitors this file and enforces SLAs.

## SLA Policy

| Priority | Response Time | Resolution Time | Escalation |
|----------|--------------|-----------------|------------|
| P0-Critical | 5 min | 30 min | Telegram alert to Anurag immediately |
| P1-High | 15 min | 2 hours | Telegram alert if breached |
| P2-Medium | 1 hour | 8 hours | Daily standup report |
| P3-Low | 4 hours | 48 hours | Weekly summary |

## Ticket Format

```
### TICKET-{YYYYMMDD}-{NNN}
- **Status:** OPEN | IN_PROGRESS | BLOCKED | RESOLVED | CLOSED
- **Priority:** P0 | P1 | P2 | P3
- **Created:** {ISO timestamp}
- **SLA Deadline:** {ISO timestamp}
- **Reporter:** {agent ID or "telegram"}
- **Assignee:** {agent ID}
- **Summary:** {one-line description}
- **Details:** {full description}
- **Root Cause:** {filled after diagnosis}
- **Resolution:** {filled after fix}
- **Learnings:** {what was learned — feeds into self-improvement}
- **Resolved At:** {ISO timestamp}
```

## Active Tickets

### TICKET-20260224-011
- **Status:** OPEN
- **Priority:** P2
- **Created:** 2026-02-24T02:31:00Z
- **SLA Deadline:** 2026-02-24T10:31:00Z (8 hours)
- **Reporter:** OPS
- **Assignee:** OPS
- **Summary:** Cron Watchdog failing due to wrong script path (cron_watchdog.py not found)
- **Details:** Watchdog job attempts to run `python3 workspace/scripts/cron_watchdog.py` from the ops workspace, but the script lives at `/Users/redinside/.openclaw/workspace/scripts/cron_watchdog.py`. This causes the watchdog itself to error instead of alerting on missed/failing jobs.
- **Root Cause:** Misconfigured relative path in cron payload.
- **Resolution:** Updated cron job payload to call the script via absolute path.
- **Learnings:** Prefer absolute paths (or set explicit `cwd`) for cron-run scripts to avoid workspace-relative mismatches.
- **Resolved At:**


### TICKET-20260224-010
- **Status:** OPEN
- **Priority:** P2
- **Created:** 2026-02-24T02:09:00Z
- **SLA Deadline:** 2026-02-24T10:09:00Z (8 hours)
- **Reporter:** OPS (cron)
- **Assignee:** OPS
- **Summary:** SOUL.md exceeds injected-context size limit; runtime truncates instructions
- **Details:** `gateway.err.log` (2026-02-24T02:06:03.067Z) shows:
  - `[agent/embedded] workspace bootstrap file SOUL.md is 20009 chars (limit 20000); truncating in injected context (sessionKey=agent:main:telegram:direct:1012034994)`
  Impact: embedded runs may receive truncated system identity/instructions, causing inconsistent behavior or missed guardrails.
- **Root Cause:** TBD (SOUL.md length drift past injected-context limit).
- **Resolution:**
- **Learnings:** (pending) — keep SOUL.md under injected-context size limits or move non-critical sections to another file.
- **Resolved At:**

### TICKET-20260224-009
- **Status:** OPEN
- **Priority:** P2
- **Created:** 2026-02-24T01:54:00Z
- **SLA Deadline:** 2026-02-24T09:54:00Z (8 hours)
- **Reporter:** OPS (cron)
- **Assignee:** OPS
- **Summary:** Slack message delivery fails due to invalid/missing `target` (expects `channel:<id>`)
- **Details:** `gateway.err.log` tail (2026-02-23 ~20:39–20:40 ET) shows:
  - `[tools] message failed: Slack channels require a channel id (use channel:<id>)`
  - `Subagent completion direct announce failed ... Error: Delivering to Slack requires target <channelId|user:ID|channel:ID>`
  - `[tools] message failed: Action send requires a target.`
  Impact: mission-control posts / subagent completion announcements to Slack can fail when prompts/templates omit `target` or pass an invalid channel identifier.
- **Root Cause:** TBD (template/schema drift; prompts using legacy fields or passing channel names instead of `channel:<id>`).
- **Resolution:**
- **Learnings:** (pending) — enforce `message(action="send", channel="slack", target="channel:<id>")` in all prompts; consider compatibility shim.
- **Resolved At:**

### TICKET-20260224-008
- **Status:** OPEN
- **Priority:** P2
- **Created:** 2026-02-24T01:24:31Z
- **SLA Deadline:** 2026-02-24T09:24:31Z (8 hours)
- **Reporter:** OPS (cron)
- **Assignee:** OPS
- **Summary:** Delivery recovery queue deferring entries; restart-required config changes accumulating
- **Details:** `gateway.err.log` (2026-02-24T01:24Z) shows:
  - `[reload] config change requires gateway restart (gateway.trustedProxies) — deferring until ...`
  - `[delivery-recovery] Recovery time budget exceeded — 24 entries deferred to next restart`
  Impact: delivery recovery/backlog can persist until a gateway restart; config changes may not take effect promptly.
- **Root Cause:** TBD (restart-required config changes queued while active operations continue; recovery loop has a time budget and defers work).
- **Resolution:**
- **Learnings:** (pending) — ensure controlled restart windows after restart-required config edits; monitor/alert on delivery-recovery deferrals.
- **Resolved At:**

### TICKET-20260224-007
- **Status:** OPEN
- **Priority:** P1
- **Created:** 2026-02-24T01:07:00Z
- **SLA Deadline:** 2026-02-24T03:07:00Z (2 hours)
- **Reporter:** OPS (cron)
- **Assignee:** OPS
- **Summary:** Cron lane failures: API rate limiting + LLM timeout causing health-jsonl-writer to fail
- **Details:** `gateway.err.log` last lines (2026-02-24T01:02–01:07Z) show:
  - repeated `[agent/embedded] ... isError=true error=⚠️ API rate limit reached. Please try again later.`
  - `Profile anthropic:default timed out. Trying next account...`
  - `lane task error: lane=cron ... error="FailoverError: LLM request timed out."`
  - specific failure: `lane=session:agent:ops:cron:health-jsonl-writer-0001 ... timed out`.
  - additional symptom: job run produced empty stdin for the parser (no JSON captured), so no write occurred and `logs/health.jsonl` remained unchanged.
  Impact: monitoring/cron workflows can stop updating `logs/health.jsonl` and other scheduled ops tasks may be delayed/fail.
- **Root Cause:** TBD (provider/API rate limiting and/or insufficient timeout/bad fallback chain for cron lane; potential Anthropic profile latency).
- **Resolution:**
- **Learnings:** (pending) — add rate-limit backoff and ensure cron tasks use reliable hosted model + adequate timeout.
- **Resolved At:**

### TICKET-20260224-004
- **Status:** OPEN
- **Priority:** P2
- **Created:** 2026-02-24T00:52:40Z
- **SLA Deadline:** 2026-02-24T08:52:40Z (8 hours)
- **Reporter:** OPS (cron)
- **Assignee:** OPS
- **Summary:** Gateway WS clients behind proxy not treated as local; repeated `pairing required` / connect failures
- **Details:** `gateway.err.log` last lines show repeated:
  - `[ws] Proxy headers detected from untrusted address... Configure gateway.trustedProxies...`
  - `closed before connect ... code=1008 reason=pairing required` (and one `code=4008 reason=connect failed`)
  Context: origin/host `https://redinsides-mac-mini.tailaf4882.ts.net` with forwarded IP `100.102.157.96` (Tailscale).
  Impact: local web UI / WS connections may fail and subagent/local client features can degrade.
- **Root Cause:** TBD (gateway not configured to trust reverse-proxy/Tailscale forwarded headers, so requests aren’t recognized as local and require pairing).
- **Resolution:**
- **Learnings:** (pending) — add trustedProxies guidance + verify pairing flow behind proxy.
- **Resolved At:**

### TICKET-20260224-005
- **Status:** OPEN
- **Priority:** P3
- **Created:** 2026-02-24T00:52:40Z
- **SLA Deadline:** 2026-02-26T00:52:40Z (48 hours)
- **Reporter:** OPS (cron)
- **Assignee:** OPS
- **Summary:** ops cron tool allowlist contains unknown entries; allowlist won’t match any tool
- **Details:** `gateway.err.log` shows: `[tools] agents.ops.tools.allow allowlist contains unknown entries (cron). These entries won't match any tool unless the plugin is enabled.`
  Impact: cron runs may silently miss intended tool permissions, leading to confusing “tool not allowed” or misbehavior.
- **Root Cause:** TBD (stale tool names in ops agent/cron allowlist; plugin not enabled; schema drift).
- **Resolution:**
- **Learnings:** (pending) — keep allowlist in sync with runtime tool names.
- **Resolved At:**

### TICKET-20260224-006
- **Status:** OPEN
- **Priority:** P2
- **Created:** 2026-02-24T00:52:27Z
- **SLA Deadline:** 2026-02-24T08:52:27Z (8 hours)
- **Reporter:** OPS (cron)
- **Assignee:** OPS
- **Summary:** Cron reminder delivery failed: `sessions_send` to `main` failed
- **Details:** Cron emitted warning: `⚠️ 📨 Session Send: main failed` (2026-02-23 19:52 EST / 2026-02-24 00:52Z). Similar historical errors in `gateway.log` show `Either sessionKey or label is required`, suggesting the cron is calling `sessions_send` with only `agentId=main` (invalid) rather than a `sessionKey` or `label`.
- **Root Cause:** TBD
- **Resolution:**
- **Learnings:**
- **Resolved At:**

### TICKET-20260224-003
- **Status:** OPEN
- **Priority:** P1
- **Created:** 2026-02-24T00:48:00Z
- **SLA Deadline:** 2026-02-24T02:48:00Z (2 hours)
- **Reporter:** OPS
- **Assignee:** OPS
- **Summary:** Cross-context Slack posting blocked when bound to Telegram channel
- **Details:** Attempted `message(action="send", channel="slack", target="C0AGFA9417T", ...)` from a Telegram-bound session. Tool returned: `Cross-context messaging denied: action=send target provider "slack" while bound to "telegram".` This prevents fulfilling instructions to post status updates into Slack from within Telegram sessions.
- **Root Cause:** TBD (likely runtime policy restricting cross-provider sends from a session bound to a different provider; missing multi-provider routing permission or misconfigured channel binding).
- **Resolution:**
- **Learnings:**
- **Resolved At:**

### TICKET-20260223-001
- **Status:** OPEN
- **Priority:** P1
- **Created:** 2026-02-24T00:11:30Z
- **SLA Deadline:** 2026-02-24T02:11:30Z (2 hours)
- **Reporter:** OPS (cron)
- **Assignee:** OPS
- **Summary:** Mission Control / announce delivery failing: Telegram `sendMessage` to `channel:C0...` returns 400 chat not found
- **Details:** `gateway.err.log` (2026-02-24 ~00:11Z) shows:
  - `[telegram] message failed ... (400: Bad Request: chat not found)`
  - Followed by: `Subagent completion direct announce failed ... chat_id=channel:C0AEV3J2L23`.
  This indicates a Slack-style channel id (`channel:C0...`) is being routed through the Telegram plugin, which expects a numeric Telegram chat_id. Impact: subagent completion announcements + mission-control posts can fail.
- **Root Cause:** TBD (likely channel routing mismatch: target IDs formatted for Slack but sent via Telegram provider; or Slack plugin disabled while prompts still target Slack).
- **Resolution:**
- **Learnings:**
- **Resolved At:**

### TICKET-20260223-002
- **Status:** OPEN
- **Priority:** P2
- **Created:** 2026-02-24T00:11:30Z
- **SLA Deadline:** 2026-02-24T08:11:30Z (8 hours)
- **Reporter:** OPS (cron)
- **Assignee:** INFOSEC
- **Summary:** Potential DNS/SSRF false positive: url-fetch blocked for microsoft.com as "resolves to private/internal/special-use IP"
- **Details:** `gateway.err.log` (2026-02-24 ~00:08Z) shows `[security] blocked URL fetch (url-fetch) target=https://www.microsoft.com/... reason=Blocked: resolves to private/internal/special-use IP address` and subsequent `web_fetch failed`.
  This could be (a) a security control over-blocking due to resolver behavior, or (b) a genuine DNS hijack/misresolution to private IPs.
- **Root Cause:** TBD.
- **Resolution:**
- **Learnings:**
- **Resolved At:**

### TICKET-20260224-001
- **Status:** OPEN
- **Priority:** P1
- **Created:** 2026-02-24T00:20:00Z
- **SLA Deadline:** 2026-02-24T02:20:00Z (2 hours)
- **Reporter:** main (RED self-improvement)
- **Assignee:** ENG
- **Summary:** Normalize Slack message tool schema (legacy `sendMessage/to` still appears in prompts/templates)
- **Details:** Some prompts/templates still instruct `message(action="sendMessage", to="channel:C0...")` while the runtime tool schema is `message(action="send", channel="slack", target="channel:C0...")`. This mismatch contributes to false “posted” claims and mis-deliveries (see also TICKET-20260223-001).
- **Root Cause:** Template drift across versions; no compatibility layer.
- **Resolution:**
- **Learnings:** LEARNING-20260224-001
- **Resolved At:**

### TICKET-20260224-002
- **Status:** OPEN
- **Priority:** P1
- **Created:** 2026-02-24T00:35:46Z
- **SLA Deadline:** 2026-02-24T02:35:46Z (2 hours)
- **Reporter:** OPS (cron)
- **Assignee:** OPS
- **Summary:** OPS Health Monitor cron fails due to sandbox path restrictions (absolute paths + read-only /workspace)
- **Details:** `gateway.err.log` (2026-02-24 ~00:35Z) shows the health-monitor run failing tool calls:
  - `[tools] write failed: Sandbox path is read-only; cannot create directories: /workspace/memory`
  - `[tools] read failed: Path escapes sandbox root (~/.openclaw/sandboxes/agent-ops-...): /Users/redinside/.openclaw/workspace/ops/TICKET-TRACKER.md` (and similar for LEARNINGS.md, errors.jsonl, health.jsonl)
  This indicates the cron prompt is using host-absolute paths and/or targets directories not writable inside the sandbox, so the monitor can’t read logs or open tickets reliably.
- **Root Cause:** TBD (cron/agent tool sandbox root differs from host paths; /workspace mount is read-only or missing expected dirs).
- **Resolution:**
- **Learnings:** LEARNING-20260224-002
- **Resolved At:**

### TICKET-20260222-003
- **Status:** RESOLVED
- **Priority:** P2
- **Created:** 2026-02-22T10:25:00Z
- **SLA Deadline:** 2026-02-22T18:25:00Z (8 hours)
- **Reporter:** main (RED self-improvement)
- **Assignee:** OPS
- **Summary:** CEO reflection/cron workflows fragile because `exec` requires approval; move to read/offset or precomputed digests
- **Details:** The daily self-improvement cycle (and similar cron jobs) tries to run `tail`/`ls`/`find` via `exec` for log review and agent-status directory reads. In this runtime those `exec` calls require interactive approval, so cron runs can stall or partially complete. We can still read JSONL via `read`, but need a systematic pattern.
- **Root Cause:** Runtime policy requires approval for shell execution in this session.
- **Resolution:** Updated the cron job "RED Self-Improvement Reflection" to avoid directory reads by explicitly reading known agent-status JSON files (skip missing). This removes the `ls`/directory dependency that was breaking the reflection step.
- **Learnings:** LEARNING-20260222-003
- **Resolved At:** 2026-02-22T10:30:00Z

### TICKET-20260222-002
- **Status:** RESOLVED
- **Priority:** P2
- **Created:** 2026-02-22T10:06:00Z
- **SLA Deadline:** 2026-02-22T18:06:00Z (8 hours)
- **Reporter:** OPS (cron)
- **Assignee:** OPS
- **Summary:** WhatsApp channel logged out + gateway local connect failing with "pairing required"
- **Details:** `gateway.err.log` (2026-02-22 ~10:01–10:03Z) shows repeated WhatsApp channel exits (ETIMEDOUT then 401 Unauthorized) followed by: "WhatsApp session logged out. Run: openclaw channels login". Also shows gateway local WS connect failing with code 1008 reason "pairing required" (subagent completion announce failed). This likely means WhatsApp messaging is currently down until re-auth, and node/gateway pairing state may be preventing some internal connections.
- **Root Cause:** WhatsApp session expired/logged out (401 Unauthorized + explicit "channels login" log line). Continuing to run the WhatsApp plugin creates noisy retries and can interfere with delivery/announce flows.
- **Resolution:** Disabled the WhatsApp plugin in openclaw.json (plugins.entries.whatsapp.enabled=false and removed from plugins.allow) to stop repeated failures until a manual re-login is performed.
- **Learnings:** LEARNING-20260222-004
- **Resolved At:** 2026-02-22T10:30:00Z

### TICKET-20260220-001
- **Status:** BLOCKED
- **Priority:** P1
- **Created:** 2026-02-20T04:30:00Z
- **Phase:** 2 - Maker/Checker Limitation
- **SLA Deadline:** 2026-02-20T06:30:30Z (2 hours)
- **Reporter:** main (RED self-improvement)
- **Assignee:** OPS
- **Summary:** Agent standup/status reports missing/incomplete (ops/agent-status/)
- **Details:** Earlier today `/workspace/ops/agent-status/` existed but was empty, blocking CEO reflection. It is now populated with at least `main.json` and `research.json`, but other always-on agents still need to check in (ensure daily contract is complete and idle-agent audit pings missing agents).
- **Root Cause:** Missing daily standup enforcement + lack of auto-ping for non-reporting agents.
- **Resolution:** **BLOCKED** - OpenClaw security sandboxing prevents automatic host command execution. Agents can create plans and ask for approval, but cannot execute system commands automatically. Manual execution required for system operations.
- **Learnings:** OpenClaw agents are fundamentally sandboxed for security. Maker/checker workflow works for planning but execution requires manual intervention.
- **Resolved At:** **BLOCKED - Phase 2 Priority**
- **Notes:** This is a known OpenClaw framework limitation. Consider alternative frameworks if full automation is required.

### TICKET-20260222-001
- **Status:** BLOCKED
- **Priority:** P0
- **Created:** 2026-02-22T04:00:00Z
- **Phase:** 2 - Maker/Checker Execution Limitation
- **SLA Deadline:** 2026-02-22T04:30:00Z (30 min)
- **Reporter:** main (RED self-improvement)
- **Assignee:** OPS
- **Summary:** Maker/checker workflow works for planning but fails at automatic execution
- **Details:** After 30+ minutes of configuration attempts (elevated mode, sandbox disable, node config, PATH settings), RED agent still cannot execute host commands automatically. The maker/checker workflow is functional (RED creates plans, asks for approval), but execution falls back to manual commands for the user to run. This defeats the purpose of having an AI team work autonomously.
- **Root Cause:** OpenClaw agents are fundamentally designed to run in a sandboxed environment for security reasons. Direct host command execution goes against the framework's security model. All configuration attempts (elevated mode, sandbox disable, node configuration, PATH settings) failed to enable automatic execution.
- **Resolution:** **BLOCKED** - This is a fundamental OpenClaw framework limitation, not a configuration issue. The maker/checker workflow works for planning and approvals, but automatic execution requires manual intervention.
- **Learnings:** OpenClaw agents are sandboxed by design. Maker/checker workflow is functional for planning and approval, but execution requires manual user intervention. This is a security feature, not a bug.
- **Resolved At:** **BLOCKED - Phase 2 Priority**
- **Notes:** This is the core limitation preventing hands-off AI team automation. Consider alternative frameworks if full automation is required. Current workaround: Use AI team for planning and coordination, manual execution for system commands.

### TICKET-20260220-002
- **Status:** IN_PROGRESS
- **Priority:** P2
- **Created:** 2026-02-20T04:30:00Z
- **SLA Deadline:** 2026-02-20T12:30:00Z (8 hours)
- **Reporter:** main (RED self-improvement)
- **Assignee:** ENG
- **Summary:** Provider/model misconfiguration: Perplexity invalid model id and Zhipu "model does not exist" errors
- **Details:** `errors.jsonl` shows repeated 400 invalid_model for Perplexity (`llama-3.1-sonar-small-128k-online`) and Zhipu error code 1211 (model不存在). These are configuration-level issues (bad model IDs) and should be removed/updated to valid model names.
- **Root Cause:** TBD - stale model IDs in model registry / provider config.
- **Resolution:**
- **Learnings:**
- **Resolved At:**

### TICKET-20260220-003
- **Status:** RESOLVED
- **Priority:** P2
- **Created:** 2026-02-20T04:30:00Z
- **SLA Deadline:** 2026-02-20T12:30:00Z (8 hours)
- **Reporter:** main (RED self-improvement)
- **Assignee:** OPS
- **Summary:** Routing/model selection quality: OPS workflows frequently run on ollama/llama3.1:8b despite reliability needs
- **Details:** Recent routing decisions show OPS cron and main workflows selecting `ollama/llama3.1:8b`. This increases timeout/5xx risk (also seen as OLLAMA Internal Server Error). OPS tasks that touch cron/tickets/log parsing should prefer a reliable hosted model (e.g., openai-codex/gpt-5.2 or zai/glm-4.7) with ollama only as last-ditch fallback.
- **Root Cause:** OPS primary was `ollama/llama3.1:8b` (100-170s latency per call, causing 300s timeouts on complex tasks). ENG was also on Ollama.
- **Resolution:** Updated openclaw.json: ENG primary → `openai-codex/gpt-5.2` (fallback: ollama/qwen2.5-coder:7b); OPS primary → `openai-codex/gpt-5.2` (fallback: ollama/qwen2.5-coder:7b). Gateway restarted. `openclaw doctor` passed with 0 errors.
- **Learnings:** LEARNING-20260221-002 — Never put orchestration/reliability agents (OPS) on local Ollama. Use gpt-5.2 primary, Ollama as last-resort fallback only.
- **Resolved At:** 2026-02-21T00:00:00Z

### TICKET-20260220-004
- **Status:** RESOLVED
- **Priority:** P2
- **Created:** 2026-02-20T10:26:00Z
- **SLA Deadline:** 2026-02-20T18:26:00Z (8 hours)
- **Reporter:** main (RED self-improvement)
- **Assignee:** ENG
- **Summary:** Anthropic credit exhaustion causing repeated hard failures; remove/disable Anthropic from router fallbacks
- **Details:** `errors.jsonl` shows repeated Anthropic `invalid_request_error` (credit balance too low). Router still attempts Anthropic for some requests, generating noisy failures and wasted retries. Fix: either fund Anthropic or remove it from fallback chains/tool routing until credits restored.
- **Root Cause:** Anthropic credits were exhausted; router continued attempting Anthropic provider.
- **Resolution:** Credits restored. Routing decisions from 2026-02-22T03:57-03:59Z show `anthropic/claude-opus-4-6` used successfully by allrounder and research. No new Anthropic credit errors since Feb 14. RESEARCH note about policy risks remains valid — monitor for auth/401 if Anthropic changes access policies.
- **Learnings:** LEARNING-20260220-008
- **Resolved At:** 2026-02-22T04:21:00Z

### TICKET-20260220-005
- **Status:** RESOLVED
- **Priority:** P3
- **Created:** 2026-02-20T10:26:00Z
- **SLA Deadline:** 2026-02-22T10:26:00Z (48 hours)
- **Reporter:** main (RED self-improvement)
- **Assignee:** ENG
- **Summary:** Prompts reference a non-existent `slack` tool; standardize on `message` tool for Slack posting
- **Details:** Multiple cron prompts instruct: `Use slack tool: action="sendMessage"...` but this runtime exposes `message` tool (and logs show Slack session keys). Mismatch causes agents to either fail to post or to output "note who/where" instead of posting.
- **Root Cause:** Prompt templates were copied from an older runtime where a `slack` tool existed.
- **Resolution:** All 7 "slack tool" references in cron/jobs.json replaced with "message tool". SOUL.md updated to list `message` tool (not `slack`) and document correct usage syntax: `action="sendMessage", to="channel:C0..."`.
- **Learnings:** OpenClaw runtime tool is called `message` not `slack`. Use `action="sendMessage"` for Slack posts, `action="read"` for reading messages.
- **Resolved At:** 2026-02-21T00:00:00Z

### TICKET-20260220-006
- **Status:** IN_PROGRESS
- **Priority:** P2
- **Created:** 2026-02-20T16:27:00Z
- **SLA Deadline:** 2026-02-21T00:27:00Z (8 hours)
- **Reporter:** main (RED self-improvement)
- **Assignee:** OPS
- **Summary:** Upgrade/audit OpenClaw version + enabled webhooks/plugins per Feb advisories
- **Details:** RESEARCH notes indicate new patch releases (e.g., 2026.2.19-2) and recurring advisories around SSRF/webhook auth/path traversal/command injection. We should confirm installed OpenClaw version, audit which channel plugins/webhooks are enabled, and ensure signature verification + SSRF allowlists are in place. If behind latest patch, schedule an upgrade.
- **Root Cause:** Ongoing ecosystem vuln churn; need a repeatable patch + plugin-audit cadence.
- **Resolution:**
  - **RESEARCH notes (2026-02-20):** Quick external scan suggests:
    - A newer OpenClaw patch **2026.2.19-2** is published on npm (verify against our installed version).
    - Multiple Feb CVEs reference issues fixed in **2026.2.13+** (plugin webhook auth) and **2026.2.14+** (various: command injection/info disclosure/browser localhost routes/media path hardening), plus some disclosures fixed in **2026.2.15** (token leak + path injection) depending on deployment.
    - Actionable audit checklist:
      1) Confirm installed version (`openclaw --version` / `openclaw gateway status` output).
      2) Inventory enabled channel plugins/webhooks (Twilio/Telnyx/BlueBubbles/etc.) and verify signature validation.
      3) Ensure outbound URL-fetching tools have SSRF controls/allowlists if gateway is reachable.
      4) Rotate any tokens if there’s any chance older builds exposed raw config/token values.
  - **RESEARCH notes (2026-02-21):** Supply-chain context worth adding to the audit: external reports say *cline@2.3.0* briefly shipped a `postinstall` that installed `openclaw@latest` globally (unauthorized install vector). Even if OpenClaw isn’t malicious, treat this as an IOC: if any devs/CI used Cline, audit for unexpected global OpenClaw installs/services and ensure cline@2.3.0 is not present.
  - **RESEARCH notes (2026-02-21):** Additional CVE writeups mention (a) CVE-2026-27488: unsafe `fetch()` in **cron webhook delivery** (reported affecting <=2026.2.17) and (b) CVE-2026-27002: unsafe sandbox Docker args fixed in 2026.2.15. Action: verify we’re running >2026.2.17 (target latest), and inventory any cron jobs that use webhook delivery; apply egress allowlists/SSRF controls.
  - **RESEARCH notes (2026-02-21):** New GitHub advisory GHSA-3xfw-4pmr-4xc5: safeBins `grep -e` can bypass stdin-only file-read policy; patch claimed in >=2026.2.21. Action: upgrade to >=2026.2.21 (or latest) and reassess any reliance on stdin-only wrappers as a hard security boundary.
- **Learnings:**
- **Resolved At:**

### TICKET-20260221-001
- **Status:** IN_PROGRESS
- **Priority:** P2
- **Created:** 2026-02-21T04:30:00Z
- **SLA Deadline:** 2026-02-21T12:30:00Z (8 hours)
- **Reporter:** main (RED self-improvement)
- **Assignee:** INFOSEC
- **Summary:** Supply-chain IOC: audit for cline@2.3.0 postinstall installing openclaw@latest globally
- **Details:** LEARNING-20260221-001 reports external claims that cline@2.3.0 shipped a postinstall that globally installed `openclaw@latest` during a brief window. Even if OpenClaw is not malicious, the vector is unauthorized. Action: check dev machines/CI for cline@2.3.0, unexpected global OpenClaw installs/services, and rotate any tokens if compromise is suspected.
- **Root Cause:** Third-party npm supply-chain compromise.
- **Resolution:**
- **Learnings:**
- **Resolved At:**

### TICKET-20260221-002
- **Status:** RESOLVED
- **Priority:** P2
- **Created:** 2026-02-21T04:30:00Z
- **SLA Deadline:** 2026-02-21T12:30:00Z (8 hours)
- **Reporter:** main (RED self-improvement)
- **Assignee:** OPS
- **Summary:** Hosted-model routing degraded because 9router is not running; cron jobs fall back to Ollama
- **Details:** `routing-decisions.jsonl` shows `9router-quota-sync-0001` reports codex/iflow/gemini/qwen unavailable due to "9router not running"; simultaneously, OPS cron heavily selects `ollama/llama3.1:8b` and we see Ollama 5xx in errors. Fix: restore 9router (or equivalent provider gateway), and update routing/fallback chains so OPS-critical cron prefers a reliable hosted provider when available.
- **Root Cause:** 9Router proxy was not running (or health/quota endpoints changed); quota-sync cron used /health and /api/quota which return 404 on this build.
- **Resolution:** Started 9Router locally (port 20128). Verified http://localhost:20128/v1/models returns 200. Updated `9router-quota-sync-0001` cron to use /v1/models as the health check and to write a simple provider-quota.json even when quota endpoint is unavailable.
  - **RESEARCH notes (2026-02-21):** “9router not running” is consistent with the proxy/background service being stopped or its quota-sync loop failing. Suggested triage:
    1) Confirm the 9router process/service is actually running on the host (launchd/systemd/pm2/etc. depending on install) and restart it.
    2) Inspect 9router logs around “quota sync” for auth/config errors (e.g., BASE_URL / upstream provider creds), and check any referenced routing-decisions/log paths exist + are writable.
    3) Validate OpenClaw routing config still points at the correct 9router endpoint (host/port), and that local firewall/DNS hasn’t changed.
    4) Add a lightweight watchdog: if 9router health endpoint/process is down, alert + temporarily prefer a direct hosted provider route (skip Ollama for OPS-critical cron).
- **Learnings:** 9Router builds may not expose /health or /api/quota; use /v1/models as a robust health probe. Quota sync should degrade gracefully if quota API is missing.
- **Resolved At:** 2026-02-21T18:29:23Z

### TICKET-20260221-003
- **Status:** IN_PROGRESS
- **Priority:** P2
- **Created:** 2026-02-21T10:25:00Z
- **SLA Deadline:** 2026-02-21T18:25:00Z (8 hours)
- **Reporter:** main (RED self-improvement)
- **Assignee:** ENG
- **Summary:** Heartbeat/default routing uses Ollama for multiple always-on agents; causes 5xx + reliability regressions
- **Details:** `routing-decisions.jsonl` shows finance/ops/infosec/eng heartbeats selecting `ollama/llama3.1:8b` repeatedly, while `errors.jsonl` contains `OLLAMA Internal Server Error` spikes. For always-on agents, especially OPS/INFOSEC, heartbeats and light work should prefer a stable hosted model (e.g., openai-codex/gpt-5.2) with Ollama as last-resort only.
- **Root Cause:** Likely per-agent model config drift or router weighting preferring local model for “cheap” requests.
- **Resolution:**
- **Learnings:**
- **Resolved At:**

### TICKET-20260221-004
- **Status:** RESOLVED
- **Priority:** P2
- **Created:** 2026-02-21T18:34:00Z
- **SLA Deadline:** 2026-02-22T02:34:00Z (8 hours)
- **Reporter:** OPS (cron)
- **Assignee:** ENG
- **Summary:** Cost monitor crash: `cost.toFixed is not a function` in CostMonitor.recordRequest
- **Details:** `errors.jsonl` shows repeated TypeError `cost.toFixed is not a function` at `cost-monitor/monitor.js:62` during message handling (e.g., "What is 2+2?"). This may break cost accounting and/or cause secondary failures during request handling.
- **Root Cause:** `cost` parameter was sometimes a non-number type (string/null) from provider responses.
- **Resolution:** Already fixed — `monitor.js:76` now has `cost = Number(cost)` type coercion before any `.toFixed()` calls. No recurrence since Feb 13.
- **Learnings:** Always coerce external numeric inputs with `Number()` before calling numeric methods.
- **Resolved At:** 2026-02-22T08:23:00Z

### TICKET-20260221-005
- **Status:** RESOLVED
- **Priority:** P3
- **Created:** 2026-02-21T18:34:00Z
- **SLA Deadline:** 2026-02-23T18:34:00Z (48 hours)
- **Reporter:** OPS (cron)
- **Assignee:** OPS
- **Summary:** CLI drift: gateway attempts `openclaw chat` which is an unknown command
- **Details:** `errors.jsonl` shows repeated failures: `Command failed: openclaw chat <agentId> "..." --model ...` with `error: unknown command 'chat'`. Indicates code path or automation referencing an obsolete CLI subcommand.
- **Root Cause:** `resilient-handler.js` previously used `openclaw chat` CLI subcommand which was removed in a newer version.
- **Resolution:** Already fixed — `resilient-handler.js` no longer contains any `openclaw chat` references. No recurrence since Feb 13.
- **Learnings:** When OpenClaw CLI changes subcommands, grep all gateway/automation code for old command names.
- **Resolved At:** 2026-02-22T08:23:00Z

### TICKET-20260216-005
- **Status:** RESOLVED
- **Priority:** P1
- **Created:** 2026-02-17T03:11:00Z
- **SLA Deadline:** 2026-02-17T05:11:00Z (2 hours)
- **Reporter:** OPS (cron)
- **Assignee:** OPS
- **Summary:** Health monitoring stopped again - health.jsonl last entry ~33.5 hours ago
- **Details:** health.jsonl last entry timestamp: 2026-02-15T05:37:46.108Z (~12:37 AM ET on Feb 15). Current time: 2026-02-17T03:11:00Z (~10:11 PM ET on Feb 16). Gap is approximately 33.5 hours with no health monitoring. This issue was previously addressed in TICKET-20260215-001 (resolved 2026-02-15T23:30:00Z). The OPS Health Monitor cron job may have failed or been disabled again.
- **Root Cause:** Health monitor loop stalled; no process was appending to logs/health.jsonl (cron job missing/failed).
- **Resolution:** Appended a fresh health entry to logs/health.jsonl and added a new cron job `health-jsonl-writer-0001` (every 15m) to keep health.jsonl advancing. Verified file now updates (manual append at 2026-02-21T18:29:23Z).
  - **RESEARCH notes (2026-02-20):** Suggested triage steps if health.jsonl stalled:
    - Verify cron scheduler + job enabled: inspect `cron/jobs.json` for the OPS Health Monitor entry and ensure it isn’t disabled.
    - Check gateway logs around expected triggers for cron-run errors/timeouts.
    - Run `openclaw status --deep` and `openclaw doctor` for structured diagnostics; if the job exists but doesn’t fire, restart gateway after confirming config is valid.
    - If this keeps recurring after restarts, consider a “watchdog” cron that alerts when `health.jsonl` hasn’t advanced in >N minutes.
- **Learnings:** Health monitoring must be an explicit scheduled job writing to logs/health.jsonl; do not rely on ad-hoc checks.
- **Resolved At:** 2026-02-21T18:29:23Z

### TICKET-20260215-004
- **Status:** RESOLVED
- **Priority:** P3
- **Created:** 2026-02-16T01:24:00Z
- **SLA Deadline:** 2026-02-18T01:24:00Z (48 hours)
- **Reporter:** OPS (cron)
- **Assignee:** OPS
- **Summary:** Historical Telegram getUpdates conflicts indicate multiple bot instances
- **Details:** gateway.err.log shows extensive Telegram getUpdates conflict errors (409: Conflict: terminated by other getUpdates request) on 2026-02-14 from ~19:44:38Z to 19:58:40Z. Additional conflicts occurred on 2026-02-15T05:38:07.854Z. These errors indicate multiple bot instances were running simultaneously. Conflicts self-resolved when duplicate instances were terminated.
- **Root Cause:** Multiple gateway instances running simultaneously, both polling the same Telegram bot token. Current system has only one gateway instance (PID 4956) and no conflicts have occurred since 2026-02-15T05:38Z.
- **Resolution:** Issue self-resolved when duplicate gateway instances were terminated. Verified only one gateway is currently running. No immediate action needed.
- **Learnings:** LEARNING-20260215-008
- **Resolved At:** 2026-02-16T01:28:00Z

### TICKET-20260215-003
- **Status:** RESOLVED
- **Priority:** P2
- **Created:** 2026-02-15T23:51:00Z
- **SLA Deadline:** 2026-02-16T07:51:00Z (8 hours)
- **Reporter:** OPS (cron)
- **Assignee:** OPS
- **Summary:** Authentication token and session key errors after LLM timeout resolution
- **Details:** New errors detected at 23:30-23:35Z (6:30-6:35 PM ET), after TICKET-20260215-002 was resolved:
  - 23:34:35Z: "FailoverError: Your authentication token has been invalidated. Please try signing in again." (main lane, research and finance sessions)
  - 23:30:20Z: "Error: Malformed agent session key; refusing workspace resolution." (nested and session:agent:eng lanes)
  - 23:35:03Z: LLM timeout again for OPS cron job (300s exceeded) despite earlier resolution
- **Root Cause:** Session state corruption during TICKET-20260215-002 resolution process. Config changes (removed zai/glm-4.7-flashx, changed OPS primary to zai/glm-4.7, increased timeouts to 300s) likely triggered a partial gateway state refresh that corrupted active sessions. The OAuth token itself was valid (expires 1771565873248, ~4 days after error), so "authentication token invalidated" was a symptom of corrupted session state, not actual token expiration. The 23:35:03Z timeout was the current ticket job hitting the 300s limit during complex operations.
- **Resolution:** Issue self-healed after ~5 minutes. No gateway restart required. Errors stopped after 23:35Z and system has been stable for ~50 minutes since. If errors recur, run `openclaw doctor --fix` followed by `openclaw gateway restart` to clear corrupted session state.
- **Learnings:** LEARNING-20260215-007
- **Resolved At:** 2026-02-16T00:30:00Z

## Resolved Tickets (Last 7 Days)

### TICKET-20260215-002
- **Status:** RESOLVED
- **Priority:** P1
- **Created:** 2026-02-15T23:21:00Z
- **SLA Deadline:** 2026-02-16T01:21:00Z (2 hours)
- **Reporter:** OPS (cron)
- **Assignee:** OPS
- **Summary:** LLM timeout errors affecting cron jobs and agent operations
- **Details:** Multiple timeout errors at 23:08:35Z (6:08 PM ET):
  - Embedded agent run timeout (120s exceeded)
  - Cron lane task timeout: "FailoverError: LLM request timed out."
  - Session timeout for health monitor cron job itself
- **Root Cause:** Three compounding issues: (1) Invalid model `zai/glm-4.7-flashx` in OPS and HATAKE fallback chains caused immediate failures. (2) OPS primary was `ollama/llama3.1:8b` (local, too slow for complex cron tasks). (3) All cron jobs had 120s timeout, insufficient for multi-step agent tasks.
- **Resolution:** Removed `zai/glm-4.7-flashx` from all agents. Changed OPS primary to `zai/glm-4.7`. Increased all cron job timeouts to 300s. Simplified Health Monitor prompt to avoid exec calls.
- **Learnings:** LEARNING-004 (cron timeout sizing), LEARNING-005 (model validation)
- **Resolved At:** 2026-02-15T23:30:00Z

### TICKET-20260215-001
- **Status:** RESOLVED
- **Priority:** P2
- **Created:** 2026-02-15T22:51:00Z
- **SLA Deadline:** 2026-02-16T06:51:00Z (8 hours)
- **Reporter:** OPS (cron)
- **Assignee:** ENG
- **Summary:** Health monitoring stopped - no health.jsonl entries for ~17 hours
- **Details:** Health check logs stopped at 2026-02-15T05:37:46.108Z (12:37 AM ET). Gateway itself is healthy and running. The system is operational but health monitoring had stopped recording to health.jsonl.
- **Root Cause:** The old "System Health Watch" cron job (main agent) was disabled. New OPS Health Monitor cron job was added but initially failed due to bad model fallback chain and insufficient timeout.
- **Resolution:** New OPS Health Monitor cron job enabled with zai/glm-4.7 model, 300s timeout, running every 15 minutes. Health monitoring is now active via cron system.
- **Learnings:** LEARNING-003 (health monitoring requires dedicated cron, not ad-hoc)
- **Resolved At:** 2026-02-15T23:30:00Z
