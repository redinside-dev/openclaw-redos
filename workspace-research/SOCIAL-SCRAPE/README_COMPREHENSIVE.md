# SOCIAL-SCRAPE - Comprehensive Web Scraping Skill

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Install browser
npx playwright install chromium

# Run example
node examples/twitter-profile-scraper.js
```

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Examples](#examples)
- [Deployment](#deployment)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

SOCIAL-SCRAPE is a production-ready web scraping skill for social media platforms. It provides comprehensive tools for scraping Twitter/X, Reddit, and other platforms without requiring API keys. Built with stealth, resilience, and automation in mind.

### Key Highlights

- ✅ **API-less**: No authentication or API keys required
- ✅ **Stealth**: Advanced detection avoidance techniques
- ✅ **Resilient**: Comprehensive error handling and retry logic
- ✅ **Scalable**: Browser pooling and distributed scraping support
- ✅ **Automated**: Background collection with cron integration
- ✅ **Self-evolving**: Auto-discovery of new targets
- ✅ **Production-ready**: Monitoring, logging, and deployment guides

## ✨ Features

### Core Capabilities

#### Twitter/X Scraping
- Profile information (bio, stats, verification status)
- Tweet content and metadata
- Engagement metrics (likes, retweets, replies)
- Follower/following discovery
- Search and trending topics

#### Reddit Scraping
- Subreddit posts and comments
- User activity and karma
- Trend analysis
- Cross-subreddit aggregation
- Award and engagement tracking

#### Multi-Platform
- Topic-based aggregation across platforms
- Cross-platform user tracking
- Comparative analytics
- Unified data format

### Technical Features

#### Browser Automation
- Playwright integration
- OpenClaw Browser Relay support
- Chrome extension mode
- Headless and headed modes

#### Stealth Techniques
- User agent rotation
- Fingerprint randomization
- Behavioral mimicry
- Anti-detection scripts
- Request distribution

#### Rate Limit Management
- Intelligent delay patterns
- Exponential backoff
- Circuit breaker pattern
- Request deduplication

#### Cost Optimization
- Browser instance pooling
- Incremental scraping
- Request caching
- Resource management

#### Monitoring & Observability
- Health checks
- Performance metrics
- Error tracking
- Auto-discovery logs

## 📦 Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- 4GB RAM minimum
- 10GB disk space

### Basic Installation

```bash
# Clone repository
git clone <repo-url>
cd SOCIAL-SCRAPE

# Install dependencies
npm install

# Set up environment
cp .env.example .env
nano .env  # Edit configuration

# Install Playwright browsers
npx playwright install chromium

# Verify installation
npm test
```

### Docker Installation

```bash
# Build image
docker build -t social-scrape:latest .

# Run container
docker run -d \
  --name social-scrape \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  social-scrape:latest
```

## 🔧 Usage

### Quick Examples

#### Twitter Profile Scraping

```javascript
const { TwitterScraper } = require('./scrapers/twitter');

const scraper = new TwitterScraper({ headless: true, stealth: true });

// Scrape profile
const profile = await scraper.scrapeProfile('elonmusk');
console.log(profile);

// Scrape tweets
const tweets = await scraper.scrapeTweets('elonmusk', { limit: 100 });
console.log(tweets);

await scraper.close();
```

#### Reddit Subreddit Monitoring

```javascript
const { RedditScraper } = require('./scrapers/reddit');

const scraper = new RedditScraper({ headless: true, stealth: true });

// Scrape subreddit
const posts = await scraper.scrapeSubreddit('programming', {
  sort: 'hot',
  limit: 50
});

// Analyze trends
const trends = await scraper.analyzeTrends('programming', {
  timeframe: '24h',
  minScore: 100
});

await scraper.close();
```

#### Multi-Platform Aggregation

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

console.log(results);
```

#### Background Collection

```javascript
const { BackgroundCollector } = require('./collectors/background');

const collector = new BackgroundCollector({
  storage: 'filesystem',
  autoDiscover: true
});

await collector.start({
  targets: [
    { platform: 'twitter', username: 'elonmusk' },
    { platform: 'reddit', subreddit: 'programming' }
  ],
  interval: 900000 // 15 minutes
});

// Monitor status
const status = await collector.getStatus();
console.log(status);
```

### Command Line Usage

```bash
# Run Twitter scraper
npm run twitter

# Run Reddit scraper
npm run reddit

# Run multi-platform aggregator
npm run multi

# Run background collector
npm run background

# Run health check
npm run health

# Run tests
npm test
```

## 🏗️ Architecture

### Component Overview

```
SOCIAL-SCRAPE/
├── scrapers/           # Platform-specific scrapers
│   ├── twitter.js
│   ├── reddit.js
│   └── multi-platform.js
├── collectors/         # Background collection engines
│   └── background.js
├── schedulers/         # Cron job scripts
│   ├── twitter-cron.js
│   ├── reddit-cron.js
│   └── health-check.js
├── examples/           # Usage examples
├── test/               # Test suites
├── docs/               # Documentation
├── data/               # Scraped data storage
└── logs/               # Application logs
```

### Data Flow

```
Target URLs → Browser Controller → Scraper Engine → Data Pipeline → Storage
                                        ↓
                                   Validator → Monitor → Auto-Discovery
```

### Scraper Pipeline

1. **Initialization**: Browser setup, context creation, stealth configuration
2. **Navigation**: URL loading, wait strategies, anti-detection
3. **Extraction**: DOM parsing, data extraction, validation
4. **Processing**: Data transformation, deduplication, enrichment
5. **Storage**: Persistence to filesystem, database, or cloud
6. **Monitoring**: Metrics collection, health checks, alerting

## 📚 Documentation

### Complete Documentation

- [SKILL.md](SKILL.md) - Complete skill specification
- [ADVANCED_TECHNIQUES.md](docs/ADVANCED_TECHNIQUES.md) - Advanced scraping techniques
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Production deployment guide
- [BEST_PRACTICES.md](docs/BEST_PRACTICES.md) - Best practices and anti-patterns
- [TESTING.md](docs/TESTING.md) - Testing guide

### Core Concepts

#### Stealth Mode

Uses multiple techniques to avoid detection:
- User agent rotation
- Viewport randomization
- Timezone and locale variation
- Behavioral mimicry (human-like scrolling, delays)
- Anti-automation script injection

#### Rate Limiting

Intelligent rate limiting to avoid blocks:
- Random delays (2-5 seconds default)
- Exponential backoff on errors
- Request distribution across time
- Circuit breaker pattern

#### Auto-Discovery

Self-evolving target discovery:
- Extract mentions and hashtags
- Discover related profiles/subreddits
- Track relationships
- Adaptive scheduling based on activity

## 💼 Examples

### Example 1: Monitor Trending Topics

```javascript
const { MultiPlatformScraper } = require('./scrapers/multi-platform');

async function monitorTrends() {
  const scraper = new MultiPlatformScraper({ stealth: true });
  
  const topics = ['AI', 'cryptocurrency', 'climate change'];
  
  for (const topic of topics) {
    const results = await scraper.aggregateByTopic(topic, {
      platforms: ['twitter', 'reddit'],
      limit: 50
    });
    
    console.log(`\nTopic: ${topic}`);
    console.log(`Total results: ${results.aggregated.length}`);
    console.log(`Top platforms: ${Object.keys(results.platforms).join(', ')}`);
    
    // Save to file
    const fs = require('fs').promises;
    await fs.writeFile(
      `trends-${topic.replace(/\s+/g, '-')}.json`,
      JSON.stringify(results, null, 2)
    );
  }
}

monitorTrends().catch(console.error);
```

### Example 2: Influencer Analysis

```javascript
async function analyzeInfluencer(username) {
  const twitterScraper = new TwitterScraper({ stealth: true });
  
  // Get profile
  const profile = await twitterScraper.scrapeProfile(username);
  
  // Get recent tweets
  const tweets = await twitterScraper.scrapeTweets(username, { limit: 100 });
  
  // Calculate engagement metrics
  const avgLikes = tweets.reduce((sum, t) => sum + (t.metrics.likes || 0), 0) / tweets.length;
  const avgRetweets = tweets.reduce((sum, t) => sum + (t.metrics.retweets || 0), 0) / tweets.length;
  const engagementRate = (avgLikes + avgRetweets) / (profile.stats.followers || 1) * 100;
  
  return {
    username,
    followers: profile.stats.followers,
    avgLikes,
    avgRetweets,
    engagementRate: `${engagementRate.toFixed(2)}%`,
    recentTweets: tweets.slice(0, 5)
  };
}
```

### Example 3: Subreddit Comparison

```javascript
async function compareSubreddits(subreddits) {
  const redditScraper = new RedditScraper({ stealth: true });
  
  const comparison = {};
  
  for (const subreddit of subreddits) {
    const posts = await redditScraper.scrapeSubreddit(subreddit, { limit: 50 });
    const trends = await redditScraper.analyzeTrends(subreddit, { timeframe: '24h' });
    
    comparison[subreddit] = {
      totalPosts: posts.length,
      avgScore: posts.reduce((sum, p) => sum + (p.engagement?.score || 0), 0) / posts.length,
      topPost: posts[0],
      trends: trends.popularKeywords
    };
  }
  
  return comparison;
}
```

## 🚀 Deployment

### Cron Job Setup

```bash
# Edit crontab
crontab -e

# Add scraping jobs
*/15 * * * * cd /path/to/SOCIAL-SCRAPE && node schedulers/twitter-cron.js
*/30 * * * * cd /path/to/SOCIAL-SCRAPE && node schedulers/reddit-cron.js
0 * * * * cd /path/to/SOCIAL-SCRAPE && node schedulers/health-check.js
```

### Systemd Service

```bash
# Copy service file
sudo cp social-scrape.service /etc/systemd/system/

# Enable and start
sudo systemctl enable social-scrape
sudo systemctl start social-scrape

# Check status
sudo systemctl status social-scrape
```

### Docker Compose

```yaml
version: '3.8'
services:
  scraper:
    build: .
    restart: unless-stopped
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
```

```bash
docker-compose up -d
```

## 🎯 Best Practices

### DO's

✅ Use random delays between requests  
✅ Rotate user agents  
✅ Implement comprehensive error handling  
✅ Validate scraped data  
✅ Monitor scraper health  
✅ Respect robots.txt  
✅ Use caching when appropriate  
✅ Clean up browser resources  

### DON'Ts

❌ Don't overwhelm servers with requests  
❌ Don't ignore rate limit responses  
❌ Don't hardcode selectors without fallbacks  
❌ Don't leak browser instances  
❌ Don't scrape more data than needed  
❌ Don't ignore errors silently  
❌ Don't violate terms of service  

## 🔍 Troubleshooting

### Common Issues

#### Playwright Installation Issues

```bash
# Install dependencies
npx playwright install-deps

# Install specific browser
npx playwright install chromium
```

#### Memory Issues

```javascript
// Limit browser instances
const pool = new BrowserPool(3);

// Enable garbage collection
// Run with: node --expose-gc scraper.js
if (global.gc) global.gc();
```

#### Selector Failures

```javascript
// Use multiple fallback selectors
const selectors = [
  '[data-testid="tweet"]',
  '.tweet-container',
  'article[role="article"]'
];
```

#### Rate Limiting

```javascript
// Increase delays
const DELAY_MIN = 5000;  // 5 seconds
const DELAY_MAX = 10000; // 10 seconds
```

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Follow existing code style
5. Submit a pull request

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for educational and research purposes only. Users are responsible for complying with applicable laws and terms of service. Web scraping may violate terms of service of target websites. Use responsibly and ethically.

Always:
- Review and respect terms of service
- Implement appropriate rate limiting
- Respect robots.txt
- Don't overload servers
- Consider privacy implications
- Comply with applicable laws (GDPR, CCPA, etc.)

## 📞 Support

- **Documentation**: See `/docs` directory
- **Issues**: GitHub Issues
- **Examples**: See `/examples` directory
- **Tests**: Run `npm test`

## 🔄 Versioning

Current version: **1.0.0**

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

## 🙏 Acknowledgments

- Playwright team for excellent browser automation
- OpenClaw for browser relay functionality
- Open source community for inspiration

---

**Happy Scraping! 🕷️**

Remember to scrape responsibly and ethically. Always respect website terms of service and rate limits.
