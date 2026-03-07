# Nightly Eval — 2026-03-07

## Episode Analysis (Last 24h)

- **Total episodes:** 27
- **Successes:** 22
- **Failures:** 5
- **Success rate:** 81.48%
- **Failure rate:** 18.52%

### Failure Breakdown (Clustered by error_type, tool, agent)

| # | Error Type | Tool | Agent | Occurrences |
|---|------------|------|-------|-------------|
| 1 | unknown | unknown | unknown | 4 |
| 2 | "⚠️ ✎ Message failed" | message | ops | 1 |

---

## Autonomy Scorecard

**Score: 7/10**

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Cron success rate | 81.48% | ≥95% | ❌ |
| A2A activity | 49 interactions | ≥10 | ✅ |
| Open P0/P1 tickets | 6 | 0 | ❌ |
| Delivery success rate | 30.43% | ≥95% | ❌ |
| Tool validation errors | 0 | 0 | ✅ |

*Status: NEEDS ATTENTION*

---

## Top Recurring Failure Patterns & Proposed Fixes

1. **Unknown errors** (4 occurrences)
   - *Pattern:* generic `unknown` error_type with no additional context, making root cause analysis impossible.
   - *Proposed fix:* Enhance agent error handling to capture full stack traces, context variables, and environment state. Implement centralized error logging with structured data. Add alerts for spikes in unknown errors.

2. **Message failed** (1 occurrence)
   - *Pattern:* `message` tool invocation failed in ops agent; error indicates message sending failure.
   - *Proposed fix:* Verify message plugin configuration (Slack/Telegram credentials). Test connectivity. Add exponential backoff retry logic for transient failures.

3. *(Only two distinct failure clusters observed in the last 24h)*

---

## Deny Pattern Recommendations

- **Potential deny pattern:** `tool: message` when message plugin is misconfigured or connectivity is down. However, this requires more evidence before codifying into command-catalog.
- **Consider:** Adding a deny rule for `tool: model_routing` with model `ollama/llama3.1:8b` for agents that don't have that model allowed (seen in past errors). But recent episodes show only unknown and message errors; no immediate new deny patterns recommended.

---

## Action Items

- **⚠️ Failure rate above 15% (18.52%)** – per cron instructions, a Telegram DM should be sent to `1012034994` (Anurag) with the warning.
- Autonomy score is 7/10; continue monitoring.
- Focus on improving **cron job success** and **delivery success** metrics to reach thresholds.
