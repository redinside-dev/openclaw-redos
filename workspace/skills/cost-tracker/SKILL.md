# Cost Tracker Skill

## Purpose
Track every API call's cost, monitor budgets, detect waste, auto-switch profiles.

## Event Logging

After EVERY model call, append to `workspace/logs/cost-events.jsonl`:
```json
{
  "ts": "ISO-8601",
  "agent": "eng",
  "task_id": "T-002",
  "project_id": "PROJ-20260211-001",
  "model": "claude-code/sonnet-4.5",
  "provider": "anthropic",
  "tier": 5,
  "billing_type": "subscription|subscription_9router|payg|free",
  "tokens": {"input": 2340, "output": 1856, "total": 4196},
  "cost_usd": 0.00,
  "latency_ms": 3420,
  "success": true,
  "was_retry": false,
  "retry_level": null
}
```

For 9Router sessions, use extended fields:
```json
{
  "billing_type": "subscription_9router",
  "provider": "9router",
  "9router_actual_provider": "gemini|codex|iflow|qwen",
  "cost_usd": 0.00
}
```

## Cost Rules

### Subscription Models (cost = $0 per call)
- openai-codex/gpt-5.2 (all 3 sessions)
- claude-code/sonnet-4.5
- cursor/pro (Cursor Pro subscription via CCS CLIProxy)
- 9router/auto (all providers within 9Router): $0 per call
  - Gemini OAuth (free tier, ~1000/day)
  - Codex (ChatGPT Plus subscription)
  - iFlow / Qwen / Kiro (genuinely free, no account)
- perplexity/sonar, sonar-pro, sonar-reasoning (within Pro plan)
- ollama/* (always free)

### Pay-As-You-Go Models
- zai/glm-4.7: $0.0008 per 1K input, $0.0012 per 1K output
- zai/glm-4.7-flashx: $0.0004 per 1K input, $0.0006 per 1K output
- moonshot/kimi-k2.5: $0.0015 per 1K input, $0.0025 per 1K output
- perplexity API overages: $0.001-0.005 per 1K tokens (beyond Pro plan limits)

## Budget Checks

### Hourly Check (runs every hour, silent)
1. Read today's cost-events.jsonl
2. Sum cost_usd where billing_type == "payg"
3. Compare against daily limit (from config/budget-guardrails.json)
4. Actions:
   - < 70%: do nothing
   - 70-89%: log warning to audit.jsonl
   - 90-99%: switch routing profile to "cost_saver", alert RED via a2a
   - ≥ 100%: pause payg models, subscription models continue, alert owner via Telegram

### Daily Report (9 PM ET via cron)
Generate and send to Telegram:
```
📊 Daily Cost Report — {date}

Fixed: $460.00/mo (subscriptions, pre-paid)
Variable today: ${x.xx} / $2.00 daily limit

  Z.AI:     ${x.xxx} ({n} calls)
  Moonshot:  ${x.xxx} ({n} calls)
  Pplx API:  ${x.xxx} ({n} calls beyond Pro)

Subscriptions used today:
  Codex Pro#1 (RED):    {n} calls
  Codex Pro#2 (ZEN):    {n} calls
  Codex Plus (shared):  {n} calls
  Claude Code (ENG):    {n} sessions
  Cursor Pro (CCS):     {n} sessions
  9Router sessions:     {n} calls
    → Providers used: {gemini: n, codex: n, iflow: n, qwen: n}
    → Subscription quota saved: ~{estimated_tokens} tokens
  Perplexity Pro:       {n} searches
  Ollama (local):       {n} calls, uptime {pct}%

Waste: {count} issue(s) detected
{list}

MTD variable: ${x.xx} / $30.00
```

Save to workspace/status/cost-{YYYY-MM-DD}.md

## Waste Detection

Flag these patterns:
1. **Subscription available, payg used:** A subscription model could handle the task but a payg model was used instead
2. **Overkill:** Tier 4/5 model used for simple/basic complexity task
3. **Wrong Perplexity tier:** sonar-reasoning used for a simple lookup (should be sonar)
4. **Ollama bypass:** Ollama was up but Z.AI was used anyway
5. **Excessive retries:** Same task retried 3+ times = possible prompt issue
