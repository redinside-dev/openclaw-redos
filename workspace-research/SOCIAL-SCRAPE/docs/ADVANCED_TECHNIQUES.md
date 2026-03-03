# Advanced Web Scraping Techniques

## Browser Automation with OpenClaw

### Using Browser Relay (Chrome Extension Mode)

OpenClaw's Browser Relay allows you to control your existing Chrome browser tabs:

```javascript
const { proxy_browser } = require('openclaw');

// Attach to existing Chrome tab via Browser Relay
await proxy_browser({
  action: 'open',
  profile: 'chrome', // Use Chrome extension relay
  url: 'https://twitter.com/elonmusk'
});

// Take snapshot with references
const snapshot = await proxy_browser({
  action: 'snapshot',
  profile: 'chrome',
  refs: 'aria' // Stable aria-ref ids
});

// Interact with elements
await proxy_browser({
  action: 'act',
  profile: 'chrome',
  request: {
    kind: 'click',
    ref: 'button[name="Follow"]'
  }
});
```

### Stealth Techniques

#### 1. Fingerprint Randomization

```javascript
const fingerprints = {
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
  ],
  
  viewports: [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 }
  ],
  
  timezones: [
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Asia/Tokyo'
  ]
};

// Apply random fingerprint
const context = await browser.newContext({
  userAgent: randomChoice(fingerprints.userAgents),
  viewport: randomChoice(fingerprints.viewports),
  timezoneId: randomChoice(fingerprints.timezones),
  locale: 'en-US',
  colorScheme: 'light'
});
```

#### 2. Behavioral Mimicry

```javascript
async function humanLikeScroll(page) {
  const scrollSteps = 5 + Math.floor(Math.random() * 10);
  
  for (let i = 0; i < scrollSteps; i++) {
    const scrollAmount = 200 + Math.random() * 300;
    await page.evaluate((amount) => {
      window.scrollBy({
        top: amount,
        behavior: 'smooth'
      });
    }, scrollAmount);
    
    // Random pause between scrolls
    await delay(500 + Math.random() * 1500);
  }
}

async function humanLikeMouseMovement(page, element) {
  const box = await element.boundingBox();
  if (!box) return;
  
  // Move to random position near element
  const targetX = box.x + box.width / 2 + (Math.random() - 0.5) * 20;
  const targetY = box.y + box.height / 2 + (Math.random() - 0.5) * 20;
  
  await page.mouse.move(targetX, targetY, { steps: 10 });
  await delay(100 + Math.random() * 200);
}
```

#### 3. Anti-Detection Script Injection

```javascript
await context.addInitScript(() => {
  // Override webdriver flag
  Object.defineProperty(navigator, 'webdriver', {
    get: () => false
  });
  
  // Add chrome runtime
  window.chrome = {
    runtime: {},
    loadTimes: function() {},
    csi: function() {},
    app: {}
  };
  
  // Override plugins
  Object.defineProperty(navigator, 'plugins', {
    get: () => [1, 2, 3, 4, 5]
  });
  
  // Override languages
  Object.defineProperty(navigator, 'languages', {
    get: () => ['en-US', 'en']
  });
  
  // Remove automation indicators
  delete window.navigator.__proto__.webdriver;
});
```

## API-less Scraping Strategies

### 1. Direct HTML Parsing

```javascript
async function scrapeWithoutAPI(url) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  
  // Extract data from DOM
  const data = await page.evaluate(() => {
    const items = [];
    
    document.querySelectorAll('.post').forEach(post => {
      items.push({
        title: post.querySelector('h2')?.textContent?.trim(),
        author: post.querySelector('.author')?.textContent?.trim(),
        timestamp: post.querySelector('time')?.getAttribute('datetime'),
        content: post.querySelector('.content')?.textContent?.trim()
      });
    });
    
    return items;
  });
  
  return data;
}
```

### 2. XHR/Fetch Interception

```javascript
async function interceptAPIRequests(page) {
  const requests = [];
  
  await page.route('**/*', (route) => {
    const request = route.request();
    const url = request.url();
    
    // Intercept GraphQL/API requests
    if (url.includes('graphql') || url.includes('api')) {
      requests.push({
        url,
        method: request.method(),
        headers: request.headers(),
        postData: request.postData()
      });
    }
    
    route.continue();
  });
  
  await page.goto('https://example.com');
  
  // Analyze intercepted requests
  return requests;
}
```

### 3. Local Storage/Session Extraction

```javascript
async function extractSessionData(page) {
  const sessionData = await page.evaluate(() => {
    return {
      localStorage: { ...localStorage },
      sessionStorage: { ...sessionStorage },
      cookies: document.cookie
    };
  });
  
  return sessionData;
}
```

## Rate Limit Bypassing

### 1. Intelligent Delay Patterns

```javascript
class RateLimiter {
  constructor() {
    this.requestTimes = [];
    this.maxRequests = 60; // per window
    this.windowMs = 60000; // 1 minute
  }
  
  async waitIfNeeded() {
    const now = Date.now();
    
    // Remove old requests outside window
    this.requestTimes = this.requestTimes.filter(
      time => now - time < this.windowMs
    );
    
    // Check if at limit
    if (this.requestTimes.length >= this.maxRequests) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        console.log(`Rate limit reached, waiting ${waitTime}ms`);
        await delay(waitTime);
      }
    }
    
    this.requestTimes.push(now);
  }
  
  async execute(fn) {
    await this.waitIfNeeded();
    return await fn();
  }
}
```

### 2. Request Distribution

```javascript
class RequestDistributor {
  constructor(intervalMs = 60000) {
    this.intervalMs = intervalMs;
    this.queue = [];
    this.isProcessing = false;
  }
  
  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }
  
  async process() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const { fn, resolve, reject } = this.queue.shift();
      
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
      
      // Evenly distribute requests
      if (this.queue.length > 0) {
        const delay = this.intervalMs / this.queue.length;
        await new Promise(r => setTimeout(r, delay));
      }
    }
    
    this.isProcessing = false;
  }
}
```

### 3. Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000;
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
  }
  
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
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
    
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successes = 0;
      }
    }
  }
  
  onFailure() {
    this.failures++;
    this.successes = 0;
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

## Cost Optimization

### 1. Browser Instance Pooling

```javascript
class BrowserPool {
  constructor(maxSize = 5) {
    this.maxSize = maxSize;
    this.available = [];
    this.inUse = new Set();
  }
  
  async acquire() {
    // Reuse available browser
    if (this.available.length > 0) {
      const browser = this.available.pop();
      this.inUse.add(browser);
      return browser;
    }
    
    // Create new browser if under limit
    if (this.inUse.size < this.maxSize) {
      const browser = await chromium.launch({ headless: true });
      this.inUse.add(browser);
      return browser;
    }
    
    // Wait for available browser
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.available.length > 0) {
          clearInterval(checkInterval);
          const browser = this.available.pop();
          this.inUse.add(browser);
          resolve(browser);
        }
      }, 100);
    });
  }
  
  async release(browser) {
    this.inUse.delete(browser);
    
    // Close pages but keep browser
    const contexts = browser.contexts();
    for (const context of contexts) {
      await context.close();
    }
    
    this.available.push(browser);
  }
  
  async closeAll() {
    for (const browser of this.available) {
      await browser.close();
    }
    for (const browser of this.inUse) {
      await browser.close();
    }
    this.available = [];
    this.inUse.clear();
  }
}
```

### 2. Incremental Scraping

```javascript
class IncrementalScraper {
  constructor(stateFile = './scraper-state.json') {
    this.stateFile = stateFile;
    this.state = {};
  }
  
  async loadState() {
    try {
      const data = await fs.readFile(this.stateFile, 'utf-8');
      this.state = JSON.parse(data);
    } catch (error) {
      this.state = {};
    }
  }
  
  async saveState() {
    await fs.writeFile(
      this.stateFile,
      JSON.stringify(this.state, null, 2)
    );
  }
  
  async scrapeIncremental(target, scrapeFn) {
    await this.loadState();
    
    const lastId = this.state[target] || 0;
    const newData = await scrapeFn(lastId);
    
    if (newData.length > 0) {
      const maxId = Math.max(...newData.map(item => item.id));
      this.state[target] = maxId;
      await this.saveState();
    }
    
    return newData;
  }
}
```

### 3. Caching Strategy

```javascript
class ScraperCache {
  constructor(ttl = 3600000) {
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  key(url, params) {
    return `${url}:${JSON.stringify(params)}`;
  }
  
  get(url, params) {
    const k = this.key(url, params);
    const entry = this.cache.get(k);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(k);
      return null;
    }
    
    return entry.data;
  }
  
  set(url, params, data) {
    const k = this.key(url, params);
    this.cache.set(k, {
      data,
      timestamp: Date.now()
    });
  }
  
  clear() {
    this.cache.clear();
  }
}
```

## Self-Evolving Monitoring

### 1. Target Discovery

```javascript
class TargetDiscovery {
  constructor() {
    this.targets = new Set();
    this.relationships = new Map();
  }
  
  async discoverFromSocialGraph(username, platform) {
    // Discover from followers
    const followers = await this.getTopFollowers(username, platform);
    followers.forEach(f => this.addTarget(f, platform));
    
    // Discover from mentions
    const mentions = await this.getMentions(username, platform);
    mentions.forEach(m => this.addTarget(m, platform));
    
    // Track relationships
    this.relationships.set(username, {
      followers: followers.map(f => f.username),
      mentions: mentions.map(m => m.username)
    });
  }
  
  async discoverFromContent(content, platform) {
    // Extract entities
    const hashtags = content.match(/#\w+/g) || [];
    const usernames = content.match(/@\w+/g) || [];
    const urls = content.match(/https?:\/\/[^\s]+/g) || [];
    
    // Add discovered targets
    usernames.forEach(u => this.addTarget(u.slice(1), platform));
    
    return {
      hashtags: hashtags.map(h => h.slice(1)),
      usernames: usernames.map(u => u.slice(1)),
      urls
    };
  }
  
  addTarget(username, platform) {
    this.targets.add(`${platform}:${username}`);
  }
  
  getTargets() {
    return Array.from(this.targets);
  }
}
```

### 2. Adaptive Scheduling

```javascript
class AdaptiveScheduler {
  constructor() {
    this.schedule = new Map();
    this.metrics = new Map();
  }
  
  async updateSchedule(target, activity) {
    const metrics = this.metrics.get(target) || {
      avgActivity: 0,
      lastUpdate: Date.now(),
      updateCount: 0
    };
    
    // Calculate new average activity
    metrics.avgActivity = 
      (metrics.avgActivity * metrics.updateCount + activity) / 
      (metrics.updateCount + 1);
    metrics.updateCount++;
    metrics.lastUpdate = Date.now();
    
    this.metrics.set(target, metrics);
    
    // Adjust interval based on activity
    let interval;
    if (metrics.avgActivity > 10) {
      interval = 5 * 60 * 1000; // 5 minutes for high activity
    } else if (metrics.avgActivity > 5) {
      interval = 15 * 60 * 1000; // 15 minutes for medium
    } else {
      interval = 60 * 60 * 1000; // 60 minutes for low activity
    }
    
    this.schedule.set(target, interval);
    
    return interval;
  }
  
  getInterval(target) {
    return this.schedule.get(target) || 15 * 60 * 1000;
  }
}
```

### 3. Anomaly Detection

```javascript
class AnomalyDetector {
  constructor(windowSize = 10) {
    this.windowSize = windowSize;
    this.history = new Map();
  }
  
  async checkAnomaly(target, value) {
    const history = this.history.get(target) || [];
    
    // Add new value
    history.push(value);
    if (history.length > this.windowSize) {
      history.shift();
    }
    this.history.set(target, history);
    
    if (history.length < 3) return null;
    
    // Calculate statistics
    const mean = history.reduce((a, b) => a + b) / history.length;
    const variance = history.reduce((sum, val) => 
      sum + Math.pow(val - mean, 2), 0) / history.length;
    const stdDev = Math.sqrt(variance);
    
    // Check for anomaly (value > 2 std devs from mean)
    const zScore = Math.abs((value - mean) / stdDev);
    
    if (zScore > 2) {
      return {
        type: value > mean ? 'spike' : 'drop',
        value,
        mean,
        stdDev,
        zScore
      };
    }
    
    return null;
  }
}
```

## Production Deployment

### Crontab Setup

```bash
# Edit crontab
crontab -e

# Add scraping jobs
*/15 * * * * cd /path/to/SOCIAL-SCRAPE && /usr/bin/node schedulers/twitter-cron.js >> logs/twitter-cron.log 2>&1
*/30 * * * * cd /path/to/SOCIAL-SCRAPE && /usr/bin/node schedulers/reddit-cron.js >> logs/reddit-cron.log 2>&1
0 * * * * cd /path/to/SOCIAL-SCRAPE && /usr/bin/node schedulers/health-check.js >> logs/health.log 2>&1
```

### Systemd Service

```ini
[Unit]
Description=Social Media Scraper Background Collector
After=network.target

[Service]
Type=simple
User=scraper
WorkingDirectory=/opt/social-scrape
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node examples/background-collector.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/social-scrape/collector.log
StandardError=append:/var/log/social-scrape/collector-error.log

[Install]
WantedBy=multi-user.target
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Install Playwright browsers
RUN npx playwright install-deps
RUN npx playwright install chromium

# Copy application
COPY . .

# Create data directory
RUN mkdir -p /app/data /app/logs

# Run as non-root
RUN addgroup -g 1001 scraper && \
    adduser -D -u 1001 -G scraper scraper && \
    chown -R scraper:scraper /app

USER scraper

CMD ["node", "examples/background-collector.js"]
```

