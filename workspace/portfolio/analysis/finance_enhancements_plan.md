# FINANCE enhancements plan (holdings + trades)

## Goal
Upgrade the daily finance output with:
1) Exposure + concentration block
2) Trade-to-holdings linkage (risk up/down)

## Current data available
- Holdings JSON: `/Users/redinside/.openclaw/workspace/portfolio/last-holdings-report.json`
  - `totals.market_value_by_currency` (USD/CAD)
  - `top_holdings[]` includes `symbol`, `market_value`, `currency`, `account`
  - `concentration` already exists (top1/top5/top10 by currency)
  - No sector metadata present.

- Trade JSON: `/Users/redinside/.openclaw/workspace/portfolio/last-trade-report.json`
  - `by_symbol` realized PnL per symbol-currency
  - `open_positions[]` includes symbol/currency/qty/avg_price
  - This is currently based on mock trades; real Wealthsimple Activity CSV will replace.

## Exposure + concentration block (v1)
Because sector weights require a sector map, v1 will be:
- Top 10 positions per currency with **% of that currency’s market value**
- Concentration flags based on thresholds:
  - single-name > 10%
  - top5 > 40%
  - top10 > 55%

Sector weights (v2) options:
- Add an internal static mapping file maintained by Anurag
- Or pull sector data via a vetted API/MCP (requires explicit approval + key)

## Trade-to-holdings linkage (v1)
Link trade symbols to holdings:
- Normalize holdings symbols by currency; match against trade report `by_symbol` keys like `AAPL-USD`.
- For each traded symbol:
  - current position size % (within its currency bucket)
  - realized pnl from trade report
  - classify `risk_up` if position size is >= threshold (e.g., >5%) or if it increased vs last snapshot (needs previous snapshot)

Better linkage (v2):
- Keep previous holdings snapshots (daily) and compute deltas per symbol.

## Next actions
1) Extend holdings analyzer to compute per-currency weights for all holdings (not just top10).
2) Add optional thresholds config (json) under `portfolio/config/finance-thresholds.json`.
3) Create a `finance_daily.py` script to render FINANCE DAILY message using those.
