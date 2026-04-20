# Skill: cost-optimization

**Intelligent model routing, prompt caching, batch API, and subscription management to cut AI spend by 50%+.**

---

## 3-Tier Model Routing

All requests are automatically classified into one of three tiers. Agents can override with `"model_tier": "lightweight|standard|heavy"` in their payload.

| Tier | Model | Cost/1K input | Cost/1K output | When to use |
|------|-------|--------------|----------------|-------------|
| **Lightweight** | Claude Haiku 4.5 | $0.0008 | $0.004 | Health checks, status queries, simple summaries, short cron payloads, acks |
| **Standard** | Claude Sonnet 4.6 | $0.003 | $0.015 | Code review, research summaries, planning, analysis, writing |
| **Heavy** | Claude Opus 4.6 | $0.015 | $0.075 | Architecture decisions, L4/L5 approvals, complex reasoning, long-form |
| **Local** | Ollama qwen2.5-coder:7b | $0.00 | $0.00 | Intent parsing (HATAKE), classification, offline tasks |

**Target split: 50% Lightweight / 35% Standard / 15% Heavy → ~55% cost reduction vs all-Standard**

### How to choose your tier

```
My prompt is < 300 chars AND it's a health/status check → lightweight
My prompt is asking HATAKE to parse intent → local (automatic)
I need architecture decision / L4+ approval → heavy
Everything else → standard (default)
```

### Override syntax (in cron payload or agent message)

```json
{
  "message": "Review this PR for security issues...",
  "model_tier": "standard"
}
```

The gateway reads `model_tier` from the payload and routes accordingly. HATAKE always uses local (overrides are ignored for HATAKE).

---

## Prompt Caching (90% input token reduction)

Anthropic caches system prompts when marked with `cache_control: {type: "ephemeral"}`.

- System prompts (SOUL.md + agent identity) are ~2000 tokens per request
- Without caching: 2000 tokens × 200 requests/day = 400K tokens/day
- With caching: ~90% hit rate → only ~40K tokens/day (charged at cache read rate, which is 90% cheaper)
- **Annual savings at Standard tier: ~$600**

**Caching is implemented in `gateway/resilient-handler.js`** — enabled automatically when using an Anthropic model. No agent action needed.

Cache read tokens appear in API responses as `cache_read_input_tokens`. Check gateway logs:
```bash
grep "cache_read_input_tokens" ~/.openclaw/logs/gateway.log | tail -20
```

---

## Batch API (50% cost reduction for non-real-time jobs)

The Anthropic Batch API costs 50% less than real-time API for the same model.

**Eligible job types** (latency is not critical):
- Nightly memory sync
- Weekly reports (earnings, market intel, weekly digest)
- Daily portfolio compilation
- Content factory stage 1
- Market research
- Autonomy scorecard compilation

**How to enable for a cron job:**
```json
{
  "message": "Compile weekly earnings report...",
  "batch": true
}
```

The gateway (`server.js`) checks the `batch` flag and routes to Batch API. Results are polled every 5 minutes and written to `workspace/logs/batch-results.jsonl`.

**Do NOT use batch for:** Telegram replies, real-time alerts, L4/L5 approvals, anything user-facing.

---

## Cost Monitoring

### Real-time cost data
```bash
# Last 10 cost events
tail -10 ~/.openclaw/workspace/logs/cost-events.jsonl | python3 -m json.tool

# Today's spend by agent
python3 << 'EOF'
import json, datetime
today = datetime.date.today().isoformat()
events = [json.loads(l) for l in open('/Users/redinside/.openclaw/workspace/logs/cost-events.jsonl') if today in l]
by_agent = {}
for e in events:
    a = e.get('agent', 'unknown')
    by_agent[a] = by_agent.get(a, 0) + e.get('cost_usd', 0)
for a, c in sorted(by_agent.items(), key=lambda x: -x[1]):
    print(f'{a}: ${c:.4f}')
EOF

# Today's total
python3 -c "import json,datetime; today=datetime.date.today().isoformat(); total=sum(json.loads(l).get('cost_usd',0) for l in open('/Users/redinside/.openclaw/workspace/logs/cost-events.jsonl') if today in l); print(f'Today: \${total:.4f}')"
```

### Dashboard
- Cost charts: `http://localhost:19000` → Cost Estimator tab
- Mission Control API: `GET http://localhost:19000/api/mission-control/costs`
- Savings report: `GET http://localhost:19000/api/mission-control/savings`

### Budget guardrails
- Config: `workspace/config/budget-guardrails.json`
- Daily limit: $2.00 (target: $1.00 after optimization)
- Auto cost_saver mode at 90% ($1.80/day)
- PAYG models paused at 100% ($2.00/day)

---

## Subscription Audit Procedure

Review monthly (next due: 2026-04-01):

1. **ChatGPT Pro x2 ($400/month):**
   - Check: Is `openai-codex/gpt-5.2` used >50% of days this month?
   - Check: Are both accounts (Team plan) getting real usage?
   - Action: If <50% → downgrade one to ChatGPT Plus ($20) → save $180/month

2. **Perplexity Pro ($20/month):**
   - Check: Is RESEARCH agent making >10 web searches/week via Perplexity?
   - Action: If low → switch RESEARCH to n8n Perplexity node (pay-per-search) → save $20/month

3. **Claude Code Pro ($20/month):**
   - Keep — primary coding interface, essential

4. **Ollama ($0/month):**
   - Keep — free, local, critical baseline

**Total potential savings from subscription audit: up to $200/month**

---

## Per-Model Cost Caps

Configured in `workspace/config/budget-guardrails.json → per_model_caps`:

| Tier | Daily cap |
|------|-----------|
| Lightweight (Haiku) | $0.20 |
| Standard (Sonnet) | $1.20 |
| Heavy (Opus) | $0.60 |
| Local (Ollama) | Unlimited |

If a tier hits its cap, the gateway auto-downgrades to the next cheaper tier.

---

## How the Gateway Routes Requests

1. Request arrives at `POST /api/chat`
2. `track-router.js` reads `model_tier` from payload (if set)
3. If not set: HATAKE classifies the task (`gateway/track-router.js` → tier classifier)
4. `resilient-handler.js` selects model based on tier + routing profile
5. If Anthropic model + prompt caching enabled: adds `cache_control` to system prompt block
6. If `batch: true` in payload: routes to Anthropic Batch API instead
7. Cost logged to `cost-events.jsonl` with tier, model, tokens, cached_tokens, cost_usd

---

## Savings Calculation

Track actual vs. baseline in Mission Control:

```
Savings = (baseline_daily_cost - actual_daily_cost) / baseline_daily_cost × 100%

Baseline: All-Standard (Sonnet 4.6)
  = 200 requests/day × avg 1500 input + 500 output tokens
  = $0.003 × 300 + $0.015 × 100 = $0.90 + $1.50 = ... per request
  ≈ $1.65/day baseline

Target: 50/35/15 split + 90% prompt cache hit rate
  ≈ $0.74/day → 55% savings
```

See live savings: `GET /api/mission-control/savings`
