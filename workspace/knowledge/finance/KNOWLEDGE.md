# FINANCE Domain Knowledge Base

**Agent:** FINANCE (💰) | **Updated:** 2026-03-04

---

## Budget Guardrails
Config: `workspace/config/budget-guardrails.json`

| Threshold | Action |
|-----------|--------|
| 70% daily | Warn RED via Slack |
| 90% daily | Switch to `cost_saver` routing profile |
| 100% daily | Pause all PAYG models (ZAI blocked) |
| Single call > $0.50 | Require human approval |

**Current daily variable spend target: ≤$1.00/day**
**PAYG models (ZAI/GLM): BANNED from crons and fallback chains**

## Cost Monitoring

Cost events logged to: `workspace/logs/cost-events.jsonl`
Weekly cost report: `finance-weekly-cost-report-0001` cron (Mon 8:45am ET)

```bash
# Check recent cost events
tail -20 ~/.openclaw/workspace/logs/cost-events.jsonl | python3 -m json.tool

# Run weekly cost report manually
python3 ~/.openclaw/workspace/scripts/weekly_cost_report.py
```

## Model Cost Tiers (rough estimates)
| Model | Cost | Use case |
|-------|------|----------|
| `9router/free-unlimited` | $0 | Default — all agents |
| `9router/heartbeat-cheap` | ~$0.001/call | Heartbeat fallback |
| `9router/coding-factory` | ~$0.003/call | ENG code tasks |
| `9router/subagent-reliable` | ~$0.003/call | FINANCE, INFOSEC |
| `9router/research-deep` | ~$0.005/call | Deep research only |
| `9router/always-on-premium` | ~$0.01/call | P0 incidents only |
| ZAI/GLM | PAYG | **NEVER use in crons** |
| Perplexity sonar-pro | ~$0.005/call | RESEARCH explicit only |
| Ollama qwen3.5:4b | $0 | Local fallback |

## Subscription Audit (due 2026-04-01)
- ChatGPT Pro x2 ($400/mo) — review utilization, downgrade if <50%
- Perplexity Pro — review usage vs budget
- 9Router subscription — confirm tier vs usage

## Market/Finance Tools
- `earnings-tracker` skill — tracks upcoming earnings
- `holdings-analyzer` skill — portfolio analysis
- Alpha Vantage API — 4x/day market data cron
- Trading window brief crons: 8am-4pm ET daily

## Weekly Cost Report Format
```
💰 FINANCE Weekly Cost Report — Week of <date>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Variable spend: $X.XX (target: ≤$7.00/week)
Largest cost: <model> — $X.XX (<N> calls)
Cache hit rate: X% (target: >60%)
PAYG calls: N (should be 0)
Subscription cost: $XXX/mo (review due: 2026-04-01)

Top 3 cost drivers this week:
1. <model>: N calls, $X.XX
2. ...
Recommendation: <one action to reduce cost>
```

Post to `#openclaw-optimization` (Slack: C0AEV3MDEDD) every Monday.
