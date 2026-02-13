# ZEN_DAILY_TASKS.md

ZEN lane task board (daily memo).

Rules:
- Append new items at the top under “Inbox (new)”.
- Move items through: Inbox → In Progress → Blocked → Done.
- Include message id if possible, and concrete artifacts/links.

## Inbox (new)
- (msg 265/270/272/276/280) Portfolio improvement analysis: user unsure; wants a concrete report for deploying **50k CAD RRSP**; likely ETF-heavy; keep NVDA never-sell; Option B growth; 6–12m; 10% DD.
- (msg 285/289) Check with RED: confirm status of spring-boot-product-api PR #10 work + share results; coordinate via combined tracker.

## In Progress
- (msg 270) Build holdings report v1 tuned to constraints (growth / 6–12m / 10% DD) + A/B options — DONE (emailed PDF). Next: produce trim/add candidates after "never-sell" + avoid sectors.

## Blocked

## Done

- [2026-02-08] `/ping` check succeeded (ZEN responded `pong`).
- [2026-02-08] (msg 263) Generated MVP **Wealthsimple holdings report** from `~/Downloads/holdings-report-2026-02-06.csv` → emailed PDF to Anurag (pandoc+tectonic installed).
- [2026-02-08] (msg 261) Installed `pandoc` + `tectonic` for human-readable PDF report attachments.
- [2026-02-08] (msg 243/244) Cron created: weekday 5:30pm ET daily market brief (Telegram) + full report available on-demand.
- [2026-02-08] (msg 257/259) Full-report attachment preference: PDF.
- [2026-02-08] (msg 251/253) Manual test email flow validated; full report sent.
- [2026-02-08] (msg 257) Confirmed: Markdown not ideal for Gmail; PDF is default.
- [2026-02-08] (msg 261) Approved by Anurag to install tools needed for PDF.
- [2026-02-08] (msg 241/243) Cron schedule confirmed: 5:30pm weekdays ET.
- [2026-02-08] (msg 247) Sent manual test brief.
- [2026-02-08] (msg 257) PDF suggestion accepted.
- [2026-02-08] (msg 263) Holdings CSV parsing works without pandas; uses Python stdlib.
- [2026-02-08] (msg 263) Scope reminder (canonical): **stocks-only** — filter out crypto lines + crypto ETFs for the standard holdings report.
- [2026-02-08] (msg 263) Next step: wire holdings-derived exposures into daily brief watchlist.
- [2026-02-08] (msg 263) Improvement: convert USD→CAD using chosen FX for unified totals.
- [2026-02-08] (msg 263) Improvement: add concentration metrics (top-1/top-5/top-10).
- [2026-02-08] (msg 263) Improvement: (only if explicitly requested) tag crypto/crypto-ETF lines for optional inclusion.
- [2026-02-08] (msg 263) Improvement: generate per-account summaries (TFSA/RRSP) + P/L.
- [2026-02-08] (msg 263) Improvement: generate a clean ticker list + sector tags.
- [2026-02-08] (msg 263) Deliverables saved under `/Users/redinside/.openclaw/workspace-allrounder/reports/` (ZEN workspace) and can be mirrored into `/Users/redinside/.openclaw/workspace/portfolio/reports/` if desired.
- [2026-02-08] (msg 263) Next step: regenerate holdings report in **stocks-only** mode (exclude crypto + crypto ETFs), and keep an optional “everything” version only if Anurag explicitly asks.
- [2026-02-08] (msg 263) Need from Anurag: provide Wealthsimple **Activity/Trade History CSV** if we want realized P/L.
- [2026-02-08] (msg 263) Status: MVP report generated and emailed; ready to iterate.
- [2026-02-08] (msg 263) Policy: log every request same-day + keep trackers updated.

