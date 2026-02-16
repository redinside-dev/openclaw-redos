---
name: mcp-context7
description: Connect OpenClaw to the Context7 MCP server for up-to-date library documentation lookup. Use when agents need current docs for any library/framework (React, Next.js, Tailwind, etc.) to avoid hallucinating outdated APIs. Context7 resolves library IDs and fetches relevant, version-specific documentation on demand.
---

# MCP Context7 — Live Documentation Lookup

This skill connects OpenClaw agents to the **Context7 MCP** server, giving them access to up-to-date documentation for any library or framework.

## Purpose

LLMs often hallucinate outdated or incorrect API signatures. Context7 solves this by providing real-time, version-specific documentation snippets on demand via MCP tools.

## MCP Endpoint

```
https://mcp.context7.com/mcp
```

## Available Tools

| Tool | Description |
|------|-------------|
| `resolve-library-id` | Converts a library name (e.g. "react", "nextjs") into a Context7-compatible library ID |
| `get-library-docs` | Fetches relevant documentation for a resolved library ID, with optional topic filter |

## Configuration

### API Key

The Context7 API key is stored in `.env` as `CONTEXT7_API_KEY`.

**Never hardcode the key.** It is loaded at runtime via `dotenv/config` alongside other API keys.

```env
# In .env
CONTEXT7_API_KEY=your_context7_api_key_here
```

### Registration with mcporter

Register the Context7 MCP endpoint with the OpenClaw MCP auto-discovery system:

```json
{
  "name": "context7",
  "url": "https://mcp.context7.com/mcp",
  "auth": {
    "type": "bearer",
    "envVar": "CONTEXT7_API_KEY"
  },
  "tools": ["resolve-library-id", "get-library-docs"]
}
```

## Usage Flow

1. Agent receives a coding task involving a library (e.g. "Build a Next.js app with shadcn/ui")
2. Agent calls `resolve-library-id` with query `"nextjs"` → gets library ID
3. Agent calls `get-library-docs` with the library ID and topic `"app router"` → gets current docs
4. Agent uses the real documentation to write correct, up-to-date code

## When to Use

- **Code generation** — Always look up current API signatures before writing code
- **Debugging** — Check if the API has changed in the latest version
- **Migration** — Compare docs between versions
- **Any library/framework** — React, Vue, Angular, Svelte, Tailwind, Prisma, Drizzle, etc.

## Verification

After setup, verify by running:

```
resolve-library-id("tailwindcss")
→ Should return a valid library ID

get-library-docs(libraryId, topic="flex layout")
→ Should return current Tailwind CSS documentation
```

## Troubleshooting

- **401/403**: `CONTEXT7_API_KEY` missing or invalid in `.env`
- **Tools not appearing**: Gateway restart required, or MCP server not registered with mcporter
- **Empty results**: Library name may need to be more specific (e.g. "react" not "reactjs")
- **Timeouts**: Check network connectivity to `https://mcp.context7.com`

## Notes

- Context7 is a read-only documentation service — it does not modify code or state
- Results are cached per-session to minimize API calls
- The skill works with all agents but is most useful for `eng` (Engineering) and `research` (Deep Research)
