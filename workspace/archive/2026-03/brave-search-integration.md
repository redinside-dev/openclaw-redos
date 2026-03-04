# Brave Search API Integration Spike (AUTO-025)

Status: Proposed for implementation week of 2026-03-09
Owner: ENG
Last updated: 2026-03-02

## Objective

Evaluate Brave Search API as a resilient fallback provider for `web_search` when Perplexity is unavailable (401/429/outage) and Exa-only synthesis is insufficient.

## Current search stack (today)

1. Primary: Perplexity (`web_search` tool)
2. Secondary: Exa MCP tools (`web_search_exa`, `web_search_advanced_exa`, `crawling_exa`)

Observed issue: recurring Perplexity auth failures (401) cause blocked research workflows.

## Brave API capability summary

Brave Web Search endpoint supports the key features needed for fallback:

- Endpoint: `GET https://api.search.brave.com/res/v1/web/search`
- Auth header: `X-Subscription-Token: <token>`
- Core query params:
  - `q` query string
  - `count` (max 20)
  - `offset` (pagination)
  - `freshness` (`pd`, `pw`, `pm`, `py`, date range)
  - `country`, `search_lang`, `ui_lang`
  - `safesearch`
  - `extra_snippets`
- Response includes pagination signal (`query.more_results_available`) for bounded paging.

Potentially useful advanced features (optional in phase 2):
- Rich callback data (weather/stocks/sports) via callback key flow
- Local enrichments (POI flow)

## Validation spike results (2026-03-02)

Environment checks:
- No Brave key found in env (`NO_BRAVE_ENV_KEYS`).

Connectivity/auth behavior checks:

1) No token request:
```bash
curl -i "https://api.search.brave.com/res/v1/web/search?q=openclaw&count=3"
```
Result: HTTP 422 validation error (`x-subscription-token` required).

2) Invalid token request:
```bash
curl -i "https://api.search.brave.com/res/v1/web/search?q=openclaw&count=1" \
  -H "X-Subscription-Token: test_token"
```
Result: HTTP 422 `SUBSCRIPTION_TOKEN_INVALID`.

Conclusion: endpoint is reachable and returns deterministic auth errors; integration can proceed once valid credentials are provisioned.

## Integration plan (week of 2026-03-09)

### Phase 1: Provider plumbing

1. Add config entries:
   - `tools.web.search.provider_fallbacks` include `brave`
   - `tools.web.search.brave.endpoint` default to Brave endpoint
   - `tools.web.search.brave.timeoutMs` (e.g., 10000)

2. Add secret wiring:
   - env var: `BRAVE_SEARCH_API_KEY`
   - pass as `X-Subscription-Token`
   - never log raw token

3. Implement adapter function:
   - file suggestion: `workspace/scripts/search_brave.py` or existing search provider module
   - normalize response into existing `web_search` return shape used by callers

### Phase 2: Routing and fallback policy

Recommended runtime order:
1. Perplexity primary
2. Brave fallback
3. Exa fallback (with synthesis model)

Fallback triggers:
- Perplexity 401/403/429/5xx
- Perplexity timeout

Guardrails:
- bounded retries (max 1 retry per provider)
- provider hop on auth/rate-limit classes
- stop after 3 provider attempts total

### Phase 3: Observability

Log routing decision per query to `workspace/logs/routing-decisions.jsonl`:
- provider tried
- status code/error class
- latency
- fallback reason
- final provider used

Add counters to health snapshot:
- Perplexity failure count
- Brave success/failure count
- fallback conversion rate

### Phase 4: Tests

Minimum test set:
- unit: header injection + param mapping + error mapping
- integration (mock):
  - 401/429 from Perplexity triggers Brave
  - Brave success returns normalized result
  - Brave auth failure falls through to Exa
- regression: no token leak in logs

## Risks and mitigations

- Risk: Brave quota limits or billing surprises
  - Mitigation: enforce per-run request cap and add usage telemetry.

- Risk: schema mismatch vs existing `web_search` output
  - Mitigation: strict normalization layer and fixture-based tests.

- Risk: token leakage
  - Mitigation: redact auth headers and centralize secret handling.

## Delivery criteria

- `web_search` succeeds via Brave when Perplexity fails.
- All failures are visible in routing logs.
- No secrets appear in logs.
- Research workflows no longer hard-block on Perplexity 401 alone.
