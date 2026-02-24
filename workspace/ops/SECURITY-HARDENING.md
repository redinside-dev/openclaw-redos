# Security Hardening (MVP)

## Outbound URL allowlist

- Config: `workspace/config/security/outbound-url-allowlist.json`
- Default: **deny**

Policy:
- Before using `web_fetch`, check the allowlist.
- If a URL/domain is not allowlisted, **do not fetch** without explicit human approval.
- When you need a new domain, open a ticket with:
  - domain
  - why it’s needed
  - expected data
  - risk assessment

## MCP server allowlist + pinning

- Config: `workspace/config/security/mcp-server-allowlist.json`

Guidelines:
- Prefer **local-only** MCP servers.
- For any remote MCP server:
  - require explicit approval
  - pin host/port
  - pin the server artifact version (hash) if possible
  - document what tools/capabilities it exposes

## High-risk tool approval gates

See `workspace/SOUL.md` for the approval-request template and tool gating rules.
