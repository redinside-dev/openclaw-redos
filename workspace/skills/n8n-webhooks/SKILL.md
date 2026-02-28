# Skill: n8n-webhooks

**Credential-isolated external API calls via n8n webhooks.**

Agents never hold API secrets. External integrations (GitHub, Notion, Airtable,
Stripe, etc.) live in n8n. Agents call webhook URLs — credentials stay in n8n.

---

## n8n endpoint

- Dashboard: http://127.0.0.1:5678 (local only)
- Base URL for webhooks: `http://127.0.0.1:5678/webhook/`
- Managed by: OPS (restart via launchctl if down)

## n8n auth

- API key: stored at `workspace/config/n8n-api-key.txt` (agents read this for management calls)
- Dashboard login: `anuragg.saxenaa@gmail.com` / RedOS2026!
- Public API: `http://127.0.0.1:5678/api/v1/` with header `X-N8N-API-KEY: <key>`

## How agents call webhooks

```
exec: curl -s --max-time 15 -X POST http://127.0.0.1:5678/webhook/<path> \
  -H "Content-Type: application/json" \
  -d '<json payload>'
```

Always log the call to `workspace/logs/audit.jsonl` after execution.

## Available workflows

| Path | n8n ID | Purpose | Input | Output |
|------|--------|---------|-------|--------|
| `echo-test` | `SWmkldgx4OypuhOn` | Test — echoes back payload | `{any}` | webhook data + body |
| `slack-post` | `zIoMz7Ug5oVeZz5T` | Post message to Slack channel | `{channel: "C...", text: "..."}` | `{ok: true, ts: "..."}` |
| `github-repo-status` | `g7fy6gWny65rhStr` | Fetch latest 3 commits from a GitHub repo | `{repo: "owner/name"}` | array of commit objects |

## Usage examples

```bash
# Echo test
curl -s --max-time 15 -X POST http://127.0.0.1:5678/webhook/echo-test \
  -H "Content-Type: application/json" -d '{"agent":"ops","check":"alive"}'

# Post to Slack #redos-mission-control
curl -s --max-time 15 -X POST http://127.0.0.1:5678/webhook/slack-post \
  -H "Content-Type: application/json" \
  -d '{"channel":"C0AEV3MDEDD","text":"⚙️ *OPS*: message via n8n relay"}'

# GitHub repo status
curl -s --max-time 15 -X POST http://127.0.0.1:5678/webhook/github-repo-status \
  -H "Content-Type: application/json" \
  -d '{"repo":"anuragg-saxenaa/spring-boot-product-api"}'
```

## Adding a new workflow

1. Open n8n dashboard: http://127.0.0.1:5678
2. Create workflow with a Webhook trigger node
3. Add credential nodes (GitHub, Slack, etc.) — credentials NEVER leave n8n
4. Activate the workflow
5. Copy the webhook URL path (after `/webhook/`)
6. Add a row to the Available workflows table above
7. Test: `curl -s http://127.0.0.1:5678/webhook/<id> -d '{}'`

## OPS self-healing for n8n

If n8n is down (curl returns connection refused):
```
exec: launchctl stop ai.openclaw.n8n && launchctl start ai.openclaw.n8n
```
Wait 10s, retry. If still down: Telegram alert to 1012034994.

## Security rules

- n8n runs on 127.0.0.1 only — never exposed to internet
- Agents pass only data payloads to webhooks — never credentials
- n8n workflows are the only place external API keys are stored
- All webhook calls logged to workspace/logs/audit.jsonl by the calling agent:
  `{"ts":"<ISO>","agent":"<id>","tool":"n8n_webhook","workflow":"<id>","action":"<action>"}`
