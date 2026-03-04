# RESEARCH Domain Knowledge Base

**Agent:** RESEARCH (🔬) | **Updated:** 2026-03-04

---

## Primary Tools

| Tool | Use case | Notes |
|------|----------|-------|
| `web_search` | General web search | Always include date range for recency |
| `web_fetch` | Fetch specific URL | Check outbound-url-allowlist.json first |
| Scrapling `get` | Public HTML scraping | HackerNews, ProductHunt, Reddit |
| Scrapling `stealthy` | Cloudflare-protected sites | Twitter/X — 70-80% success rate |
| Reddit JSON API | Reddit posts/comments | `https://www.reddit.com/r/<sub>/hot.json?limit=25` |
| Perplexity `sonar-pro` | Deep internet research | PAYG — only for explicit research tasks |

## Weekly Pipelines

### Research→ENG (Monday 8am ET)
1. `research-weekly-digest-0001` cron fires
2. Scan Cursor, Perplexity, Devin, v0 for new patterns
3. Write brief to `workspace/tmp/research-brief-latest.md`
4. `sessions_send(agentId="eng", ...)` — ENG implements top quick wins
5. Post summary to `#redos-mission-control`

### Market Factory (Wednesday 9am ET)
1. `research-market-factory-0001` cron fires
2. Mine Reddit/HN for developer pain points (7-day window)
3. Score and rank pain points (frequency × severity × addressability)
4. Write top-3 MVP briefs to `workspace/tmp/mvp-brief-<slug>.md`
5. `sessions_send(agentId="main", ...)` — RED reviews and queues

### Content Factory Stage 1 (Friday 2pm ET)
1. `content-factory-stage1-0001` cron fires
2. Research trending topic matching sprint goal
3. Write brief to `workspace/tmp/content-brief-latest.md`
4. `sessions_spawn(agentId="allrounder", ...)` — ZEN writes the piece

## Social Monitoring (n8n, runs at :00 every 30min)
- Twitter: `twitter-service` workflow (id: 7YRs0yJOR5pDvj6k)
- Reddit: `reddit-service` workflow (id: bPsStF6AKUYzJSI9)
- Aggregator: `aggregator-service` (id: rRPKQxc8xwrhXnQJ) — dedup + score
- Output: `workspace/ideas/twitter-feed.md`, `workspace/ideas/reddit-feed.md`
- DB: `~/.openclaw/workspace/data/social-monitoring.db` (SQLite)

## Scrapling Usage
```bash
# Public page scraping
bash ~/.openclaw/scripts/scrapling-fetch.sh get https://news.ycombinator.com "tr.athing"

# Reddit (no scrapling needed — free JSON API)
curl -s "https://www.reddit.com/r/MachineLearning/hot.json?limit=25" \
  -H "User-Agent: OpenClaw-RedOS/1.0"

# Twitter (stealthy mode — may fail; graceful fallback built in)
bash ~/.openclaw/scripts/scrapling-fetch.sh stealthy "https://x.com/search?q=AI+tools&f=live"
# Or use the Python script directly:
python3 ~/.openclaw/scripts/twitter-scrape.py "AI agent 2026"
```

## Output Standards
- Brief files: `workspace/tmp/<type>-brief-<date>.md` (cleared after ENG intake)
- Ideas: `workspace/ideas/twitter-feed.md`, `workspace/ideas/reddit-feed.md` (append-only)
- Episodes: append to `workspace/logs/episodes.jsonl` after every research session
- Always cite source URLs — agents use these for follow-up

## Research Quality Checklist
- [ ] Sources are <7 days old for current events
- [ ] At least 3 independent sources for any factual claim
- [ ] Pain points scored on 3 dimensions (frequency, severity, addressability)
- [ ] Competitor features cross-referenced with RedOS capabilities
- [ ] Summary posted to `#redos-mission-control` Slack channel
