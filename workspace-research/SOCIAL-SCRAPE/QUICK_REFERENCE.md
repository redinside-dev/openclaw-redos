# SOCIAL-SCRAPE Quick Reference

## 🚀 Installation (30 seconds)

```bash
git clone <repo> && cd SOCIAL-SCRAPE
npm install && npx playwright install chromium
cp .env.example .env && npm test
```

## 📖 Common Commands

```bash
npm run twitter      # Twitter example
npm run reddit       # Reddit example  
npm run multi        # Multi-platform
npm run background   # Background collector
npm run health       # Health check
npm test            # Run tests
```

## 💻 Quick Code Snippets

### Twitter Profile
```javascript
const { TwitterScraper } = require('./scrapers/twitter');
const scraper = new TwitterScraper({ headless: true });
const profile = await scraper.scrapeProfile('elonmusk');
await scraper.close();
```

### Reddit Posts
```javascript
const { RedditScraper } = require('./scrapers/reddit');
const scraper = new RedditScraper({ headless: true });
const posts = await scraper.scrapeSubreddit('programming', { limit: 50 });
await scraper.close();
```

### Multi-Platform Topic
```javascript
const { MultiPlatformScraper } = require('./scrapers/multi-platform');
const scraper = new MultiPlatformScraper({ stealth: true });
const results = await scraper.aggregateByTopic('AI', { limit: 100 });
```

### Background Collection
```javascript
const { BackgroundCollector } = require('./collectors/background');
const collector = new BackgroundCollector({ autoDiscover: true });
await collector.start({
  targets: [{ platform: 'twitter', username: 'elonmusk' }],
  interval: 900000 // 15 min
});
```

## 🔧 Configuration (`.env`)

```bash
BROWSER_HEADLESS=true          # Run browser in background
SCRAPE_DELAY_MIN=2000          # Min delay between requests (ms)
SCRAPE_DELAY_MAX=5000          # Max delay between requests (ms)
STORAGE_TYPE=filesystem        # filesystem, database, cloud
STORAGE_PATH=./data            # Where to save data
AUTO_DISCOVER=true             # Auto-find new targets
```

## 📅 Cron Setup

```bash
crontab -e

# Add these lines:
*/15 * * * * cd /path/to/SOCIAL-SCRAPE && node schedulers/twitter-cron.js
*/30 * * * * cd /path/to/SOCIAL-SCRAPE && node schedulers/reddit-cron.js
0 * * * * cd /path/to/SOCIAL-SCRAPE && node schedulers/health-check.js
```

## 🐳 Docker Quick Start

```bash
docker build -t social-scrape .
docker run -d --name scraper \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  social-scrape
```

## 🔍 Troubleshooting

| Problem | Solution |
|---------|----------|
| Playwright error | `npx playwright install-deps` |
| Selector not found | Check docs/ADVANCED_TECHNIQUES.md |
| Rate limited | Increase delays in .env |
| Memory issues | Reduce browser pool size |
| Permission denied | `chmod +x setup-browser.sh` |

## 📊 Scraper Methods

### TwitterScraper
```javascript
await scraper.scrapeProfile(username)
await scraper.scrapeTweets(username, { limit: 100 })
await scraper.scrapeWithMonitoring(usernames, { interval: 900000 })
await scraper.healthCheck()
```

### RedditScraper
```javascript
await scraper.scrapeSubreddit(subreddit, { sort: 'hot', limit: 50 })
await scraper.analyzeTrends(subreddit, { timeframe: '24h' })
await scraper.aggregateSubreddits(subreddits, { limit: 25 })
await scraper.scrapeUserActivity(username)
await scraper.healthCheck()
```

### MultiPlatformScraper
```javascript
await scraper.aggregateByTopic(topic, { platforms: ['twitter', 'reddit'] })
await scraper.trackUser({ twitter: 'user', reddit: 'user' })
await scraper.aggregateMultipleTopics(topics, options)
```

### BackgroundCollector
```javascript
await collector.start({ targets, interval })
await collector.stop()
await collector.getStatus()
await collector.exportStats()
```

## 🎯 Common Patterns

### Retry with Backoff
```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(1000 * Math.pow(2, i));
    }
  }
}
```

### Rate Limit Handler
```javascript
async function withRateLimit(fn) {
  const minDelay = 2000;
  const maxDelay = 5000;
  const result = await fn();
  await delay(minDelay, maxDelay);
  return result;
}
```

### Multiple Selectors
```javascript
const selectors = [
  '[data-testid="element"]',
  '.class-name',
  '#element-id'
];

for (const sel of selectors) {
  const el = await page.$(sel);
  if (el) return el;
}
```

## 📁 Project Structure

```
SOCIAL-SCRAPE/
├── scrapers/          # Platform scrapers
├── collectors/        # Background collection
├── schedulers/        # Cron jobs
├── examples/          # Usage examples
├── test/              # Test suites
├── docs/              # Documentation
├── data/              # Scraped data
├── logs/              # Application logs
├── .env.example       # Configuration template
├── package.json       # Dependencies
└── SKILL.md          # Main documentation
```

## 🔗 Important Files

- **SKILL.md** - Complete specification
- **docs/ADVANCED_TECHNIQUES.md** - Deep dive
- **docs/DEPLOYMENT.md** - Production guide
- **docs/BEST_PRACTICES.md** - Patterns
- **docs/TESTING.md** - Test guide
- **PROJECT_SUMMARY.md** - Overview

## 📞 Getting Help

1. Check documentation in `/docs`
2. Review examples in `/examples`
3. Run tests: `npm test`
4. Check logs in `/logs`
5. Review error messages

## ⚡ Performance Tips

- Use headless mode: `{ headless: true }`
- Enable browser pooling (3-5 instances)
- Implement caching for repeated requests
- Use incremental scraping
- Block images/CSS: reduce payload by 70%
- Close pages after use

## 🔐 Security Checklist

- [ ] Never commit `.env` file
- [ ] Use environment variables
- [ ] Sanitize all inputs
- [ ] Validate scraped data
- [ ] Encrypt sensitive data
- [ ] Use HTTPS when possible
- [ ] Implement rate limiting
- [ ] Review legal compliance

## 🎓 Learning Path

1. Start with examples: `npm run twitter`
2. Read SKILL.md for API reference
3. Study ADVANCED_TECHNIQUES.md
4. Review BEST_PRACTICES.md
5. Deploy using DEPLOYMENT.md
6. Extend with custom scrapers

## 📈 Monitoring

### Check Status
```javascript
const status = await collector.getStatus();
console.log(status.stats);
```

### Health Check
```bash
node schedulers/health-check.js
```

### View Logs
```bash
tail -f logs/collector.log
tail -f logs/twitter-cron.log
tail -f logs/reddit-cron.log
```

## 🌟 Pro Tips

1. **Stealth**: Always use `{ stealth: true }`
2. **Delays**: Randomize delays: `delay(2000, 5000)`
3. **Selectors**: Use multiple fallbacks
4. **Errors**: Implement retry logic
5. **Resources**: Always close browsers
6. **Monitoring**: Use health checks
7. **Backups**: Backup data directory
8. **Updates**: Keep Playwright updated

## 🚦 Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 403 | Forbidden (blocked) |
| 404 | Not found |
| 429 | Rate limited |
| 503 | Service unavailable |

## 🔄 Update & Maintenance

```bash
# Update dependencies
npm update

# Update Playwright
npx playwright install chromium

# Clean old data
find data/ -mtime +30 -delete

# Clean old logs
find logs/ -name "*.log" -mtime +7 -delete
```

## 📦 Export Data

```javascript
// Export to JSON
const data = await scraper.scrapeTweets('user', { limit: 100 });
await fs.writeFile('tweets.json', JSON.stringify(data, null, 2));

// Export to CSV
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({ path: 'tweets.csv', header: [...] });
await csvWriter.writeRecords(data);
```

---

**Quick Start**: `npm install && npm run twitter`

**Full Docs**: See `SKILL.md` and `/docs`

**Help**: Check troubleshooting section above
