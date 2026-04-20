---
name: exa-mcp
description: Connect OpenClaw to the Exa MCP server for internet search and research tools (web_search_exa, web_search_advanced_exa, crawling_exa, company_research_exa, people_search_exa, deep research). Use when you want to enable Exa-powered web search via MCP inside OpenClaw, troubleshoot Exa MCP connectivity, or re-register the Exa MCP tool list.
---

# Exa MCP (Internet Search) for OpenClaw

This skill documents how to wire **Exa MCP** into OpenClaw so the agent can use Exa tools for internet search.

MCP endpoint (with tools):

```
https://mcp.exa.ai/mcp?tools=web_search_exa,web_search_advanced_exa,get_code_context_exa,crawling_exa,company_research_exa,people_search_exa,deep_researcher_start,deep_researcher_check
```

## Prereqs

1) **Exa API key** available to the MCP client/runtime (recommended env var: `EXA_API_KEY`).
2) An MCP client/tool-server runtime installed in OpenClaw.

OpenClaw references a core skill/runtime called **mcporter** for “external skill backends / tool servers”. If `mcporter` is not installed, install it first via OpenClaw app (Settings → Skills) or via the official OpenClaw method.

## Setup workflow (high level)

1) Install/enable `mcporter`.
2) Ensure `EXA_API_KEY` is set for the runtime that will launch/connect to MCP.
3) Register the Exa MCP URL above with `mcporter`.
4) Restart OpenClaw gateway if needed for the new tools to be discoverable.

## Verification

After wiring is complete, verify by running a minimal search through the new tool(s):

- `web_search_exa`: quick search results
- `web_search_advanced_exa`: richer search
- `crawling_exa`: fetch + extract page content

## Troubleshooting

- 401/403: EXA_API_KEY missing/invalid.
- Tools not appearing: gateway restart required or tool server not registered.
- Timeouts: network/DNS; verify `curl -I https://mcp.exa.ai/mcp` works.

## Notes

This skill is documentation + helper scripts. It does **not** by itself add new OpenClaw tools; it assumes OpenClaw is configured to connect to MCP via `mcporter`.
