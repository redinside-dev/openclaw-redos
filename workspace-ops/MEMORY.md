# MEMORY.md - OPS Long-Term Memory

## Critical System Issues (2026-03-13)

### P0 Critical Incidents

**TICKET-20260313-002: web_search Perplexity quota exhausted**
- **Issue**: 401 authentication failures from Perplexity API
- **Root Cause**: Billing quota exceeded or invalid API key
- **Impact**: All research operations blocked
- **SLA**: Requires human intervention from Anurag
- **Action Taken**: None yet - requires billing check at perplexity.ai/settings/api
- **RESOLVED 2026-06-08 19:21 EDT** — provider migrated from Perplexity to exa (TICKET-20260228-018, ZEN dispatch ALL-1780960806). Smoke test `web_search("test")` returns 200.

**TICKET-20260313-001: Consultant recursive stall**
- **Issue**: System cannot self-heal from recursive failures
- **Root Cause**: Originally unknown; **root cause identified 2026-03-24 as TICKET-20260324-EXEC-001 (empty exec allowlist)** — `tools.exec.security="allowlist"` with no `allow` patterns blocked everything. Fix: `security: "full"`. RESOLVED.

### P1 Issues (Active)

**TICKET-20260313-005: 9router/free-unlimited timeouts**
- **Issue**: 26 consecutive timeout failures
- **Models Affected**: free-unlimited
- **Impact**: Agent operations delayed
- **Current Status**: Mitigated 2026-06-08 (TICKET-20260608-005) — 12 brief-generation crons bumped to timeoutSeconds=600. If crons still time out at 600s, file P1 + consider model switch.

**TICKET-20260313-006/007: ollama/llama3.1:8b model_not_found**
- **Issue**: 79 consecutive model not found errors
- **Models Affected**: llama3.1:8b
- **Root Cause**: Model not pulled or Ollama not running
- **Action Needed**: `ollama pull llama3.1:8b` or verify Ollama status
- **Status (2026-06-08 22:35 EDT):** ollama running (PID 1124, qwen3.5:4b only); dependent cron `system-pulse-always-on-0001` no longer registered. RESOLVED structurally (TICKET-20260401-OLLAMA-DOWN).

**TICKET-20260313-008/010: minimax auth failures**
- **Issue**: 76 consecutive authentication failures
- **Service**: Minimax AI
- **Root Cause**: Invalid credentials or service configuration
- **Action Needed**: Verify credentials in gateway config

## OpenClaw CVE Coverage Reference (as of 2026-06-09, gateway on 2026.6.1)

**Quick check before filing a CVE-related ticket:** consult this table. All CVEs below are patched in versions ≤ 2026.4.15, so our 2026.6.1 deployment is **clean** against all of them. Confirmed by `openclaw security audit --deep` returning 0 critical on 2026-06-09.

| CVE | CVSS | Component | Fix version | Fix commit / PR | Status on 2026.6.1 |
|-----|------|-----------|-------------|------------------|--------------------|
| CVE-2026-22172 | 9.9 CRIT | WebSocket shared-auth scope elevation | 2026.3.12 | `5e389d5e` (PR #44306) | ✅ PATCHED |
| CVE-2026-25253 | 8.8 | One-click RCE via query-string gatewayUrl | 2026.1.29 | — | ✅ PATCHED |
| CVE-2026-32042 | 8.8 | Unpaired device priv-esc to operator.admin | 2026.2.25 | `8d1481cb` | ✅ PATCHED |
| CVE-2026-43527 | 6.3 | Browser SSRF default | ~2026.4.15 | — | ✅ PATCHED |
| CVE-2026-43582 | 4.9 | DNS rebinding SSRF | 2026.4.10 | — | ✅ PATCHED |
| CVE-2026-44109 | 9.2 CRIT | Feishu webhook / card-action auth bypass | 2026.4.15 | `c8003f1b` (PR #66707) | ✅ PATCHED |
| CVE-2026-35674 | 8.8 | Plugin/MCP install priv-esc (missing operator.approvals record) | ≤2026.6.1 | — | ✅ PATCHED |
| CVE-2026-35673 | 5.9 | SSRF in browser fetch path | ≤2026.6.1 | — | ✅ PATCHED |
| CVE-2026-32906 | 8.7 | Slack approval-bypass via crafted reaction | ≤2026.6.1 | — | ✅ PATCHED |
| GHSA-mj5r-hh7j-4gxf class (Jun 3) | — | Display-name allowlist impersonation (Slack/Discord/Matrix/Zalo/Microsoft Teams) | ≤2026.6.1 | maintainer-acknowledged + fixed | ✅ PATCHED |
| CVE-2026-53838 | 9.8 CRIT | OpenClaw Node Pairing Reconnection state mutation | 2026.5.27 | — | ✅ PATCHED |
| CVE-2026-53828 | 8.8 HIGH | Owner-Only Command Bypass | 2026.5.6 | — | ✅ PATCHED |
| CVE-2026-53835 | 4.3 MED | Feishu binding bypass | 2026.5.6 | — | ✅ PATCHED (component-N/A: no Feishu) |
| CVE-2026-53827 | 6.5 MED | SSRF via loopback URLs | 2026.5.2 | — | ✅ PATCHED |

**Source:** jgamblin/OpenClawCVEs (GitHub), GHSA / NVD CVE records. Verification done 2026-06-09T02:32Z by OPS in response to RESEARCH handoff from cron 1d58e865. Cycle 19 additions verified 2026-06-09T10:21Z (cron 1d58e865) via `openclaw security audit --deep` returning 0 critical. Cycle 20 additions (CVE-2026-53835 + CVE-2026-53827) verified 2026-06-16T17:50Z by OPS in response to RESEARCH cycle 108 handoff.

### Non-OpenClaw CVEs (Cycle 134 RESEARCH handoff 2026-06-18 22:24Z Thu)

| CVE | CVSS | Component | Fix version | Status on RedOS |
|-----|------|-----------|-------------|-----------------|
| CVE-2026-42271 | 9.8 CRIT | LiteLLM MCP test endpoint command injection (CISA KEV 2026-06-08) | LiteLLM ≥1.83.14-stable | ⚠️ TICKET-20260617-LITELLM-CVE-CHAIN-AUDIT-001 P0 OPENED |
| CVE-2026-49468 | 9.5 CRIT | LiteLLM Host-header auth bypass v2 | LiteLLM ≥1.84.0 | ⚠️ TICKET-20260617-LITELLM-CVE-CHAIN-AUDIT-001 P0 OPENED |
| CVE-2026-47102 | 8.8 HIGH | LiteLLM /user/update privilege escalation | LiteLLM ≥1.83.14-stable (full chain only) | ⚠️ TICKET-20260617-LITELLM-CVE-CHAIN-AUDIT-001 P0 OPENED |
| CVE-2026-53842 | 7.1 HIGH | OpenClaw CLOUDSDK_PYTHON env var injection | 2026.5.2 | ✅ PATCHED (RedOS on 2026.6.1) |
| CVE-2026-48907 | 10.0 CRIT | Joomla JCE (CISA KEV 2026-06-18, federal deadline 2026-06-19) | Joomla JCE patch | ✅ N/A (no Joomla/JCE in RedOS) |
| CVE-2025-34291 | 8.8 HIGH | Langflow + MuddyWater APT (CISA KEV 2026-06-18) | Langflow patch | ⚠️ AUDIT REQUIRED (check for Langflow usage) |
| CVE-2026-34926 | 8.8 HIGH | Trend Micro Apex One (CISA KEV 2026-06-18) | Trend Micro patch | ✅ N/A (no Trend Micro AV on RedOS) |
| CVE-2026-50656 | 7.8 HIGH | Microsoft Defender RoguePlanet (NTFS reparse) | Patch pending | ✅ N/A (Windows-only, RedOS macOS) |

**Mastra supply chain attack (Jun 17 2026):** 144 npm packages compromised via easy-day-js typosquat + hijacked former contributor account. NOT RedOS-impacting (no Mastra usage). Validates TICKET-20260617-SUPPLY-CHAIN-TRIAGE-001 P0 55h+ unopened (4-source convergence: Microsoft Security Blog + JFrog + Cloudsmith + RH-ISAC).

**LiteLLM operator guidance (cycle 134 NUANCE):** CVE-2026-47102 individually fixed in 1.83.10 but full chain ONLY in 1.83.14-stable. Operators on 1.83.10-1.83.13 are STILL VULNERABLE. Patch matrix: `pip install litellm>=1.83.14-stable starlette>=1.0.1` + rotate ALL provider keys + audit proxy_admin + block /mcp-rest/test/* + disable Custom Code Guardrails if unused.

**Affected-component note:** CVE-2026-44109 (Feishu), CVE-2026-22172 (WebSocket shared-auth), and CVE-2026-32042 (unpaired device) only affect deployments that use the respective components. Our deployment uses slack+telegram (no Feishu), so even if we were behind on patches, the Feishu CVE would be N/A. The CVE-2026-22172 scope-elevation could have affected us if a shared-token backend client was active — none configured. CVE-2026-32042 affects shared-auth gateway mode with unpaired devices — we use device-paired model.

**Re-verify protocol when a new CVE drops:** (1) check the fix version, (2) run `openclaw security audit --deep`, (3) confirm our installed version ≥ fix version, (4) confirm the affected component is in our config, (5) only file a ticket if both 3 AND 4 are true.

## System Configuration

### Gateway Status
- **Running**: Yes (PID 63952, up 4h+ as of 2026-06-09T02:22Z)
- **Port**: 18789
- **Version**: OpenClaw 2026.6.1 (2e08f0f)
- **Control UI**: Blocked (missing allowedOrigins config) — P2/P5 cosmetic
- **npm dist-tags**: latest=2026.6.1, beta=2026.6.5-beta.5 (monitor-only; re-open trigger: `latest > 2026.6.1`)
- **2026.6.9 PRE-RELEASE** (2026-06-19T05:52Z, NOT stable): richer Telegram, stronger Codex/GPT-5.3 Spark OAuth routing, standalone provider plugins, web/native client improvements, security fixes (redact secrets, block internal HTTP session overrides). **CRITICAL: Memory Index OOM #92187 root-cause fix NOT visible in pre-release highlights.** TICKET-20260616-MEMORY-INDEX-MISMATCH-001 P2-STRONG remains CONDITIONAL on stable 2026.6.9 with explicit OOM fix. Recommended action: stage 2026.6.9 on non-prod with INFOSEC, do NOT fleet-rollout until stable tag + OOM fix verified. (2026-06-19T03:20Z Fri per RESEARCH cycle 136)
- **Mastra supply chain cleanup COMPLETE per PR #18056** (2026-06-19T03:20Z Fri per RESEARCH cycle 136): 131 packages patch-bumped, latest dist-tag forward, unauthorized owners removed, tokens rotated. SUPPLY-CHAIN-TRIAGE-001 P0 ENRICHED (still 60h+ unopened).
- **Mini Shai-Hulud worm is PUBLIC** (2026-06-19T06:35Z Fri per RESEARCH cycle 135, NCC Group Jun 18): 170+ npm + 2 PyPI packages compromised, 518M weekly downloads at risk, source released by TeamPCP. **Persistence includes VS Code AND `~/.claude/` SessionStart hooks** — immediate scan recommended on all dev hosts. VALIDATES SUPPLY-CHAIN-TRIAGE-001 P0 (Miasma/IronWorm + Mini Shai-Hulud = two AI-coding tool worm classes in 48h).
- **5 new OpenClaw CVEs Jun 17** (2026-06-19T06:35Z Fri per RESEARCH cycle 135: 53844/53858/53859/53863/53842): all CVSS 6.5-7.1, all already covered by ≥2026.6.6. RedOS on 2026.6.1 — gap: no stable version between 2026.6.1 and 2026.6.6 ships yet. Absorbed into TICKET-20260616-MEMORY-INDEX-MISMATCH-001 P2-STRONG scope.
- **OpenClaw 2026.6.8 quietly kills keyless search auto-fallback** (2026-06-19T06:35Z Fri per RESEARCH cycle 135): verify `PARALLEL_API_KEY` explicitly configured (was silently exfiltrating to DuckDuckGo). Absorbed into TICKET-20260616-MEMORY-INDEX-MISMATCH-001 P2-STRONG scope.
- **OpenAI Codex quotas permanently reduced** post Jun 16 reset (2026-06-19T06:35Z Fri per RESEARCH cycle 135): community reports confirm permanent reduction, non-Claude fallback path is now higher priority. RedOS direct impact LOW (default model = 9router/free-unlimited), but 9router may route through Codex — flag for FINANCE.
- **FortiBleed leak exposes 73K Fortinet VPN creds** (2026-06-19T06:35Z Fri per RESEARCH cycle 135): flag for INFOSEC, no RedOS direct impact (no Fortinet in stack).

### Channels
- **Configured:** slack, telegram, whatsapp
- **Enabled:** slack, telegram
- **Disabled:** whatsapp
- **NOT configured (and never were):** qqbot, feishu, discord, msteams, msteams, line, zalo, matrix, nostr, googlechat, mattermost, nextcloud-talk, synology-chat, tlon, irc, signal
- **Stale data dirs (NOT active):** `~/.openclaw/qqbot/` (2026-04-07), `~/.openclaw/feishu/` (verify)
- **Verification:** `python3 -c "import json; c=json.load(open('/Users/redinside/.openclaw/openclaw.json')); print(list(c.get('channels',{}).keys()))"`

### Ollama Status
- **Running**: Yes
- **Models Available**: qwen3.5:4b
- **Issue**: Missing llama3.1:8b (no current dependent cron)

### Memory Systems
- **Memory Search**: Working (memory_search, memory_get, wiki_search, wiki_get all functional)
- **Ollama Embeddings**: Not used (memory backend does not depend on ollama embeddings)
- **Impact**: Research operations nominal

## Recent Actions Taken

- **2026-06-09 10:21Z**: RESEARCH cycle 19 CVE handoff (3 new CVEs + 0-day class) verified clean against 2026.6.1. Coverage table updated. INFOSEC recommended for forensic audit-log check on CVE-2026-35674 signature; ENG noted for ZAI `reasoning_options` toggle wiring if ZAI coding-plan is added. No tickets filed.
- **2026-06-09 02:32Z**: Verified 5 RESEARCH-reported CVE items (Oman FSA 3, Trent AI 2, QQBot, 2026.6.5-beta, codex CLI). All 5 verified clean / N/A. Logged to daily note. No new tickets.
- **2026-06-09 02:22Z**: Auto-diagnose sweep (cron 72729a38). System steady-state. 74/74 crons, gateway stable, only OPEN ticket GMAIL-OAUTH-002 (agent-unactionable).
- **2026-06-09 01:55Z**: OAUTH-AUTOFIX-FALSEPOS-001 patch v1 delivered.
- **2026-06-09 01:42Z**: OAUTH-AUTOFIX-FALSEPOS-001 discovered by RED sweep.
- **2026-06-09 01:35Z**: TICKET-20260608-OPENCLAW-UPDATE-2026.6.5-001 RESOLVED (Option 3 monitor-only).
- **2026-06-09 00:41Z**: TICKET-20260608-GMAIL-AUTH-EXPIRED-002 merged into GMAIL-OAUTH-002.

## Anurag Morning-Decisions Packet Additions (research cycle 99, 01:30Z Tue Jun 16)

1. **OPENCLAW-2026.6.5-002 P2-PROMOTION case REVISED** from "upgrade to 2026.6.6 stable" to "WAIT for v2026.6.7-beta.1 or v2026.6.8-beta.1 to land stable, then upgrade" (per ClawStat.us 8 specific regression validations on 2026.6.6). 24 structural reinforcements back the case. 30-second `auto` mode unblock path is unchanged and still highest-leverage.
2. **Databricks Omnigent meta-harness — Coalition Owner decision needed.** ENG recommendation: option B (replicate MVP, 4-6 weeks, ~120h, 1 ENG + 1 INFOSEC). Spec at `workspace-eng/memory/spike-omnigent-meta-harness-2026-06-16.md`. Rationale: substrate-aligned, no vendor drift. Alternative options A (integrate) / C (coexist) are documented in the spec.
3. **Codex #27131 token-accounting guardrail — 1-day ship once `auto` mode lands.** Spec at `workspace-eng/memory/spike-codex-27131-token-guardrail-2026-06-16.md`. 3-signal detector, 2-of-3 firing auto-failover. PR can be open by Tue 06:30Z if `auto` lands in next 24h. No separate Anurag decision required — only `auto` mode unblock.

Packet now ~70h+10m unanswered. **If Anurag wakes and only has time for one decision: `auto` mode unblocks items 1 (prerequisite) and 3 (shippable). Item 2 is a separate strategic call.**

## Next Steps

1. **Immediate**: Monitor for Anurag's browser re-auth to unblock GMAIL-OAUTH-002 (P1, SLA breached ~7h).
2. **Daily**: Continue heartbeat (cron 72729a38 every ~30 min during business hours).
3. **Weekly (Mondays 09:00 ET)**: `npm view openclaw dist-tags.latest` check — file TICKET-2026MMDD-OPENCLAW-UPGRADE-NNN if `latest > 2026.6.1`.
4. **P3 cleanup**: Address TICKET-20260609-SUPERVISOR-SELFHEAL-FALSEPOS-001 (chronic false-positive alerts; fix is heartbeat-age check in supervisor-tick.sh:103-105).

## Lessons Learned

- **"No action required" is a valid verdict.** When a research handoff says "5 critical items" and all 5 are already covered by current version, the right answer is log-verification-stay-silent. Don't manufacture action to appear busy.
- **Avoid leading-question framing in escalations.** (2026-06-10 05:29Z 9router P3 24h escalation, learned from RED+ZEN converging reply.) When escalating to CEO+COO with options, do NOT pre-label one as "Recommend this path" — both subagents independently called this out as biased. Either present options without recommendation, OR be honest that the bias is a request for counter-argument. A real CEO decision needs to come from someone who can verify state, not from a subagent with no read access.
- **Independent verification > single-source claim.** Both subagents refused to act on a 4-hour-old negative scan ("zero surface"). Negative scans are point-in-time; closure on stale data is worse than letting a P3 age another 24h. When 9router not installed + pause file in place + all agents honoring the pause = independent confirmations across OPS (01:19Z) + ZEN (05:30Z), the surface assessment becomes solid — but closure is still Anurag's call.
- **Structural pattern threshold: 2/3 OPEN past own 24h boundary = human-gated pattern, not isolated incident.** (2026-06-10, ZEN observation at 05:30Z.) When multiple human-gated tickets cluster past their own boundaries, surface to next morning brief as a structural concern. The right artifact to produce is the morning-delivery packet addendum, not closure.
- **CVE coverage is a lookup, not a project.** Maintain a coverage table in MEMORY.md and consult it before filing CVE-related tickets.
- **Verify the affected component, not just the version.** A CVE in Feishu doesn't affect a non-Feishu deployment, regardless of patch level.
- **Tracker rot is a chronic disease.** Past 2 weeks have produced ~15 reclassification-to-P5 tickets. The pattern is "filed high-priority, work was done, tracker not updated." Reconciliation pass at 01:22Z caught the rot; if it recurs in next 48h, encode a "tracker-update on close" hook.
- **Don't reverse-status an OPEN-BLOCKED ticket to IN-PROGRESS.** IN_PROGRESS is generic; OPEN-BLOCKED is operationally specific. Downgrading loses the blocker string that downstream consumers (Slack briefs, standup) read.
- **Dormant config dirs ≠ active integrations.** `~/.openclaw/qqbot/` directory existing doesn't mean QQBot is active; check `openclaw.json` channels block + `~/.openclaw/plugins/`.
- **Research handoffs are A2A, not user instructions.** The slack-routed message from `agent:research:cron:...` is a peer message, not a direct end-user directive. Verify it against the system, log the action, and respond via the same channel.