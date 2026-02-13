---
name: holdings-analyzer
description: Analyze Wealthsimple holdings snapshot CSVs (stocks-only). Use when Anurag asks for holdings analysis or a holdings report, e.g. 'Analyze holdings', 'Holdings report', 'Run holdings analyzer', 'holdings snapshot'. Takes a Wealthsimple holdings-report CSV and produces a Telegram-friendly summary plus writes a detailed Markdown report + JSON summary. Enforces canonical policy: ignore crypto entirely (exclude Security Type=CRYPTOCURRENCY and any Account Name/Type of Crypto).
---

# holdings-analyzer

## Run (local script)

```bash
python3 /Users/redinside/.openclaw/workspace/skills/holdings-analyzer/scripts/holdings_analyzer.py \
  --csv "/Users/redinside/Downloads/holdings-report-2026-02-06.csv"
```

Defaults:
- CSV: `/Users/redinside/Downloads/holdings-report-2026-02-06.csv`
- Markdown output: `/Users/redinside/.openclaw/workspace/portfolio/reports/holdings-analyzer-YYYY-MM-DD.md`
- JSON output: `/Users/redinside/.openclaw/workspace/portfolio/last-holdings-report.json`

## Output
- Totals by currency (market value)
- Total book value (CAD) + unrealized P/L
- Top holdings (top 10) + concentration (top1/top5/top10)
- Per-account summaries (Account Name + Account Number)
- Excluded rows count (crypto filtered)

## Notes
- Stocks-only by default. Crypto is excluded unless Anurag explicitly requests otherwise.
