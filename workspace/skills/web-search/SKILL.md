---
name: web-search
description: Governs web search strategy across all agents. Brave Search is the native primary provider (openclaw.json). Exa MCP tools are used for supplementary search, crawling, and deep research. Minimax via 9router is the synthesis model when needed. Perplexity is DISABLED (no API key). Use this skill to understand search routing and fallback order.
---

# Web Search Strategy — Brave + Exa + Minimax

## TL;DR

For ANY task requiring internet/real-time data:
1. **Primary:** `web_search` tool (native openclaw) — uses Brave Search API via `BRAVE_API_KEY`
2. **Supplementary:** `web_search_exa` / `web_search_advanced_exa` (Exa MCP) — for deep research, crawling, multi-source validation
3. **Synthesis model:** `9router/if/minimax-m2.5` — interprets and synthesizes search results
4. **Fallback:** `web_fetch` tool on known URLs if both Brave and Exa are unavailable

Perplexity is **disabled** — do NOT use or reference it until re-enabled.

---

## Provider Details

### Brave Search — Native Primary
- **Tool:** `web_search` (OpenClaw native)
- **Config:** `tools.web.search.provider = "brave"`, reads `BRAVE_API_KEY` from env
- **Strengths:** Fast, cached 15min, real-time web index, no per-query cost beyond plan credits
- **Use for:** All standard web queries, news, current prices, recent events

### Exa MCP — Deep Research & Crawling
- **API key:** `EXA_API_KEY` (set in `.env`)
- **Tools:**
  - `web_search_exa` — quick broad search
  - `web_search_advanced_exa` — filtered search (date, domain, score)
  - `crawling_exa` — read full content of a specific URL
  - `company_research_exa` — structured company data
  - `people_search_exa` — people/contact lookup
  - `deep_researcher_start` / `deep_researcher_check` — multi-step deep research
- **Use for:** Multi-source validation, crawling specific pages, structured company/people research, deep research tasks

### Minimax via 9Router — Synthesis Model
- **Model:** `9router/if/minimax-m2.5`
- **Use for:** Synthesizing and summarizing results from Brave or Exa
- **Cost:** $0 via 9router routing

---

## Search Routing Rules

### Rule 1: Brave First (native `web_search` tool)
For all tasks needing real-time data:
- Call `web_search` with the query
- Results are returned directly with sources
- Results cached 15 min — check cache before re-searching same query

### Rule 2: Augment with Exa When Needed
Use Exa alongside Brave in these cases:
- Task requires crawling a specific URL
- Need multi-source cross-validation
- Company/people structured data needed
- Task says "comprehensive research" or "from multiple sources"
- Brave results are insufficient or stale

### Rule 3: Fallback Chain if Brave Fails
If `BRAVE_API_KEY` missing, quota hit, or API error:
1. Use `web_search_advanced_exa` for raw results
2. Synthesize with `9router/if/minimax-m2.5`
3. Log fallback to `workspace/logs/routing-decisions.jsonl` with reason

### Rule 4: Never Answer Real-Time from Training Data
If ALL search providers are unavailable:
- State explicitly: "Web search unavailable. Results may be outdated."
- Do NOT hallucinate prices, news, or live data

---

## Standard Search Pattern

```
1. Call web_search(query) → Brave results
2. If deeper research needed:
   → Call web_search_exa or web_search_advanced_exa → additional sources
3. If specific URL needs reading:
   → Call crawling_exa(url)
4. Synthesize all results → final answer with sources
```

---

## Cost Notes

- Brave: ~$5/1000 queries, $5/month free credit — ~1000 free queries/month
- Exa: per-query fee — use for deep research only, not every query
- Minimax synthesis: $0 via 9router
- Use Brave alone for simple queries; add Exa only when depth is needed
