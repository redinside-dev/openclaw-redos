# Weekly Cost Report — 2026-03-13

**Generated:** 2026-03-14
**Period:** 2026-03-07 → 2026-03-13
**Reporter:** FINANCE (auto-generated from budget-guardrails.json)

---

## Summary

| Category | Budget | Est. Actual | Status |
|----------|--------|-------------|--------|
| Variable (PAYG) daily | $2.00/day | ~$0.00/day | ✅ Under (9Router = $0) |
| Variable weekly | $10.00 | ~$0.00 | ✅ Under |
| Fixed monthly | $460.00 | $460.00 | ℹ️ Subscriptions running |
| **Total monthly** | **$490.00** | **~$460.00** | ✅ On budget |

---

## Fixed Monthly Subscriptions ($460/mo)

| Service | Cost | Usage Status | Action |
|---------|------|-------------|--------|
| ChatGPT Pro (account 1) | $200 | Codex API primary coding interface | Keep |
| ChatGPT Pro (account 2) | $200 | Under-utilised — codex API may cover | ⚠️ Review at April audit |
| Perplexity Pro | $20 | RESEARCH agent searches | Keep if >10 searches/week |
| Ollama (local) | $0 | Free baseline | Keep |
| **Total** | **$420** | — | — |

> ⚠️ **Potential savings: $380/mo** identified in last audit (2026-03-01). Main lever: drop 2nd ChatGPT Pro if codex API covers coding needs. Next audit due: 2026-04-01.

---

## Variable Spend (PAYG Models)

**Actual: ~$0.00** — all agents routing through 9Router free-unlimited tier. No PAYG model usage detected this week.

| Model tier | Daily cap | Est. actual | Status |
|------------|-----------|-------------|--------|
| claude-haiku-4-5 (lightweight) | $0.20 | $0.00 | ✅ |
| claude-sonnet-4-6 (standard) | $1.20 | $0.00 | ✅ |
| claude-opus-4-6 (heavy) | $0.60 | $0.00 | ✅ |
| ZAI (PAYG — forbidden in crons) | — | $0.00 | ✅ Compliant |

---

## Per-Agent Cron Activity (estimated cost impact)

All active crons run via 9Router `free-unlimited` → $0 variable cost. 30 enabled crons, 74 total.

- No model overrides detected in cron payloads ✅
- No ZAI usage in crons ✅
- Fallback chain intact: free-unlimited → heartbeat-cheap → openai-codex/gpt-5.2

---

## Alerts

None this week. Budget thresholds:
- Warn at 70% daily variable: **not triggered**
- Auto cost-saver at 90%: **not triggered**
- PAYG pause at 100%: **not triggered**

---

## Recommendations

1. **April 1 audit:** Evaluate ChatGPT Pro account 2 ($200/mo) — if codex API handles all coding, cancel to save $200/mo
2. **Perplexity:** Confirm RESEARCH agent web_search usage is restored post-quota incident before next billing cycle
3. **9Router dependency:** 100% of LLM traffic goes through 9Router free tier — monitor for quota changes or policy updates

---

*Next report due: 2026-03-20*
