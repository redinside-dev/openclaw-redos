# n8n Integration Strategy — 5-Day Autonomous Run Enhancement

**Created:** 2026-03-01 23:06 UTC  
**Context:** 5-day autonomous run active. Need to offload work from 108 OpenClaw cron jobs to n8n workflows.

---

## Current State

**n8n Status:**
- Running on localhost:5678
- Process: `/opt/homebrew/bin/node /opt/homebrew/lib/node_modules/n8n/bin/n8n start`
- Integrations available: GitHub, Slack
- API requires: X-N8N-API-KEY header (need to locate key)

**OpenClaw Cron Load:**
- 108 active cron jobs
- ~82% success rate (20+ jobs failing)
- Heavy polling patterns (every 2-5 min for monitoring)
- Resource intensive (context loading, model calls for simple checks)

---

## Integration Architecture (Proposed)

### Pattern 1: Webhook-Triggered Workflows
**Use Case:** External events trigger OpenClaw agents

```
GitHub PR created → n8n webhook → POST to OpenClaw agent API → Agent responds
Slack mention → n8n webhook → Route to appropriate agent → Agent acts
```

**Benefit:** Zero polling, instant response, no cron overhead

### Pattern 2: n8n Polling → OpenClaw Notification
**Use Case:** n8n monitors external services, notifies agents only on change

```
n8n polls GitHub (every 5min) → Detects new issue → 
  POST to OpenClaw /api/sessions/send → Agent receives task
```

**Benefit:** Offload polling from agents, agents only wake when needed

### Pattern 3: Agent-Triggered Workflows
**Use Case:** Agents delegate long-running tasks to n8n

```
Agent needs data → POST to n8n webhook → n8n executes workflow → 
  Results posted back to agent via OpenClaw API
```

**Benefit:** Agents don't block on slow external APIs

---

## Cron Jobs to Migrate to n8n (Priority Order)

### High Priority (Migrate First)

1. **GitHub Repo Updates** (cron: 2ef34ad2-e703-415d-8ad9-08a5acdfa1ca)
   - Current: Polls GitHub API every 3 hours via agent
   - n8n: GitHub webhook → instant notification → agent receives summary
   - Savings: 8 cron runs/day → 0, instant response

2. **Gmail Unread Summary** (cron: 7d1f3378-1f52-48ee-a2d9-9c4aaf8f5c88)
   - Current: Polls Gmail every 15min during work hours
   - n8n: Gmail webhook → new email → filter → notify agent
   - Savings: 32 cron runs/day → 0

3. **System Health Watch** (cron: c8481b2a-45c9-47bf-9161-8e72fa387098)
   - Current: Agent checks gateway/browser/cron every 30min
   - n8n: HTTP health checks → only alert on failure
   - Savings: 48 cron runs/day → ~2 alerts/day

4. **9Router Quota Sync** (cron: 9router-quota-sync-0001)
   - Current: Agent curls 9router API every 2 hours
   - n8n: Poll 9router → cache result → serve to agents on demand
   - Savings: 12 cron runs/day → 0 agent overhead

5. **Cron Watchdog** (cron: cbffd7e1-8647-441e-af8c-33362e455f89)
   - Current: Agent checks cron status every 10min
   - n8n: Monitor cron state → alert only on failures
   - Savings: 144 cron runs/day → ~5 alerts/day

### Medium Priority

6. **Trading Window Brief** (multiple finance crons)
   - n8n: Market data aggregation → single summary → agent formats
   
7. **Slack Message Monitoring** (A2A communication checks)
   - n8n: Slack webhook → route to agents → no polling needed

---

## Implementation Plan (During 5-Day Run)

### Phase 1: Setup (Hours 0-2)
- [ ] Locate n8n API key
- [ ] Create n8n → OpenClaw webhook endpoint
- [ ] Test: n8n workflow → POST to agent → verify response

### Phase 2: Migrate Top 3 (Hours 2-12)
- [ ] GitHub webhook workflow (replace cron 2ef34ad2)
- [ ] Gmail webhook workflow (replace cron 7d1f3378)
- [ ] System health monitor (replace cron c8481b2a)
- [ ] Disable corresponding OpenClaw crons
- [ ] Monitor: verify agents receive notifications

### Phase 3: Optimize (Hours 12-48)
- [ ] Migrate remaining high-priority crons
- [ ] Add error handling: n8n workflow fails → fallback to cron
- [ ] Add metrics: n8n workflow execution time vs cron

### Phase 4: Scale (Hours 48-120)
- [ ] Create n8n workflow templates for common patterns
- [ ] Document: How agents trigger n8n workflows
- [ ] Measure: Cron load reduction, agent response time improvement

---

## Success Metrics

**Target by End of 5-Day Run:**
- Cron jobs reduced: 108 → 80 (28 migrated to n8n)
- Cron success rate: 82% → 95%+ (fewer jobs = less failure surface)
- Agent response time: Faster (no polling overhead)
- Resource usage: Lower (n8n handles polling, agents only wake on events)

---

## Next Actions

1. **RESEARCH** - Deliver n8n integration patterns brief (in progress)
2. **OPS** - Locate n8n API key, test API access
3. **ENG** - Create OpenClaw webhook endpoint for n8n callbacks
4. **RED** - Approve migration of top 3 cron jobs to n8n

---

## Status: RESEARCH IN PROGRESS

Waiting for RESEARCH brief on n8n best practices before proceeding with implementation.
