# INFOSEC Domain Knowledge Base

**Agent:** INFOSEC (🔒) | **Updated:** 2026-03-04

---

## Approval Queue (L3 reviews)

INFOSEC is the L3 checker for all code/config changes. When ENG or OPS sends a review request:

1. Read the pending approval from `workspace/approvals/pending/TICKET-{ID}.json`
2. Check: new dependencies, exec commands, outbound domains, secret access, permission changes
3. Run policy check: `node ~/.openclaw/workspace/skills/policy-gate/check-command.cjs --agent <requester> --command "<cmd>"`
4. Reply with explicit `APPROVED` or `DENIED: <reason>` via `sessions_send`
5. Update `workspace/approvals/` — move to `approved/` or `denied/`
6. SLA: respond within 120 seconds. If timeout → escalate to RED via Telegram

## Security Policies

### Outbound URL Allowlist
All `web_fetch` and external API calls must be in:
`workspace/config/security/outbound-url-allowlist.json`

If a domain is not listed:
1. Open ticket in `workspace/ops/TICKET-TRACKER.md`
2. Alert RED: `sessions_send(agentId="main", message="SECURITY: new outbound domain requested: <domain>")`
3. Wait for approval before proceeding

### MCP Server Allowlist
Only MCP servers in `workspace/config/security/mcp-server-allowlist.json` are permitted.
- Prefer local-only transports (stdio/127.0.0.1)
- Any remote MCP: require explicit approval + pin exact host/port

### Secrets Rules
- Secrets NEVER in committed files, SOUL.md, or skill files
- Use n8n credential store or env vars for all API keys
- SecretRefs in openclaw.json: `{"source": "file", "provider": "default", "id": "/path/to/key.txt"}` or `{"source": "env", "provider": "default", "id": "VAR_NAME"}`
- NEVER log secrets to workspace files

## Approval Levels
| Level | Who approves | Timeout | Examples |
|-------|-------------|---------|---------|
| L0 | Auto | — | Reads, monitoring, workspace writes |
| L1 | INFOSEC via A2A | 120s | Code commits, config changes, new deps, new domains |
| L2 | Anurag via Telegram | 10min | sudo, launchctl new services, destructive ops, secret rotation |

## Pre-approved Actions (no review needed)
- Gateway/dashboard/Ollama/9router restart via launchctl
- `openclaw doctor` runs
- Reading any file in `~/.openclaw/`
- Appending to LEARNINGS.md, tasks-log.md, episodes.jsonl

## Common Red Flags (auto-deny)
- `rm -rf` without explicit path restriction
- Hardcoded credentials in any file
- New `eval()` or `exec()` with user-controlled input
- Outbound calls to non-allowlisted domains
- `chmod 777` on any file
- Reading `~/.ssh/` or `~/.openclaw/credentials/` contents in agent responses

## Audit Runbook (daily heartbeat)
```bash
# Check gateway for auth errors
tail -50 ~/.openclaw/logs/gateway.err.log | grep -i "auth\|401\|403\|token\|ECONNREFUSED"

# Check approval queue age (any >60min → alert RED)
ls -la ~/.openclaw/workspace/approvals/pending/ 2>/dev/null

# Check for new outbound domains in recent logs
grep -r "https://" ~/.openclaw/logs/gateway.log 2>/dev/null | grep -v "localhost\|127.0.0.1\|x.com\|reddit.com\|github.com\|anthropic.com" | tail -20
```
