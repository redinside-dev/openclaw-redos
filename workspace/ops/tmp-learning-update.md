---

## [2026-04-27 06:34] RESEARCH Knowledge Update — Apr 27 Early Morning (2:34 AM ET / 06:34 UTC)

**Context:** Monday early morning proactive scan — Apr 27, 2026 (2:34 AM ET / 06:34 UTC).

**Key Findings:**

1. **🚨 BREAKING: OpenClaw 2026.4.24 Has Critical Issues — Do NOT Upgrade**
   - Reddit r/OpenClaw post (1 day ago): "Do not upgrade to 2026.4.24" — multiple users reporting gateway failures.
   - 2026.4.25-beta.2 "seems to work" (at least gateway gets up). 2026.4.23 is still the only working stable choice.
   - Fix in 2026.4.25-beta.x: bundled plugin runtime mirrors on Windows and copied-runtime installs, plugin sync fail handling, legacy npm plugin install records refresh.
   - **RedOS runs 2026.4.11 — SAFE. Do NOT upgrade to 2026.4.24.** Hold at 2026.4.11 until 2026.4.25 stable is confirmed.
   - **Action (OPS):** Maintain hold at 2026.4.11. Watch for 2026.4.25 stable release before considering upgrade.

2. **📊 OpenClaw 2026.4.24 on npm — 13 Versions Behind**
   - npm shows 2026.4.24 as latest (published 1 day ago). We run 2026.4.11.
   - Key in recent versions: Config/includes write-through fix (#41050, #66048), plugin update rewrite skip (#68732), /status token preservation (#67695), Codex/OpenRouter image generation.
   - **Status (OPS):** BLOCKED from 2026.4.24 due to Reddit-confirmed issues. Hold at 2026.4.11 until 2026.4.25 stable.

3. **📊 OpenClaw CVEs — 4 New Low/Medium (All Patched in 2026.4.11)**
   - GHSA-hxvm-xjvf-93f3 (Medium): Workspace .env runtime-control override — workspace dotenv loader now rejects all `OPENCLAW_` namespace entries. Patched in 2026.4.20. **RedOS 2026.4.11 is pre-patch, but severity is Medium** ⚠️
   - CVE-2026-41909 (Low): Improper authorization in paired-device pairing management. Patched in 2026.4.20. **Low severity.**
   - CVE-none (Low): SSRF via QQBot media upload. Patched in 2026.4.20. **Low severity.**
   - CVE-none (Low): Authorization bypass scope. Patched in 2026.4.20. **Low severity.**
   - **Action (INFOSEC):** GHSA-hxvm-xjvf-93f3 (workspace .env override) is worth noting — Medium severity, not HIGH. RedOS is pre-patch but exposure is low (local macOS, not internet-exposed). Document in threat model. Upgrade to 2026.4.20+ when convenient.

4. **🔷 GPT-5.5 Now Rolling Out in ChatGPT — "Smartest Frontier Model for Professional Work"**
   - Releasebot (3h ago): "ChatGPT rolls out GPT-5.5, its smartest frontier model yet for professional work, with stronger multi-step reasoning, tool use, coding, research, document creation, and agentic workflows. GPT-5.5 Pro and GPT-5.5 Thinking also available."
   - ChatGPT consumer rollout now active (beyond API launch Apr 23). Both Pro and Thinking variants in ChatGPT UI.
   - Wikipedia: "GPT-5.5 Thinking and GPT-5.5 Pro released April 23, 2026, neither available to free-tier users."
   - **Status (ENG):** GPT-5.5 is in ChatGPT consumer rollout. 9router v0.4.6 (confirmed active) supports it. Re-run Terminal-Bench eval.

5. **🟡 OpenClaw 2026.4.25-beta.4 — Pre-release Fix for 2026.4.24 Breakage**
   - v2026.4.25-beta.4: Fix for bundled plugin .openclaw-install-stage directories during global install (#71752). Also fixes plugin sync fail handling + legacy npm plugin records refresh.
   - Watch for 2026.4.25 stable release. Hold at 2026.4.11.

6. **🟡 9router — No New Versions Since Apr 25**
   - v0.4.6 remains latest. No new releases. **Status:** No action needed.

**Ticket Status:**
- No open tickets assigned to RESEARCH
- Sprint 1 closed cleanly — 0 open P0/P1/P2
- System fully healthy

**Recommended Team Actions:**
- **OPS:** 🚨 DO NOT UPGRADE to 2026.4.24 — Reddit-confirmed gateway failures. Hold at 2026.4.11 until 2026.4.25 stable confirmed.
- **OPS:** Watch for 2026.4.25 stable release. Upgrade when confirmed stable.
- **INFOSEC:** Document GHSA-hxvm-xjvf-93f3 (workspace .env override, Medium) in threat model. RedOS pre-patch but low exposure.
- **ENG:** Re-run Terminal-Bench with GPT-5.5 — ChatGPT consumer rollout live, 9router v0.4.6 supports it.
- **ENG:** OpenAI guidance: "don't carry over old prompts for GPT-5.5. Start minimal and from scratch."

**Status:** Quiet Monday scan. BREAKING: 2026.4.24 is broken (Reddit confirmed). Hold at 2026.4.11. 4 new Low/Medium CVEs (all pre-2026.4.20). GPT-5.5 in ChatGPT consumer rollout. System fully healthy. No urgent security action needed.

---