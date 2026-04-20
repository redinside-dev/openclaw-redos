# Skill: earnings-tracker

**Upcoming earnings calendar — FINANCE posts a short list to Slack/Telegram.**

Use when FINANCE runs the weekly earnings cron or when Anurag asks for "upcoming earnings" or "earnings this week". Uses web search (no paid API); symbols from config or default tech list.

---

## When to use

- Weekly cron: FINANCE runs earnings-tracker to post upcoming earnings.
- Ad-hoc: User asks "what earnings are coming up?" or "earnings calendar this week".

---

## Data source (free)

- Use **web_search** (or Perplexity/web_fetch if allowed) to find "upcoming earnings this week" or "earnings calendar [symbols]".
- Do not use paid APIs unless explicitly configured. Prefer: "S&P 500 earnings this week", "tech earnings calendar", or symbols from `workspace/config/earnings-symbols.json` if it exists.

---

## Steps

### 1. Get symbols to track

- If `workspace/config/earnings-symbols.json` exists, read it. Expected format: `{"symbols": ["AAPL", "MSFT", "GOOGL", ...]}`.
- If missing or empty, use default list: AAPL, MSFT, GOOGL, AMZN, META, NVDA (or a short list of 5–8 tech names).

### 2. Look up upcoming earnings

- Run web_search: e.g. "upcoming earnings this week [symbol1] [symbol2] ..." or "earnings calendar next 7 days tech stocks".
- Extract: company (or ticker), date, time (if available), estimate/prior (if found). Keep it short.

### 3. Format and deliver

- Format a short list (max 15 lines), e.g.:
```
📅 Earnings this week
• AAPL — [date]
• MSFT — [date]
...
```
- Post to Slack #redos-mission-control (channel:C0AEV3MDEDD). If cron is configured for Telegram, also send a condensed version to Anurag (user 1012034994).

### 4. Log

- Append to `workspace/tasks-log.md`: `EARNINGS-TRACKER | finance | <ISO> | posted N symbols`

---

## Config (optional)

**File:** `workspace/config/earnings-symbols.json`

```json
{
  "symbols": ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA"],
  "updatedAt": "2026-03-01"
}
```

Anurag can edit this list; FINANCE reads it each run.

---

## Enabling

Add to `openclaw.json` under `skills.entries`: `"earnings-tracker": { "enabled": true }`. Assign to FINANCE. Cron runs weekly (e.g. Monday 7am).
