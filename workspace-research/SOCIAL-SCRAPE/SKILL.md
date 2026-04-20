# SOCIAL-SCRAPE Skill

## Metadata
- **Skill ID**: social-scrape
- **Version**: 1.0.0
- **Category**: Data Collection, Web Scraping, Social Media
- **Difficulty**: Advanced
- **Maintenance**: Active

## Description
Production-ready web scraping skill for social media platforms without API dependencies. Includes browser automation, stealth techniques, background processing, and self-evolving monitoring systems.

## Capabilities

### Core Scraping
- **Twitter/X**: Profile data, tweets, followers, engagement metrics
- **Reddit**: Subreddit posts, comments, trends, user activity
- **Multi-Platform**: Aggregation across multiple social networks
- **Background Collection**: 24/7 autonomous data pipelines

### Technical Features
- Browser automation via OpenClaw Browser Relay + Playwright
- API-less scraping (no authentication required)
- Rate limit bypassing with intelligent delays
- Stealth mode (user agent rotation, fingerprint randomization)
- Error recovery and retry logic
- Cost optimization for high-frequency scraping
- Self-evolving target discovery

## Architecture

### Components
1. **Browser Controller**: Manages Playwright instances and OpenClaw Browser Relay
2. **Scraper Engines**: Platform-specific extraction logic
3. **Data Pipeline**: Processing, validation, and storage
4. **Scheduler**: Cron-based automation
5. **Monitor**: Health checks and auto-discovery
6. **Stealth Layer**: Detection avoidance

### Data Flow
```
Target URLs → Browser Controller → Scraper Engine → Data Pipeline → Storage
                                         ↓
                                    Monitor → Auto-Discovery
```

## Prerequisites
- Node.js 18+
- Playwright
- OpenClaw Browser Relay (optional, for Chrome extension mode)
- Cron (for scheduling)
- Storage backend (filesystem, database, or cloud)

## Installation

```bash
# Navigate to skill directory
cd SOCIAL-SCRAPE

# Install dependencies
npm install

# Set up browser profiles
./setup-browser.sh

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Test installation
npm test
```

## Configuration

### Environment Variables
```bash
# Browser settings
BROWSER_HEADLESS=true
BROWSER_PROFILE=openclaw
BROWSER_TIMEOUT=30000

# Scraping settings
SCRAPE_DELAY_MIN=2000
SCRAPE_DELAY_MAX=5000
MAX_RETRIES=3
RETRY_DELAY=5000

# Storage
STORAGE_TYPE=filesystem
STORAGE_PATH=./data

# Monitoring
MONITOR_ENABLED=true
MONITOR_INTERVAL=3600000
AUTO_DISCOVER=true

# Stealth
ROTATE_USER_AGENTS=true
RANDOMIZE_DELAYS=true
USE_PROXIES=false
```

### Cron Schedule
```bash
# Edit crontab
crontab -e

# Twitter scraping every 15 minutes
*/15 * * * * cd /path/to/SOCIAL-SCRAPE && node schedulers/twitter-cron.js

# Reddit monitoring every 30 minutes
*/30 * * * * cd /path/to/SOCIAL-SCRAPE && node schedulers/reddit-cron.js

# Health check every hour
0 * * * * cd /path/to/SOCIAL-SCRAPE && node schedulers/health-check.js
```

## Usage

### Twitter/X Profile Scraping
```javascript
const { TwitterScraper } = require('./scrapers/twitter');

const scraper = new TwitterScraper({
  headless: true,
  stealth: true
});

// Scrape single profile
const profile = await scraper.scrapeProfile('elonmusk');
console.log(profile);

// Scrape tweets
const tweets = await scraper.scrapeTweets('elonmusk', { limit: 100 });
console.log(tweets);

// Scrape with monitoring
await scraper.scrapeWithMonitoring(['elonmusk', 'openai'], {
  interval: 900000, // 15 minutes
  autoDiscover: true
});
```

### Reddit Subreddit Monitoring
```javascript
const { RedditScraper } = require('./scrapers/reddit');

const scraper = new RedditScraper({
  headless: true,
  stealth: true
});

// Monitor subreddit
const posts = await scraper.scrapeSubreddit('programming', {
  sort: 'hot',
  limit: 50
});

// Trend analysis
const trends = await scraper.analyzeTrends('programming', {
  timeframe: '24h',
  minScore: 100
});

// Multi-subreddit aggregation
const aggregated = await scraper.aggregateSubreddits([
  'programming',
  'javascript',
  'python'
], { limit: 25 });
```

### Multi-Platform Aggregation
```javascript
const { MultiPlatformScraper } = require('./scrapers/multi-platform');

const scraper = new MultiPlatformScraper({
  platforms: ['twitter', 'reddit'],
  stealth: true
});

// Aggregate by topic
const results = await scraper.aggregateByTopic('artificial intelligence', {
  platforms: ['twitter', 'reddit'],
  limit: 100,
  timeframe: '24h'
});

// Cross-platform user tracking
const userActivity = await scraper.trackUser({
  twitter: 'username',
  reddit: 'username'
});
```

### Background Data Collection
```javascript
const { BackgroundCollector } = require('./collectors/background');

const collector = new BackgroundCollector({
  targets: [
    { platform: 'twitter', username: 'elonmusk' },
    { platform: 'reddit', subreddit: 'programming' }
  ],
  interval: 900000, // 15 minutes
  storage: 'filesystem',
  autoDiscover: true
});

// Start collection
await collector.start();

// Monitor status
const status = await collector.getStatus();
console.log(status);

// Stop collection
await collector.stop();
```

## Stealth Techniques

### User Agent Rotation
```javascript
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
];

// Rotate on each request
await page.setUserAgent(userAgents[Math.floor(Math.random() * userAgents.length)]);
```

### Fingerprint Randomization
```javascript
// Randomize viewport
await page.setViewportSize({
  width: 1280 + Math.floor(Math.random() * 200),
  height: 720 + Math.floor(Math.random() * 200)
});

// Randomize timezone
await page.emulateTimezone('America/New_York');

// Randomize locale
await page.setExtraHTTPHeaders({
  'Accept-Language': 'en-US,en;q=0.9'
});
```

### Intelligent Delays
```javascript
// Human-like delays
const delay = (min, max) => {
  const ms = min + Math.random() * (max - min);
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Between actions
await delay(2000, 5000);

// Exponential backoff on errors
let retryDelay = 1000;
for (let i = 0; i < maxRetries; i++) {
  try {
    await scrape();
    break;
  } catch (error) {
    await delay(retryDelay, retryDelay * 2);
    retryDelay *= 2;
  }
}
```

## Error Handling

### Retry Logic
```javascript
async function scrapeWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      console.log(`Retry ${i + 1}/${maxRetries} after error:`, error.message);
      await delay(5000 * (i + 1), 10000 * (i + 1));
    }
  }
}
```

### Circuit Breaker
```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failures = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED';
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      setTimeout(() => {
        this.state = 'HALF_OPEN';
        this.failures = 0;
      }, this.timeout);
    }
  }
}
```

## Cost Optimization

### Browser Instance Pooling
```javascript
class BrowserPool {
  constructor(size = 3) {
    this.pool = [];
    this.size = size;
  }

  async acquire() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    return await this.createBrowser();
  }

  async release(browser) {
    if (this.pool.length < this.size) {
      this.pool.push(browser);
    } else {
      await browser.close();
    }
  }

  async createBrowser() {
    const { chromium } = require('playwright');
    return await chromium.launch({ headless: true });
  }
}
```

### Request Deduplication
```javascript
class RequestCache {
  constructor(ttl = 300000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}
```

### Incremental Scraping
```javascript
// Only scrape new content
async function scrapeIncremental(lastId) {
  const posts = await scrapePosts();
  const newPosts = posts.filter(p => p.id > lastId);
  
  if (newPosts.length > 0) {
    await savePosts(newPosts);
    return newPosts[0].id; // New lastId
  }
  
  return lastId;
}
```

## Self-Evolving Monitoring

### Auto-Discovery
```javascript
class AutoDiscovery {
  constructor(scraper) {
    this.scraper = scraper;
    this.targets = new Set();
  }

  async discoverFromProfile(username) {
    const profile = await this.scraper.scrapeProfile(username);
    
    // Discover from followers
    const followers = profile.topFollowers || [];
    followers.forEach(f => this.targets.add(f.username));
    
    // Discover from mentions
    const tweets = await this.scraper.scrapeTweets(username);
    tweets.forEach(t => {
      const mentions = t.text.match(/@(\w+)/g) || [];
      mentions.forEach(m => this.targets.add(m.slice(1)));
    });
    
    return Array.from(this.targets);
  }

  async discoverFromSubreddit(subreddit) {
    const posts = await this.scraper.scrapeSubreddit(subreddit);
    
    // Discover related subreddits
    const related = new Set();
    posts.forEach(p => {
      const mentions = p.text.match(/r\/(\w+)/g) || [];
      mentions.forEach(m => related.add(m.slice(2)));
    });
    
    return Array.from(related);
  }
}
```

### Health Monitoring
```javascript
class HealthMonitor {
  constructor(scrapers) {
    this.scrapers = scrapers;
    this.metrics = {
      successRate: 0,
      avgResponseTime: 0,
      errorCount: 0
    };
  }

  async check() {
    const results = await Promise.allSettled(
      this.scrapers.map(s => s.healthCheck())
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    this.metrics.successRate = successful / results.length;
    this.metrics.errorCount = results.length - successful;

    if (this.metrics.successRate < 0.5) {
      await this.alert('Low success rate detected');
    }

    return this.metrics;
  }

  async alert(message) {
    console.error(`[ALERT] ${message}`);
    // Send notification via email, Slack, etc.
  }
}
```

## Best Practices

### Rate Limiting
- Use random delays between requests (2-5 seconds)
- Implement exponential backoff on errors
- Respect robots.txt (or don't, depending on use case)
- Monitor for rate limit responses (429, 503)

### Detection Avoidance
- Rotate user agents frequently
- Randomize viewport sizes
- Use residential proxies when possible
- Avoid predictable patterns
- Mimic human behavior (scrolling, mouse movements)

### Data Quality
- Validate scraped data structure
- Handle missing fields gracefully
- Deduplicate entries
- Store raw HTML for re-parsing
- Version your extraction logic

### Maintenance
- Monitor scraper health daily
- Update selectors when sites change
- Log all errors with context
- Keep browser versions updated
- Test scrapers regularly

### Legal & Ethical
- Review terms of service
- Respect rate limits
- Don't overload servers
- Store data securely
- Consider privacy implications

## Troubleshooting

### Browser Won't Launch
```bash
# Install browser binaries
npx playwright install chromium

# Check permissions
chmod +x setup-browser.sh
```

### Selectors Not Working
```javascript
// Use multiple fallback selectors
const selectors = [
  'article[data-testid="tweet"]',
  'div[data-testid="tweet"]',
  '.tweet-container'
];

for (const selector of selectors) {
  const element = await page.$(selector);
  if (element) return element;
}
```

### Rate Limited
```javascript
// Increase delays
const DELAY_MIN = 5000; // 5 seconds
const DELAY_MAX = 10000; // 10 seconds

// Use proxies
const proxyServer = 'http://proxy.example.com:8080';
await browser.newContext({ proxy: { server: proxyServer } });
```

### Memory Leaks
```javascript
// Close pages after use
try {
  const page = await browser.newPage();
  await scrape(page);
} finally {
  await page.close();
}

// Restart browser periodically
if (requestCount % 100 === 0) {
  await browser.close();
  browser = await chromium.launch();
}
```

## Performance Metrics

### Expected Performance
- Twitter profile: 2-5 seconds
- Twitter tweets (100): 10-20 seconds
- Reddit subreddit (50 posts): 5-10 seconds
- Multi-platform aggregation: 30-60 seconds

### Optimization Tips
- Use browser instance pooling
- Cache repeated requests
- Scrape incrementally
- Parallelize independent requests
- Use lightweight selectors

## Roadmap

### v1.1
- Instagram scraper
- LinkedIn scraper
- Proxy rotation system
- Advanced fingerprinting

### v1.2
- Machine learning for selector adaptation
- Distributed scraping
- Real-time streaming
- GraphQL API support

### v2.0
- Cloud deployment templates
- Kubernetes orchestration
- Advanced analytics
- Commercial support

## Contributing
Contributions welcome! Please follow the contribution guidelines and submit pull requests.

## License
MIT License - See LICENSE file for details

## Disclaimer
This skill is for educational and research purposes. Users are responsible for complying with applicable laws and terms of service. Web scraping may violate terms of service of target websites. Use responsibly and ethically.

## Support
- Documentation: See `/docs` directory
- Issues: GitHub Issues
- Community: Discord/Slack channel
- Email: support@example.com
