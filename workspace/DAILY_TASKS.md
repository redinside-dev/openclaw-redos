# DAILY_TASKS.md

Use this as the running, memo-style task board for **RED lane**.

For combined RED+ZEN tracking, use: `COMBINED_TASK_TRACKER.md`
For ZEN-only lane, use: `ZEN_DAILY_TASKS.md`

Rules:
- Append new items at the top under “Inbox (new)”.
- When you start work: move item to “In Progress” with a timestamp.
- When done: move to “Done” and include file paths / PR links.
- If blocked: add a “Blocked” section entry with exactly what is needed to unblock.

## Inbox (new)

- [2026-02-08] Trade Board Analyzer: obtain Wealthsimple **trade history/activity CSV** (fills). Holdings snapshot exists at `/Users/redinside/Downloads/holdings-report-2026-02-06.csv` but FIFO realized PnL needs trades CSV.

## In Progress

- [2026-02-08] Trade Board Analyzer MVP: repo exists at `/Users/redinside/Development/Codebase/projects/trade-board-analyzer`; tests passing (10). Next: ingest real Wealthsimple Activity/History trades CSV.

## Done

- [2026-02-08] Skill pack: `anurag-briefs` (Brief + X) created under `~/.openclaw/workspace/skills/`.
- [2026-02-08] Skill: `holdings-analyzer` (stocks-only) created + ran against `~/Downloads/holdings-report-2026-02-06.csv` → report + JSON generated.

## Blocked

- [2026-02-08] Need Wealthsimple Trade **History/Activity export CSV** (not holdings snapshot). Please export and place at `/Users/redinside/.openclaw/workspace/portfolio/trades/wealthsimple-trades.csv`.

## Done

- [2026-02-08] ZEN routing: primary `openai-codex/gpt-5.2`, fallbacks `zai/glm-4.7` → `moonshot/kimi-k2.5`; Perplexity web search tool model fixed to `sonar`; docs updated (MEMORY/POLICY/KNOWLEDGEBASE).
