const { chromium } = require('playwright');
require('dotenv').config();

class TwitterScraper {
  constructor(config = {}) {
    this.config = {
      headless: config.headless !== false,
      stealth: config.stealth !== false,
      timeout: config.timeout || 30000,
      delayMin: config.delayMin || 2000,
      delayMax: config.delayMax || 5000,
      maxRetries: config.maxRetries || 3
    };
    this.browser = null;
    this.context = null;
  }

  async init() {
    if (this.browser) return;

    this.browser = await chromium.launch({
      headless: this.config.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox'
      ]
    });

    this.context = await this.browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: this.getRandomViewport(),
      locale: 'en-US',
      timezoneId: 'America/New_York'
    });

    // Stealth mode
    if (this.config.stealth) {
      await this.context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        window.chrome = { runtime: {} };
      });
    }
  }

  async close() {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
    this.browser = null;
    this.context = null;
  }

  async scrapeProfile(username) {
    await this.init();
    const page = await this.context.newPage();

    try {
      const url = `https://twitter.com/${username}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: this.config.timeout });
      await this.delay(this.config.delayMin, this.config.delayMax);

      // Extract profile data
      const profile = await page.evaluate(() => {
        const getTextContent = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.textContent.trim() : null;
        };

        const getAttributeContent = (selector, attr) => {
          const el = document.querySelector(selector);
          return el ? el.getAttribute(attr) : null;
        };

        // Multiple selector strategies for resilience
        const nameSelectors = [
          '[data-testid="UserName"] span',
          'div[dir="ltr"] span',
          'h2 span'
        ];

        const bioSelectors = [
          '[data-testid="UserDescription"]',
          'div[dir="auto"][lang]'
        ];

        let name = null;
        for (const selector of nameSelectors) {
          name = getTextContent(selector);
          if (name) break;
        }

        let bio = null;
        for (const selector of bioSelectors) {
          bio = getTextContent(selector);
          if (bio) break;
        }

        // Extract stats
        const stats = {};
        const links = Array.from(document.querySelectorAll('a[href*="/"]'));
        links.forEach(link => {
          const text = link.textContent.trim();
          const href = link.getAttribute('href');
          
          if (href && href.includes('/following')) {
            const match = text.match(/[\d,]+/);
            if (match) stats.following = parseInt(match[0].replace(/,/g, ''));
          }
          if (href && href.includes('/verified_followers')) {
            const match = text.match(/[\d,]+/);
            if (match) stats.followers = parseInt(match[0].replace(/,/g, ''));
          }
        });

        return {
          name,
          bio,
          stats,
          url: window.location.href,
          scrapedAt: new Date().toISOString()
        };
      });

      profile.username = username;
      return profile;

    } catch (error) {
      console.error(`Error scraping profile ${username}:`, error.message);
      throw error;
    } finally {
      await page.close();
    }
  }

  async scrapeTweets(username, options = {}) {
    await this.init();
    const page = await this.context.newPage();

    try {
      const limit = options.limit || 50;
      const url = `https://twitter.com/${username}`;
      
      await page.goto(url, { waitUntil: 'networkidle', timeout: this.config.timeout });
      await this.delay(this.config.delayMin, this.config.delayMax);

      const tweets = [];
      let scrollAttempts = 0;
      const maxScrolls = Math.ceil(limit / 10);

      while (tweets.length < limit && scrollAttempts < maxScrolls) {
        // Extract tweets from current view
        const newTweets = await page.evaluate(() => {
          const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');
          const extracted = [];

          tweetElements.forEach(article => {
            const getTextContent = (selector) => {
              const el = article.querySelector(selector);
              return el ? el.textContent.trim() : null;
            };

            const text = getTextContent('[data-testid="tweetText"]');
            const time = article.querySelector('time');
            const timestamp = time ? time.getAttribute('datetime') : null;
            
            // Extract engagement metrics
            const metrics = {};
            const buttons = article.querySelectorAll('[role="button"]');
            buttons.forEach(btn => {
              const ariaLabel = btn.getAttribute('aria-label');
              if (ariaLabel) {
                if (ariaLabel.includes('reply')) {
                  const match = ariaLabel.match(/(\d+)/);
                  if (match) metrics.replies = parseInt(match[1]);
                }
                if (ariaLabel.includes('retweet')) {
                  const match = ariaLabel.match(/(\d+)/);
                  if (match) metrics.retweets = parseInt(match[1]);
                }
                if (ariaLabel.includes('like')) {
                  const match = ariaLabel.match(/(\d+)/);
                  if (match) metrics.likes = parseInt(match[1]);
                }
              }
            });

            if (text) {
              extracted.push({
                text,
                timestamp,
                metrics,
                id: timestamp // Use timestamp as pseudo-ID
              });
            }
          });

          return extracted;
        });

        // Add unique tweets
        newTweets.forEach(tweet => {
          if (!tweets.find(t => t.id === tweet.id) && tweets.length < limit) {
            tweets.push(tweet);
          }
        });

        // Scroll down
        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await this.delay(1000, 2000);
        scrollAttempts++;
      }

      return tweets.slice(0, limit);

    } catch (error) {
      console.error(`Error scraping tweets for ${username}:`, error.message);
      throw error;
    } finally {
      await page.close();
    }
  }

  async scrapeWithMonitoring(usernames, options = {}) {
    const interval = options.interval || 900000; // 15 minutes
    const autoDiscover = options.autoDiscover || false;

    const monitor = async () => {
      for (const username of usernames) {
        try {
          const profile = await this.scrapeProfile(username);
          const tweets = await this.scrapeTweets(username, { limit: 20 });
          
          console.log(`Scraped ${username}: ${tweets.length} tweets`);
          
          // Auto-discover new targets
          if (autoDiscover) {
            const mentions = tweets
              .flatMap(t => (t.text.match(/@(\w+)/g) || []))
              .map(m => m.slice(1))
              .filter(u => !usernames.includes(u));
            
            if (mentions.length > 0) {
              console.log(`Discovered new targets: ${mentions.slice(0, 5).join(', ')}`);
            }
          }

          await this.delay(this.config.delayMin, this.config.delayMax);
        } catch (error) {
          console.error(`Error monitoring ${username}:`, error.message);
        }
      }
    };

    // Initial run
    await monitor();

    // Schedule periodic runs
    const intervalId = setInterval(monitor, interval);
    
    return {
      stop: () => clearInterval(intervalId)
    };
  }

  async healthCheck() {
    try {
      await this.init();
      const page = await this.context.newPage();
      await page.goto('https://twitter.com', { timeout: 10000 });
      await page.close();
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }

  getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  getRandomViewport() {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 },
      { width: 1440, height: 900 },
      { width: 1280, height: 720 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
  }

  delay(min, max) {
    const ms = min + Math.random() * (max - min);
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { TwitterScraper };
