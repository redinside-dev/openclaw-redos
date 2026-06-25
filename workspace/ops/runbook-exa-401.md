# Runbook: web_search 401 (provider-agnostic)

> **Provider history (read this first):** This runbook was originally authored on 2026-02-24 when the `web_search` tool was backed by **Perplexity** (ticket TICKET-20260224-096). On **2026-06-08** the active provider migrated to **exa** (see TICKET-20260228-018 closure). The symptom-response is the same (401 = re-auth, body is HTML/cloudflare challenge), but the **auth surface is now exa, not Perplexity.** Treat any "Perplexity" reference below as historical context; the live triage path is the exa one.

**Original ticket:** TICKET-20260224-096 (Perplexity era)
**Current ticket reference:** TICKET-20260228-018 (exa era; closed 2026-06-08 smoke test green)

## Symptoms
- `web_search(...)` fails with HTTP **401** and response body is **HTML** (often `openresty` / Cloudflare "Authorization Required" / challenge page).
- Breaks any cron/agent flows that depend on `functions.web_search`.

## Likely causes (ordered)
1) **Bad/expired exa API key** (rotated, revoked, wrong env var). — was Perplexity key pre-2026-06-08.
2) **Request is hitting a Cloudflare edge intended for browsers** (wrong base URL / endpoint, or missing Accept headers — exa requires `Accept: application/json, text/event-stream`).
3) **Network egress identity changed** (IP reputation / proxy) causing CF challenge.
4) **exa account policy change / billing issue** (replaces Perplexity account check pre-2026-06-08).

## Immediate triage checklist (10 min)
1) **Confirm current key is present and non-empty** in OpenClaw config/env.
   - Where to look: `openclaw.json` env vars or gateway env (depends on deployment). For exa, check `mcp.exa.ai` config and `x-api-key` header.
2) **Confirm the endpoint** the tool hits is the exa MCP endpoint, not the exa web UI. If OpenClaw has a configurable base URL, verify it's set to `mcp.exa.ai/mcp` (streamable-http transport).
3) **Reproduce once** with a minimal query (`test`) and capture:
   - status code
   - response headers (esp. `server`, `cf-ray`, `content-type`)
   - first ~200 chars of body (should be JSON; if HTML, it's a CF block)
4) **Rotate key (if available)** and retry. The exa key is the `x-api-key` header on the MCP transport.

## Fix paths
### Path A — key was invalid/expired
- Update the exa API key in the secure store/config (`openclaw.json` mcp section or env).
- Restart gateway if it doesn't hot-reload env.
- Re-test `web_search("test")`.

### Path B — endpoint / base URL misconfigured
- Ensure base URL points to **exa MCP** host (`mcp.exa.ai/mcp`), not exa.com or the Perplexity API.
- For MCP transport, send the proper `Accept: application/json, text/event-stream` headers.
- Re-test.

### Path C — Cloudflare challenge despite valid key
- Verify no proxy/Tailscale exit-node is forcing "browser-like" egress behavior.
- If there is a proxy, attempt direct egress (temporarily) and re-test.
- If still blocked, open a support request with exa including `cf-ray`.

## Workaround (keep system functional)
- Temporarily re-route web-search-heavy tasks to:
  - **Browser automation** (if allowed) OR
  - An alternate provider/search integration. Pre-2026-06-08, Perplexity was a fallback; post-2026-06-08, fallbacks are `exa__web_fetch_exa` (raw content) and the built-in `web_fetch` (markdown extractor).
- Note: keep this as a controlled fallback; do not silently substitute if routing policy forbids.

## Closure criteria
- `web_search("test")` returns 200 with JSON payload.
- A second query returns valid citations.
- New failures do **not** show HTML bodies.

## Re-open triggers
- Symptom returns 3+ times in 24h after a key rotation.
- Provider migrates again (re-run the provider-agnostic steps above; update this runbook with the new provider name).
