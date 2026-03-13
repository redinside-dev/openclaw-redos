## [2026-03-13 07:18] Platform Reliability — Search & Fallback Chain Failure

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