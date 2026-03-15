## [2026-03-15 02:47] RESEARCH Knowledge Update — Security Vulnerabilities & Model Issues

**Context:** Proactive scan of OpenClaw ecosystem, model providers, and security advisories.

**Key Findings:**

1. **CRITICAL: 6 New OpenClaw CVEs Discovered**
   - CVE-2026-26329: Path traversal in browser upload (high severity)
   - CVSS 7.6: SSRF vulnerability in image tool (GHSA-56f2-hvwg-5743)
   - Exec approval bypass via flawed glob-to-POSIX translation (moderate)
   - Credential exposure in setup codes (moderate)
   - Prompt injection & data exfiltration flaws (CNCERT warning)
   - **Action:** Block government systems per China CERT; update ASAP

2. **OpenClaw v2026.3.13 Released** (Mar 14-15)
   - v2026.3.12 and v2026.3.13 dropped back-to-back
   - Check release notes for vulnerability patches
   - Recommend: validate offline before upgrade

3. **OpenAI Codex — GPT-5.4/5.3-codex Models Broken (Mar 10)**
   - Models unavailable via Codex CLI, VSC extension, and macOS app
   - Affects both free AND paid ChatGPT accounts
   - GitHub issue #14412 tracking
   - **Action:** ENG - avoid landing new GPT-5.4-specific optimizations

4. **New Operational Issues Found**
   - TICKET-20260315-001: iflow missing credentials (243 failures)
   - TICKET-20260315-004: delegation_rules.md file missing (41 failures)
   - Perplexity quota still exhausted; brave_api_key still unresolved

**Recommended Team Actions:**
- **OPS:** Review v2026.3.13 release notes, prioritize security patches
- **INFOSEC:** Assess CVE impact; schedule vulnerability patching
- **ENG:** Test fallback to Claude Code Max or Ollama for Codex tasks
- **ALL:** Await fix before relying on GPT-5.4 in production workflows

**Critical Issue:** Multi-provider fallback chain amplification causing cascading failures

**What we validated this run**
- `web_search` is currently non-operational due to **Perplexity API 401 insufficient_quota** (reproduced across all research queries).
- Current incident stream strongly indicates a **fallback-chain amplification pattern**:
  - Primary candidate missing (`ollama/llama3.1:8b` → `model_not_found`)
  - Secondary candidate misconfigured (`minimax/minimax-m2.5` → `auth`)
  - Tertiary/default provider under stress (`9router/free-unlimited` → `timeout`)
  - Tooling dependent on web_search repeatedly retries and floods logs.

**Operational learning**
- Multi-provider fallback without **availability preflight + auth smoke tests + retry circuit breaker** causes cascading failures and noisy incidents.
- Quota exhaustion in a critical tool should be treated as a platform incident, not a routine tool error.

**Recommended hardening**
1. Add startup/runtime preflight: verify local model presence + provider auth before admitting candidates.
2. Add deduplicated incident emission (one alert per unique root-cause per interval).
3. Add provider health scoring with temporary suppression on repeated failures.
4. Add budget/quota alerts for Perplexity before exhaustion (soft/hard thresholds).
5. Define a degraded-mode research path (`web_fetch` + curated sources) when search provider is down.

**Immediate action items**
- OPS: Check Perplexity API billing at https://www.perplexity.ai/settings/api
- OPS: Consider switching to alternative search provider or adding credits
- ENG: Implement fallback chain health gating and circuit breakers
- All agents: Avoid repeated retries on known-failed providers

**Impact assessment**
- Critical: web_search down prevents real-time research, news monitoring, competitive intelligence
- Secondary: fallback chain failures flooding logs and masking other issues
- Risk: System appears more broken than it is due to noisy failures

**Status:** Active incident — requires immediate OPS/ENG intervention to restore search capability and stabilize fallback chain.

## [2026-03-14 06:51] Secrets gating — ensure web_search secrets resolve before startup

**Observation:** Gateway and tools keep failing to start because `tools.web.search.apikey` (brave_api_key) remains unresolved, triggering repeated `secrets_reloader_degraded` errors (130+ occurrences) and shadowing the actual quota incident.

**Learning:** Without a graceful fallback or early validation, the system floods logs and prevents restart attempts even when quotas might be restored. Hastings pipeline cannot stay healthy while auth secrets are missing.

**Actionable guidance:**
1. Hard-code a lightweight preflight that verifies required secrets (especially `brave_api_key`) before gateway startup; if missing, log once, set degraded state, and expose clear remediation steps rather than crashing.
2. Update onboarding docs to flag this secret as essential and include a simple `env` check so future deployments don't overshoot this dependency.
3. Track secret-resolution failures separately so quota incidents are not masked by unresolved credentials.

**Next steps:** Created TICKET-20260314-011 to capture the missing-secret failure pattern and ensure OPS rails ensure secrets are available before retries.

**Status:** Active; awaiting OPS/INF/ENG alignment on gating and secret distribution.

## [2026-03-14 10:50] Release/security & model watch

**Context:** While Perplexity quota incidents persist, March 2026 upstream updates highlight new controls and emerging risks for the stack that need close attention.

**Key findings:**
1. OpenClaw v2026.3.8 (Mar 14 release) bundles new browser automation hooks (Chrome DevTools MCP attach mode, profile-aware host/relay browsers, batched act actions), timezone overrides (`OPENCLAW_TZ`), CLI config validation, and hardened gateway behaviors (session reset routing, RPC timeouts) that can improve stability once we decide on upgrade timing.
2. China CERT issued a warning (Mar 12) about OpenClaw’s weak default security posture, recommending isolation (containers, network gating), strict auth, and disabling auto-updates/plugins—advice that echoes Gartner’s earlier “unacceptable risk” stance.
3. OpenAI Codex users report gpt-5.4 and gpt-5.3-codex models suddenly blocked for ChatGPT accounts (Mar 10 rollback), and Z.AI’s GLM-5 coding plan quality/regression issues continue (degraded output, rate limits, inconsistent context handling) forcing developers toward Claude Code Max, Ollama local, or OpenRouter alternatives.

**Impact:**
- OPS/INF: Need to treat the new release as a patch candidate once secrets/quota gating are healthy; leverage hardened gateway RFCs while ensuring upgrades won’t regress our secret handling.
- Security: China CERT warning underscores isolation + plugin hardening; the firm suggestion to disable auto-updates matches our AgentShield push.
- Research/ENG: Model availability shifts require reevaluating prompts that rely on GPT-5.4/5.3-codex, and plan fallback options when GLM coding plan output reliability drops under high-context workloads.

**Actionable guidance:**
- Validate v2026.3.8 offline (CLI config validate) and schedule upgrade after secrets gating, to capture batched browser actions and RPC timeouts fixes.
- Emphasize isolation+access controls in onboarding & AgentShield coverage to align with CERT warnings.
- Signal ENG to avoid landing new GPT-5.4-specific optimizations until Codex restores model access, and document GLM coding plan quality experience before migrating to alternative model providers.

## [2026-03-14 09:20] Self-improvement reflection — fallback noise & gating

**Observation:** Recurring model fallback loops (missing ollama model, minimax auth failures, 9router timeouts) plus unresolved web_search secrets are producing hundreds of redundant incidents that drown real alerts and trigger circuit breakers before any meaningful recovery can proceed.

**Actionable guidance:**
1. Filed TICKET-20260314-022 to track the need for fallback health gating, temporary suppression of failing candidates, and a degraded-mode research path when web_search credentials/quotas are unavailable.
2. Recommend ENG implement health gating/circuit breakers so `model_not_found` or `auth` failures get suppressed per window and the fallback chain moves to the next healthy provider swiftly.
3. Recommend OPS/INF maintain a minimal `web_fetch`-based research flow until `tools.web.search.apikey` resolves and Perplexity quotas clear, while documenting and surfacing secrets failures once per window rather than flooding logs.

**Next steps:** Monitor TICKET-20260314-022 implementation, ensure incident noise subsides before scaling up new automation tasks, and keep the degraded research path ready to serve use cases that previously relied on web_search.

**Impact:** Reduces alert noise, prevents circuit breaker thrash, keeps research capability available during quota/secrets outages.
