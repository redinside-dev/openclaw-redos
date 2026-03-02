# Skill: event-driven-patterns

**How to classify jobs as event-driven vs batch vs health-check, and how to register webhooks.**

This skill was created as part of the 2026-03 event-driven architecture migration that reduced cron jobs from 110 → 40 active.

---

## The 3 Buckets

Every recurring job belongs to one of three categories:

### 1. Event-Driven (→ n8n webhook)

**Characteristics:**
- Triggered by an external event (GitHub push, Slack message, email arrival, price threshold)
- Currently polling: "check if X happened" every N minutes
- Has an obvious webhook equivalent

**Examples:**
- GitHub PR monitor → GitHub webhook `pull_request` event
- Slack message handler → Slack Events API `message` event
- Market data trigger → Webhook from data provider
- Email inbound → IMAP/Webhook

**Migration path:**
1. Disable the polling cron
2. Register n8n as the webhook receiver for the event source
3. Create n8n workflow: receive event → call gateway `/api/chat`
4. Test end-to-end with a real event

**Rule:** If the event has a webhook API available, use it. Never poll when webhooks exist.

### 2. True Batch (keep as schedule)

**Characteristics:**
- Runs at a fixed time regardless of external events
- Aggregates/compiles/summarizes work done by other jobs
- Examples: morning standup (8am), weekly report (Monday), nightly reindex (2am)

**Keep as cron if:**
- Fixed time is business-meaningful (pre-market at 8:45am, Friday retro at 4pm)
- It aggregates data accumulated since last run
- Latency doesn't matter (weekly earnings analysis can wait 7 days)

**Current true-batch jobs (kept):**
- Daily Portfolio Review (8:45am ET)
- Trading Window Briefs (market hours)
- Earnings Tracker (Monday)
- OPS Scrum Master Standup compilation
- Nightly Eval (2am)
- Nightly Memory Sync (1:30am)
- Weekly reports (CI, market, earnings)
- Content Factory (weekly)

### 3. Health Checks (keep minimal, every 2-30min)

**Characteristics:**
- System availability checks (is Ollama running? is gateway up?)
- Must run frequently to catch outages fast
- Very cheap: simple HTTP pings, no LLM calls

**Keep as cron if:**
- Failure detection latency matters (you want to know in <5min)
- The check itself is trivial (ping, curl)

**Health check jobs (kept):**
- `telegram-approval-monitor` (every 2min) — Telegram polling
- `system-pulse-always-on` (every 5min) — Ollama heartbeat
- `9router-keepfresh` (every 4min) — Token refresh
- `9router-auth-watchdog` (every 30min) — Auth expiry monitoring
- `model-health-check` (every 30min) — Ollama + 9Router ping
- `cbffd7e1` Cron Watchdog (every 10min) — Missed job detection

---

## Classification Flowchart

```
Is this job triggered by an external event (GitHub, Slack, email, price)?
├── YES → Does the event source offer a webhook?
│         ├── YES → Migrate to n8n inbound webhook → DISABLE cron
│         └── NO → Can we reduce polling to every 4h+ ?
│                   ├── YES → Reduce schedule, keep cron
│                   └── NO → Keep as cron (no alternative)
└── NO → Is it a system health check (ping, availability)?
          ├── YES → Does it need <5min detection latency?
          │         ├── YES → Keep as health-check cron (every 2-30min)
          │         └── NO → Merge into model-health-check cron
          └── NO → Does it run at a specific business time?
                    ├── YES → Keep as true-batch cron
                    └── NO → Is it "check for work / dispatch tasks"?
                              ├── YES → Replace with autonomous-task-dispatcher
                              └── NO → Document and disable
```

---

## Webhook Registration Procedure

### Step 1: Identify the event source

| Event | Source API | Webhook type |
|-------|-----------|-------------|
| GitHub push/PR/issue | GitHub Webhooks | `application/json` POST |
| Slack message | Slack Events API | URL verification + events |
| Gmail inbound | Gmail Push via Google Pub/Sub | HTTP POST |
| Market data | Provider-specific | Usually REST webhook |

### Step 2: Create n8n workflow

1. Open `http://127.0.0.1:5678`
2. Create new workflow
3. Add **Webhook** trigger node (for inbound events) or **Schedule** trigger (for time-based)
4. Set path (e.g., `github-events`) — this becomes `http://127.0.0.1:5678/webhook/github-events`
5. Add processing nodes (filter, transform)
6. Add **HTTP Request** node → POST to `http://localhost:19000/api/chat`:
   ```json
   {
     "agentId": "eng",
     "message": "GitHub PR #{{$json.number}} opened: {{$json.pull_request.title}}. Review for code quality."
   }
   ```
7. Activate the workflow

### Step 3: Expose n8n to internet (for external webhooks)

**Option A: Cloudflare Tunnel (preferred — stable named URL)**
```bash
cloudflared tunnel run openclaw-webhook
# Creates: https://openclaw-webhook.cfargotunnel.com
```

**Option B: ngrok (dev/testing — URL changes on restart)**
```bash
ngrok http 5678
# Creates: https://<random>.ngrok.io
```

### Step 4: Register at event source

**GitHub:**
- Repository → Settings → Webhooks → Add webhook
- Payload URL: `https://<tunnel>/webhook/github-events`
- Content type: `application/json`
- Events: Pushes, Pull requests, Issues, Comments
- Secret: Store in n8n credential store (not in agents/skills)

**Slack:**
- App settings → Event Subscriptions → Enable
- Request URL: `https://<tunnel>/webhook/slack-inbound-router`
- Subscribe to: `message.channels`, `app_mention`

### Step 5: Test end-to-end

```bash
# Simulate GitHub push
curl -s -X POST https://<tunnel>/webhook/github-events \
  -H "Content-Type: application/json" \
  -d '{"ref":"refs/heads/main","repository":{"full_name":"anuragg-saxenaa/test"}}'

# Watch gateway logs
tail -f ~/.openclaw/logs/gateway.log | grep "github"
```

### Step 6: Document

1. Add row to `workspace/skills/n8n-webhooks/SKILL.md → Available workflows`
2. Disable the polling cron that this replaces
3. Update `workspace/ops/LEARNINGS.md` with the migration record
4. Update `workspace/MEMORY.md` if it's a significant architectural change

---

## Autonomous Task Dispatcher Pattern

Instead of 8 inner loops (one per agent, every 2-4h), we use ONE dispatcher (every 15min) that:

1. Reads `workspace/AUTONOMOUS.md` for pending tasks
2. Checks agent availability (last seen, current focus from `workspace/STATE.yaml`)
3. Dispatches 1-2 tasks to available agents via A2A
4. Logs dispatches to `workspace/logs/dispatch.jsonl`

**Benefits:**
- 8 crons → 1 cron (87% reduction for inner loop category)
- Coordinator has full visibility across all agents
- Prevents "thundering herd" when all agents wake up simultaneously
- Easier to debug (single dispatch log)

**Dispatcher is cron:** `autonomous-task-dispatcher-0001` (every 15min, main agent)

---

## What We Eliminated and Why

| Category | Jobs removed | Reason |
|----------|-------------|--------|
| Inner loops (per-agent) | 8 | Consolidated into single autonomous-task-dispatcher |
| Meta self-checks (per-agent) | 8 | Consolidated into autonomous-task-dispatcher |
| Individual standup check-ins | 6 | OPS Scrum Master compiles from agent-status files |
| Session anchors (per-agent) | 4 | Consolidated into session-warmup-consolidated |
| Duplicate health monitors | 4 | Consolidated into model-health-check |
| Context health checks (per-agent) | 6 | Consolidated into model-health-check |
| Provider quota syncs (duplicates) | 3 | 9router-auth-watchdog already covers this |
| Polling A2A crons | 5 | Consolidated into autonomous-task-dispatcher |
| Digest writers (every 2h) | 2 | Event-driven via error-escalation webhook |
| GitHub/Gmail polling | 2 | Replaced by n8n inbound webhooks |
| Other duplicates/disabled | 13 | Various consolidations |
| **Total eliminated** | **71** | **108 enabled → 40 enabled** |

---

## Maintenance

**Adding a new job:**
1. Classify it: event-driven / true-batch / health-check?
2. If event-driven: follow webhook registration procedure above
3. If true-batch: add to cron/jobs.json with meaningful schedule
4. If health-check: add to or extend model-health-check payload

**Reviewing job count (run monthly):**
```bash
python3 -c "import json; d=json.load(open('/Users/redinside/.openclaw/cron/jobs.json')); jobs=d['jobs']; enabled=[j for j in jobs if j.get('enabled',True)]; print(f'Total: {len(jobs)}, Enabled: {len(enabled)}, Disabled: {len(jobs)-len(enabled)}')"
```

**Target: ≤30 active cron jobs at all times.**
If count exceeds 40 enabled, audit and consolidate before adding new ones.
