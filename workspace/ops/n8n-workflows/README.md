# n8n Workflow Files — Import Guide

These JSON files are importable into the n8n dashboard. They define the event-driven workflows that replace polling cron jobs.

## How to Import

1. Open n8n dashboard: http://127.0.0.1:5678
2. Click **Workflows** in the left sidebar
3. Click **Import from file**
4. Select the JSON file from this directory
5. Review and **Activate** the workflow

## Workflows

| File | Webhook Path | Type | Replaces |
|------|-------------|------|---------|
| `github-events.json` | `/webhook/github-events` | Inbound webhook | GitHub polling cron (4x/day) |
| `slack-inbound-router.json` | `/webhook/slack-inbound-router` | Inbound webhook | Slack polling crons |
| `cost-alert-escalation.json` | `/webhook/cost-alert-escalation` | Called by cost-monitor | budget-guardrails thresholds |
| `error-escalation.json` | `/webhook/error-escalation` | Called by gateway | error-digest-writer cron |
| `daily-standup.json` | Schedule (8am ET) | Schedule trigger | 6 sa-*-checkin crons |

## Setup After Import

### github-events + slack-inbound-router (Inbound webhooks)

These require a public URL. Options:

**Option A: Cloudflare Tunnel (recommended — stable URL)**
```bash
# Setup (one-time)
bash ~/.openclaw/scripts/start-webhook-tunnel.sh

# Then register webhook at GitHub:
# https://github.com/<your-repo>/settings/webhooks
# Payload URL: https://openclaw-webhooks.cfargotunnel.com/webhook/github-events
# Content type: application/json
# Events: Pushes, Pull requests, Issues

# Register at Slack:
# https://api.slack.com/apps/<app-id>/event-subscriptions
# Request URL: https://openclaw-webhooks.cfargotunnel.com/webhook/slack-inbound-router
# Subscribe to: message.channels, app_mention
```

**Option B: ngrok (dev/testing — URL changes on restart)**
```bash
ngrok http 5678
# Use the ngrok URL as the webhook URL in GitHub/Slack
```

### cost-alert-escalation + error-escalation (Called by agents)

These don't need a public URL — they're called locally:
```bash
# Test cost alert
curl -s -X POST http://127.0.0.1:5678/webhook/cost-alert-escalation \
  -H "Content-Type: application/json" \
  -d '{"current_usd":1.70,"limit_usd":2.00,"pct":85,"triggered_by":"test"}'

# Test error escalation
curl -s -X POST http://127.0.0.1:5678/webhook/error-escalation \
  -H "Content-Type: application/json" \
  -d '{"error_type":"gateway_timeout","agent":"eng","count":6,"log_snippet":"TimeoutError..."}'
```

### daily-standup (Schedule trigger)

- No external registration needed
- Just import + activate
- Configure n8n timezone to America/Toronto in n8n settings
- Runs automatically at 8am ET weekdays
