# llm-gateway-proxy — SPEC.md

## Overview
A universal LLM proxy server that sits between your applications and any LLM provider. Provides model fallback chains, unified API surface, cost tracking, and request/response logging.

## Problem
Developers building with multiple LLM providers face:
- Different API schemas per provider (OpenAI vs Anthropic vs Google)
- No built-in fallback when a provider is down or rate-limited
- No unified cost visibility
- Hard to swap providers without code changes

## Solution
A lightweight Node.js proxy that exposes a single OpenAI-compatible API while routing to any configured backend.

## Features
- **Unified API** — OpenAI-compatible `/v1/chat/completions` endpoint
- **Model fallback chains** — e.g. `gpt-4o → claude-3-5-sonnet → gemini-1.5-pro`
- **Cost tracking** — log tokens + cost per request to SQLite
- **Request/response logging** — JSONL log for debugging
- **Rate limit handling** — auto-retry with exponential backoff
- **Health checks** — `/health` and `/providers` status endpoints
- **Config-driven** — `gateway.yaml` defines providers, models, fallbacks

## Tech Stack
- Node.js + Express
- SQLite (cost log)
- YAML config (js-yaml)
- MIT license

## MVP Scope
1. Proxy for OpenAI and Anthropic
2. Model fallback on 429/500 errors
3. Cost log to SQLite
4. JSONL request log
5. Docker support

## API
```
POST /v1/chat/completions   — OpenAI-compatible
GET  /health                — Server health
GET  /providers             — Provider status
GET  /costs                 — Cost summary
```

## Ready: Yes
