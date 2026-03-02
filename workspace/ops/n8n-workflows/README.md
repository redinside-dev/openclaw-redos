# n8n Workflow Reference — RedOS

**Status:** All 8 workflows active and verified as of 2026-03-02.
**Instance:** `http://127.0.0.1:5678`
**API key:** `workspace/config/n8n-api-key.txt`

---

## Active Workflows

| Workflow | ID | Trigger | Purpose |
|----------|-----|---------|---------|
| `echo-test` | `SWmkldgx4OypuhOn` | Agent POST | Health check — returns input |
| `slack-post` | `zIoMz7Ug5oVeZz5T` | Agent POST | Post `{channel, text}` → Slack |
| `github-repo-status` | `g7fy6gWny65rhStr` | Agent POST | Fetch latest commits `{repo: "owner/name"}` |
| `github-events` | `RS3wjcMCSrUeaRlR` | GitHub webhook | push/PR/issue → dispatch agent |
| `slack-inbound-router` | `EInxQVFsBEAcNKS1` | Slack Events API | Route Slack messages → agents |
| `cost-alert-escalation` | `GyjnDmZn38ZJVpN7` | Gateway cost monitor | Budget breach → escalate to OPS |
| `error-escalation` | `NdKRqbHyxP7j9ihZ` | Gateway error handler | Critical error → escalate |
| `daily-standup` | `C0gFamBjnzPGH8Y3` | Schedule 8am ET M–F | Dispatch standup check-ins to 6 agents |

---

## Webhook URLs

| Path | Full URL |
|------|----------|
| Echo test | `http://127.0.0.1:5678/webhook/echo-test` |
| Slack post | `http://127.0.0.1:5678/webhook/slack-post` |
| GitHub repo status | `http://127.0.0.1:5678/webhook/github-repo-status` |
| GitHub events | via Cloudflare tunnel (see `workspace/config/tunnel-url.txt`) |
| Slack inbound | via Cloudflare tunnel |
| Cost alert | `http://127.0.0.1:5678/webhook/cost-alert-escalation` |
| Error escalation | `http://127.0.0.1:5678/webhook/error-escalation` |

---

## Cloudflare Tunnel (GitHub + Slack inbound)

The `github-events` and `slack-inbound-router` webhooks require a public URL.

**Auto-managed:** launchd `ai.openclaw.tunnel-sync` updates the GitHub webhook on every boot.
- Current tunnel URL: `cat ~/.openclaw/workspace/config/tunnel-url.txt`
- GitHub webhook ID: `cat ~/.openclaw/workspace/config/github-webhook-id.txt` (598611413)
- PAT stored in: `workspace/config/github-webhook-pat.txt` (gitignored)

**Manual check:**
```bash
bash ~/.openclaw/scripts/tunnel-url.sh
```

---

## Agent→Gateway Dispatch Pattern

When dispatching to the gateway from n8n httpRequest nodes:

```json
{
  "method": "POST",
  "url": "http://127.0.0.1:19000/api/chat",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {"name": "Content-Type", "value": "application/json"},
      {"name": "x-source", "value": "n8n-<workflow-name>"}
    ]
  },
  "sendBody": true,
  "contentType": "json",
  "specifyBody": "json",
  "jsonBody": "={{ JSON.stringify({ agentId: $json.agentId, message: $json.message }) }}"
}
```

**Critical rules:**
- Always use `http://127.0.0.1:19000` — never `localhost` (macOS resolves to IPv6 ::1)
- Always specify `"method": "POST"` — n8n defaults to GET without it
- For `contentType: "json"`, always use `specifyBody: "json"` + `jsonBody` — not top-level `body`

See `workspace/ops/LEARNINGS.md` LEARNING-20260302-004 for full debug history.

---

## Quick Tests

```bash
# Echo test
curl -s -X POST http://127.0.0.1:5678/webhook/echo-test \
  -H "Content-Type: application/json" -d '{"hello":"world"}'

# Slack post
curl -s -X POST http://127.0.0.1:5678/webhook/slack-post \
  -H "Content-Type: application/json" \
  -d '{"channel":"C0AEV3J2L23","text":"Test from n8n"}'

# Cost alert escalation
curl -s -X POST http://127.0.0.1:5678/webhook/cost-alert-escalation \
  -H "Content-Type: application/json" \
  -d '{"current_usd":1.70,"limit_usd":2.00,"pct":85,"triggered_by":"test"}'

# Error escalation
curl -s -X POST http://127.0.0.1:5678/webhook/error-escalation \
  -H "Content-Type: application/json" \
  -d '{"error_type":"gateway_timeout","agent":"eng","count":6,"log_snippet":"TimeoutError..."}'
```

---

## Re-importing Workflows

If a workflow needs to be recreated from the JSON files in this directory:
1. Open `http://127.0.0.1:5678`
2. Click **Workflows** → **Import from file**
3. Select the JSON file
4. **Critical:** Ensure each webhook trigger node has `"webhookId": "<uuid>"` — without it, n8n registers broken composite paths
5. Activate the workflow

See `workspace/ops/LEARNINGS.md` LEARNING-20260302-001 for the webhookId requirement.

**Last updated:** 2026-03-02
