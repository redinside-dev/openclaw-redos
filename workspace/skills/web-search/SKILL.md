---
name: web-search
description: Governs web search strategy across all agents. Perplexity sonar-pro is the primary model for any query requiring real-time or internet data. Exa MCP tools (web_search_exa, web_search_advanced_exa, crawling_exa) are used as supplementary search to cross-validate and deepen results. Use this skill to understand search routing, fallback order, and how to combine Perplexity + Exa for best results.
---

# Web Search Strategy — Perplexity + Exa

## TL;DR

For ANY task that requires internet/real-time data:
1. **Primary model:** `perplexity/sonar-pro` — answers the query with built-in real-time search
2. **Supplementary tools:** `web_search_exa` or `web_search_advanced_exa` (Exa MCP) — additional search for cross-validation, deeper sources, or crawling specific pages
3. **If Perplexity is unavailable:** use Exa MCP tools alone with any available model interpreting the results

Never answer real-time questions from training data alone. Always search.

---

## Provider Details

### Perplexity (sonar-pro) — Primary
- **Role:** Primary answering model with built-in real-time web search
- **API key:** `PERPLEXITY_API_KEY` (configured in `.env` and `openclaw.json`)
- **Strengths:** High-quality synthesis, citations, real-time news, current prices/events
- **Use for:** Primary answer generation on any `needs_web` task
- **Config:** `tools.web.search.provider = "perplexity"`, model = `sonar-pro`

### Exa MCP — Supplementary Search Tools
- **Role:** Supplementary search, crawling specific pages, finding exact sources
- **API key:** `EXA_API_KEY` (must be set in `.env` and loaded at runtime)
- **Tools available:**
  - `web_search_exa` — quick broad web search
  - `web_search_advanced_exa` — filtered/ranked search with more control
  - `crawling_exa` — fetch and extract full page content from a URL
  - `company_research_exa` — structured company data
  - `people_search_exa` — people/contact lookup
  - `deep_researcher_start` / `deep_researcher_check` — multi-step deep research
- **Use for:** Cross-validating Perplexity results, crawling specific articles/pages, when Perplexity is rate-limited

---

## Search Routing Rules

### Rule 1: Perplexity First
For all `needs_web` tasks (detected by HATAKE or explicitly stated by user):
- Use `perplexity/sonar-pro` as the answering model
- It will automatically search the web and synthesize results with citations

### Rule 2: Augment with Exa When Needed
Use Exa MCP tools alongside Perplexity in these cases:
- User asks for multiple independent sources to cross-validate facts
- Task requires crawling a specific URL the user referenced
- Company or people research where structured data is needed
- Perplexity answer needs deeper source verification
- Task explicitly requires "comprehensive research" or "from multiple sources"

### Rule 3: Fallback If Perplexity Unavailable
If `PERPLEXITY_API_KEY` missing, API down, or rate-limited:
1. Use Exa MCP tools (`web_search_advanced_exa`) for raw search results
2. Pass results to the best available model for synthesis (gpt-5.2 or sonar if available)
3. Log fallback to `workspace/logs/routing-decisions.jsonl` with reason

### Rule 4: Never Answer Real-Time from Training Data
If a question clearly requires current/live data and BOTH Perplexity and Exa are unavailable:
- Say explicitly: "I cannot access real-time data right now. My training data may be outdated."
- Do NOT hallucinate current prices, news, or live stats

---

## Standard Combined Search Pattern

When executing a web research task, the recommended pattern is:

```
1. Call perplexity/sonar-pro → get synthesized answer with citations
2. If citations are needed or facts need verification:
   → Call web_search_exa or web_search_advanced_exa → get additional source list
3. If a specific page needs to be read in full:
   → Call crawling_exa with the URL
4. Combine all results into final answer with sources
```

---

## When to Use Which Exa Tool

| Exa Tool | Use Case |
|---|---|
| `web_search_exa` | Quick search for any topic — general purpose |
| `web_search_advanced_exa` | Filtered search: date range, domain, score threshold |
| `crawling_exa` | Read full content of a specific URL |
| `company_research_exa` | Structured data on a company (funding, employees, etc.) |
| `people_search_exa` | Finding information about a specific person |
| `deep_researcher_start` | Begin multi-step deep research on complex topic |
| `deep_researcher_check` | Poll status of a deep research job |

---

## Exa MCP Setup (if not working)

1. Ensure `EXA_API_KEY` is set in `.env`
2. Exa MCP endpoint: `https://mcp.exa.ai/mcp?tools=web_search_exa,web_search_advanced_exa,crawling_exa,company_research_exa,people_search_exa,deep_researcher_start,deep_researcher_check`
3. Register via `mcporter` (see `exa-mcp` skill for setup details)
4. Restart gateway after registration

---

## Cost & Budget Notes

- Perplexity sonar-pro: subscription — $0 per call (included in plan)
- Exa MCP: charged per search call (small per-query fee) — use judiciously
- For simple queries: Perplexity alone is sufficient (no Exa call needed)
- For deep research: combine both for best coverage
