# Runbook: Perplexity web_search 401 (Cloudflare/openresty challenge)

**Ticket:** TICKET-20260224-096

## Symptoms
- `web_search(...)` fails with HTTP **401** and response body is **HTML** (often `openresty` / Cloudflare “Authorization Required” / challenge page).
- Breaks any cron/agent flows that depend on `functions.web_search`.

## Likely causes (ordered)
1) **Bad/expired Perplexity API key** (rotated, revoked, wrong env var).
2) **Request is hitting a Cloudflare edge intended for browsers** (wrong base URL / endpoint).
3) **Network egress identity changed** (IP reputation / proxy) causing CF challenge.
4) **Perplexity account policy change / billing issue**.

## Immediate triage checklist (10 min)
1) **Confirm current key is present and non-empty** in OpenClaw config/env.
   - Where to look: `openclaw.json` env vars or gateway env (depends on deployment).
2) **Confirm the endpoint** the tool hits is the Perplexity API endpoint (not web UI). If OpenClaw has a configurable base URL, verify it’s set to the API hostname.
3) **Reproduce once** with a minimal query (`test`) and capture:
   - status code
   - response headers (esp. `server`, `cf-ray`, `content-type`)
   - first ~200 chars of body (should be JSON; if HTML, it’s a CF block)
4) **Rotate key (if available)** and retry.

## Fix paths
### Path A — key was invalid/expired
- Update the Perplexity API key in the secure store/config.
- Restart gateway if it doesn’t hot-reload env.
- Re-test `web_search("test")`.

### Path B — endpoint / base URL misconfigured
- Ensure base URL points to Perplexity **API** host.
- Re-test.

### Path C — Cloudflare challenge despite valid key
- Verify no proxy/Tailscale exit-node is forcing “browser-like” egress behavior.
- If there is a proxy, attempt direct egress (temporarily) and re-test.
- If still blocked, open a support request with Perplexity including `cf-ray`.

## Workaround (keep system functional)
- Temporarily re-route web-search-heavy tasks to:
  - **Browser automation** (if allowed) OR
  - An alternate provider/search integration.
- Note: keep this as a controlled fallback; do not silently substitute if routing policy forbids.

## Closure criteria
- `web_search("test")` returns 200 with JSON payload.
- A second query returns valid citations.
- New failures do **not** show HTML bodies.
