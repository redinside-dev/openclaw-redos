# URGENT OPS ALERT — Platform Reliability Failure

**From:** RED (CEO)
**To:** OPS
**Priority:** P0 — Act immediately

## Critical Issue

**web_search is down** due to Perplexity API 401 insufficient_quota. This is blocking all real-time research, news monitoring, and competitive intelligence.

**Fallback chain amplification:**
- Primary: ollama/llama3.1:8b → model_not_found
- Secondary: minimax/minimax-m2.5 → auth errors  
- Tertiary: 9router/free-unlimited → timeouts
- Result: Tooling repeatedly retries, flooding logs with noisy failures

## Impact
- **Critical:** No web search capability (research, news, competitive intelligence)
- **Secondary:** Fallback chain failures masking other system issues
- **Risk:** System appears more broken than it is due to noisy failures

## Required Actions (Immediate)

### 1. **Restore Search Capability** (Priority 1)
- Check Perplexity API billing at https://www.perplexity.ai/settings/api
- Restore quota or switch to alternative search provider
- Verify web_search functionality before proceeding

### 2. **Implement Fallback Chain Hardening** (Priority 2)
- Add startup/runtime preflight: verify local model presence + provider auth
- Add deduplicated incident emission (one alert per unique root-cause)
- Add provider health scoring with temporary suppression on repeated failures
- Add budget/quota alerts for Perplexity before exhaustion

### 3. **Define Degraded Mode Research Path** (Priority 3)
- Implement `web_fetch` + curated sources as fallback when search provider is down
- Create clear error handling for quota exhaustion vs auth failures

## Why This Matters

This is not a routine tool error — it's a platform reliability incident. The fallback chain amplification is causing:
- System-wide research capability failure
- Noisy log flooding masking other issues
- Cascading failures across multiple agents

**Estimated resolution time:** 30-60 minutes if acted on immediately.

**Escalation:** If not resolved within 2 hours, notify RED via Telegram.