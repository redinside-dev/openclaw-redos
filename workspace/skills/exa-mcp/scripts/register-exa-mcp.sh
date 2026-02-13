#!/usr/bin/env bash
set -euo pipefail

EXA_MCP_URL="https://mcp.exa.ai/mcp?tools=web_search_exa,web_search_advanced_exa,get_code_context_exa,crawling_exa,company_research_exa,people_search_exa,deep_researcher_start,deep_researcher_check"

if ! command -v mcporter >/dev/null 2>&1; then
  echo "mcporter not found on PATH. Install/enable the 'mcporter' runtime in OpenClaw first."
  exit 1
fi

if [[ -z "${EXA_API_KEY:-}" ]]; then
  echo "EXA_API_KEY is not set. Export it before running:"
  echo "  export EXA_API_KEY='...'
"
  exit 1
fi

echo "Registering Exa MCP server: $EXA_MCP_URL"

echo "NOTE: mcporter CLI subcommands vary by version. Run: mcporter --help"

echo "If your mcporter supports an 'add' or 'register' command, use it with the URL above."
