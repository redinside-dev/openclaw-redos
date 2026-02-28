# Skill: n8n-webhooks

**Credential-isolated external API calls via n8n webhooks.**

Agents never hold API secrets. External integrations (GitHub, Notion, Airtable,
Stripe, etc.) live in n8n. Agents call webhook URLs — credentials stay in n8n.

---

## n8n endpoint

- Dashboard: http://127.0.0.1:5678 (local only)
- Base URL for webhooks: `http://127.0.0.1:5678/webhook/`
- Managed by: OPS (restart via launchctl if down)

## How agents call webhooks

```
exec: curl -s -X POST http://127.0.0.1:5678/webhook/<workflow-id> \
  -H "Content-Type: application/json" \
  -d '{"action": "<action>", "payload": <json>}'
```

Always use `--max-time 15` to avoid hanging on slow workflows.

## Available workflows (OPS maintains this list)

| Workflow ID | Purpose | Input | Output |
|-------------|---------|-------|--------|
| (none yet — add as configured in n8n) | | | |

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
