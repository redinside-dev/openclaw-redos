# Best Practices for Web Scraping

## Legal and Ethical Considerations

### 1. Review Terms of Service
- Always read and understand the target website's Terms of Service
- Some websites explicitly prohibit automated access
- Commercial use may have different restrictions than personal use
- Consider the legal jurisdiction and applicable laws

### 2. Respect robots.txt
```javascript
const robotsParser = require('robots-parser');

async function checkRobots(url) {
  const robotsUrl = new URL('/robots.txt', url).href;
  const response = await fetch(robotsUrl);
  const robotsTxt = await response.text();
  
  const robots = robotsParser(robotsUrl, robotsTxt);
  return robots.isAllowed(url, 'MyBot/1.0');
}
```

### 3. Rate Limiting
- Implement delays between requests (minimum 1-2 seconds)
- Respect HTTP 429 (Too Many Requests) responses
- Use exponential backoff on errors
- Don't overwhelm small websites

### 4. User Agent Identification
```javascript
// Identify your bot honestly
const userAgent = 'MyBot/1.0 (+https://mywebsite.com/bot-info)';

// Or use standard browser user agents for stealth
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
```

### 5. Data Privacy
- Don't scrape personal information without consent
- Comply with GDPR, CCPA, and other privacy regulations
- Implement data retention policies
- Secure scraped data appropriately

## Technical Best Practices

### 1. Resilient Selectors

Use multiple fallback selectors:
```javascript
const selectorStrategies = [
  // ID selector (most specific)
  '#tweet-content',
  
  // Data attributes
  '[data-testid="tweet-text"]',
  
  // Class names (may change)
  '.tweet-body',
  
  // Semantic HTML
  'article p',
  
  // XPath (last resort)
  '//div[@class="tweet"]//p'
];

async function findElement(page) {
  for (const selector of selectorStrategies) {
    const element = await page.$(selector);
    if (element) return element;
  }
  throw new Error('Element not found with any selector');
}
```

### 2. Error Handling

Implement comprehensive error handling:
```javascript
class ScraperError extends Error {
  constructor(message, type, context) {
    super(message);
    this.type = type;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

async function safelyroaming(fn, context = {}) {
  try {
    return await fn();
  } catch (error) {
    if (error.message.includes('timeout')) {
      throw new ScraperError(
        'Request timeout',
        'TIMEOUT',
        { ...context, originalError: error.message }
      );
    } else if (error.message.includes('network')) {
      throw new ScraperError(
        'Network error',
        'NETWORK',
        { ...context, originalError: error.message }
      );
    } else if (error.message.includes('selector')) {
      throw new ScraperError(
        'Element not found',
        'SELECTOR',
        { ...context, originalError: error.message }
      );
    } else {
      throw new ScraperError(
        'Unknown error',
        'UNKNOWN',
        { ...context, originalError: error.message }
      );
    }
  }
}
```

### 3. Logging

Implement structured logging:
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Usage
logger.info('Scraping started', {
  platform: 'twitter',
  username: 'elonmusk',
  timestamp: Date.now()
});

logger.error('Scraping failed', {
  platform: 'twitter',
  username: 'elonmusk',
  error: error.message,
  stack: error.stack
});
```

### 4. Data Validation

Validate scraped data:
```javascript
const Joi = require('joi');

const tweetSchema = Joi.object({
  id: Joi.string().required(),
  text: Joi.string().required(),
  author: Joi.string().required(),
  timestamp: Joi.date().iso().required(),
  metrics: Joi.object({
    likes: Joi.number().integer().min(0),
    retweets: Joi.number().integer().min(0),
    replies: Joi.number().integer().min(0)
  })
});

function validateTweet(tweet) {
  const { error, value } = tweetSchema.validate(tweet);
  if (error) {
    logger.warn('Invalid tweet data', { error: error.message, tweet });
    return null;
  }
  return value;
}
```

### 5. Resource Management

Properly manage browser resources:
```javascript
class BrowserManager {
  constructor() {
    this.browser = null;
    this.contexts = new Set();
  }
  
  async init() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
  }
  
  async createContext() {
    await this.init();
    const context = await this.browser.newContext();
    this.contexts.add(context);
    return context;
  }
  
  async closeContext(context) {
    await context.close();
    this.contexts.delete(context);
  }
  
  async cleanup() {
    for (const context of this.contexts) {
      await context.close();
    }
    this.contexts.clear();
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Use with try/finally
const manager = new BrowserManager();
try {
  const context = await manager.createContext();
  const page = await context.newPage();
  await scrape(page);
} finally {
  await manager.cleanup();
}
```

## Performance Best Practices

### 1. Parallel Scraping

Scrape multiple targets in parallel:
```javascript
async function scrapeMultiple(targets, concurrency = 3) {
  const results = [];
  const queue = [...targets];
  
  async function worker() {
    while (queue.length > 0) {
      const target = queue.shift();
      if (!target) break;
      
      try {
        const result = await scrape(target);
        results.push(result);
      } catch (error) {
        logger.error('Scraping failed', { target, error: error.message });
      }
    }
  }
  
  // Run workers in parallel
  await Promise.all(
    Array.from({ length: concurrency }, () => worker())
  );
  
  return results;
}
```

### 2. Request Optimization

Optimize network requests:
```javascript
async function optimizedScrape(page, url) {
  // Block unnecessary resources
  await page.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
      route.abort();
    } else {
      route.continue();
    }
  });
  
  // Set faster timeout
  await page.goto(url, {
    waitUntil: 'domcontentloaded',
    timeout: 15000
  });
}
```

### 3. Memory Management

Prevent memory leaks:
```javascript
class MemoryAwareScraper {
  constructor(maxMemoryMB = 512) {
    this.maxMemoryMB = maxMemoryMB;
    this.checkInterval = 60000; // Check every minute
    this.startMonitoring();
  }
  
  startMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();
      const usedMB = usage.heapUsed / 1024 / 1024;
      
      if (usedMB > this.maxMemoryMB) {
        logger.warn('High memory usage', { usedMB, maxMB: this.maxMemoryMB });
        
        if (global.gc) {
          global.gc();
          logger.info('Forced garbage collection');
        }
      }
    }, this.checkInterval);
  }
}

// Run Node.js with --expose-gc flag
// node --expose-gc scraper.js
```

## Security Best Practices

### 1. Credential Management

Never hardcode credentials:
```javascript
// Bad
const apiKey = 'abc123';

// Good - use environment variables
const apiKey = process.env.API_KEY;

// Better - use secrets manager
const AWS = require('aws-sdk');
async function getSecret(secretName) {
  const client = new AWS.SecretsManager();
  const data = await client.getSecretValue({ SecretId: secretName }).promise();
  return JSON.parse(data.SecretString);
}
```

### 2. Input Sanitization

Sanitize all inputs:
```javascript
const validator = require('validator');

function sanitizeUsername(username) {
  // Remove dangerous characters
  const sanitized = validator.escape(username);
  
  // Validate format
  if (!/^[a-zA-Z0-9_]{1,15}$/.test(sanitized)) {
    throw new Error('Invalid username format');
  }
  
  return sanitized;
}
```

### 3. Secure Data Storage

Encrypt sensitive data:
```javascript
const crypto = require('crypto');

class SecureStorage {
  constructor(encryptionKey) {
    this.algorithm = 'aes-256-gcm';
    this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
  }
  
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  decrypt(encrypted, iv, authTag) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

## Maintenance Best Practices

### 1. Version Control

Use semantic versioning:
```json
{
  "version": "1.2.3",
  "changelog": {
    "1.2.3": "Fixed selector for Twitter profile scraping",
    "1.2.2": "Added retry logic for rate limiting",
    "1.2.0": "Added Reddit scraper support"
  }
}
```

### 2. Automated Testing

Implement continuous testing:
```javascript
// test/integration.test.js
describe('Twitter Scraper Integration Tests', () => {
  let scraper;
  
  beforeEach(async () => {
    scraper = new TwitterScraper({ headless: true });
  });
  
  afterEach(async () => {
    await scraper.close();
  });
  
  test('should scrape profile successfully', async () => {
    const profile = await scraper.scrapeProfile('elonmusk');
    expect(profile).toHaveProperty('username');
    expect(profile).toHaveProperty('name');
    expect(profile.username).toBe('elonmusk');
  });
  
  test('should handle invalid username gracefully', async () => {
    await expect(
      scraper.scrapeProfile('invalid_user_12345_does_not_exist')
    ).rejects.toThrow();
  });
});
```

### 3. Monitoring and Alerts

Set up monitoring:
```javascript
const alerting = require('./alerting');

class MonitoredScraper {
  constructor(scraper) {
    this.scraper = scraper;
    this.metrics = {
      successCount: 0,
      errorCount: 0,
      avgDuration: 0
    };
  }
  
  async scrape(target) {
    const startTime = Date.now();
    
    try {
      const result = await this.scraper.scrape(target);
      this.metrics.successCount++;
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      
      // Alert on high error rate
      const errorRate = this.metrics.errorCount / 
        (this.metrics.successCount + this.metrics.errorCount);
      
      if (errorRate > 0.5) {
        await alerting.send({
          level: 'critical',
          message: 'High scraper error rate',
          errorRate,
          metrics: this.metrics
        });
      }
      
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      this.metrics.avgDuration = 
        (this.metrics.avgDuration + duration) / 2;
    }
  }
}
```

### 4. Documentation

Maintain comprehensive documentation:
```javascript
/**
 * Scrapes tweets from a Twitter user's profile.
 * 
 * @param {string} username - Twitter username without @ symbol
 * @param {Object} options - Scraping options
 * @param {number} [options.limit=50] - Maximum number of tweets to scrape
 * @param {boolean} [options.includeReplies=false] - Include reply tweets
 * @param {boolean} [options.includeRetweets=false] - Include retweets
 * 
 * @returns {Promise<Array<Tweet>>} Array of scraped tweets
 * 
 * @throws {ScraperError} If scraping fails
 * 
 * @example
 * const tweets = await scraper.scrapeTweets('elonmusk', {
 *   limit: 100,
 *   includeReplies: false
 * });
 */
async function scrapeTweets(username, options = {}) {
  // Implementation
}
```

## Anti-Pattern Avoidance

### Don't: Use hardcoded selectors
```javascript
// Bad
const tweet = await page.$('.tweet-content');

// Good
const selectorStrategies = [
  '[data-testid="tweet-text"]',
  '.tweet-content',
  'article p'
];
```

### Don't: Ignore rate limits
```javascript
// Bad
for (const user of users) {
  await scrape(user); // Immediate requests
}

// Good
for (const user of users) {
  await scrape(user);
  await delay(2000, 5000); // Random delay
}
```

### Don't: Leak resources
```javascript
// Bad
const page = await browser.newPage();
await scrape(page);
// Page never closed!

// Good
const page = await browser.newPage();
try {
  await scrape(page);
} finally {
  await page.close();
}
```

### Don't: Scrape more than needed
```javascript
// Bad
const allTweets = await scrapeAllTweets(user); // Thousands of tweets

// Good
const recentTweets = await scrapeTweets(user, { limit: 100 });
```

## Conclusion

Following these best practices will help you build:
- **Reliable** scrapers that handle errors gracefully
- **Efficient** scrapers that use resources wisely
- **Maintainable** scrapers that are easy to update
- **Ethical** scrapers that respect websites and users
- **Scalable** scrapers that can grow with your needs

Remember: Web scraping is a powerful tool, but with great power comes great responsibility. Always scrape ethically and legally.
