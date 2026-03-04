---
name: scrapling-mcp
description: Web scraping with Scrapling v0.4.1 — HTTP get, browser fetch, and Cloudflare bypass (stealthy). Use for Reddit, HackerNews, ProductHunt, Twitter/X, and any Cloudflare-protected site. Installed 2026-03-03.
---

# Scrapling — Web Scraping for OpenClaw Agents

## Installation
- Binary: `/Users/redinside/.local/bin/scrapling` (installed via pipx)
- Browser deps installed via `scrapling install`

## How to Scrape (via `exec`)

Use `exec` with the wrapper script `~/.openclaw/scripts/scrapling-fetch.sh`:

```
exec: bash ~/.openclaw/scripts/scrapling-fetch.sh <mode> <url> [css_selector]
```

### Modes

| Mode | Tool | When to Use |
|------|------|-------------|
| `get` | HTTP + fingerprint randomization | Reddit, HN, ProductHunt, most public sites |
| `fetch` | Playwright browser (JS-rendered) | SPAs, sites requiring JS execution |
| `stealthy` | Playwright + Cloudflare bypass | X/Twitter, CF-protected sites |

### Examples

**HackerNews top stories:**
```
exec: bash ~/.openclaw/scripts/scrapling-fetch.sh get https://news.ycombinator.com
```

**Twitter/X search (best-effort, may be blocked):**
```
exec: bash ~/.openclaw/scripts/scrapling-fetch.sh stealthy "https://twitter.com/search?q=AI+tools&f=live"
```

**Reddit specific subreddit:**
```
exec: bash ~/.openclaw/scripts/scrapling-fetch.sh get https://www.reddit.com/r/MachineLearning/hot/
```

**Extract only specific elements (CSS selector):**
```
exec: bash ~/.openclaw/scripts/scrapling-fetch.sh get https://news.ycombinator.com ".titleline"
```

## Reddit: Use JSON API (Preferred — Faster, No Scrapling Needed)

Reddit's JSON API is free, reliable, and returns structured data:

```
exec: curl -s "https://www.reddit.com/r/MachineLearning/hot.json?limit=25" -H "User-Agent: OpenClaw-RedOS/1.0"
```

Subreddits to monitor (from `workspace/ops/social-monitoring/targets.json`):
- r/MachineLearning
- r/artificial
- r/LocalLLaMA
- r/programming
- r/datascience

## Twitter/X — Reliability Notes

- `stealthy` mode bypasses Cloudflare but X actively blocks scrapers
- Expect 70-80% success rate on public timeline/search pages
- After ~100 req/day, IP may be rate-limited
- **Fallback:** Use Exa MCP `crawling_exa` for Twitter if stealthy fails 3x

## Output Format

Output is Markdown (human-readable, token-efficient). Pipe to a file or process inline:

```
exec: bash ~/.openclaw/scripts/scrapling-fetch.sh get https://news.ycombinator.com > /tmp/hn-today.md
```

## Ideas Pipeline Integration

Scraped content → `workspace/ideas/twitter-feed.md` and `workspace/ideas/reddit-feed.md`

Dashboard webhook: `POST http://localhost:19000/webhook/ingest-idea`
```json
{
  "platform": "reddit",
  "title": "Post title here",
  "url": "https://reddit.com/...",
  "summary": "Brief summary of what this is about",
  "score": 450
}
```

## Scrapling CLI Direct (Advanced)

```bash
# Direct CLI usage (output to file)
scrapling extract get <url> /tmp/output.md
scrapling extract fetch <url> /tmp/output.md
scrapling extract stealthy-fetch --solve-cloudflare <url> /tmp/output.md

# With CSS selector
scrapling extract get -s ".titleline" https://news.ycombinator.com /tmp/hn-titles.md
```
