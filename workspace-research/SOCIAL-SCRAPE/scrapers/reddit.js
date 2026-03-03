const { chromium } = require('playwright');
require('dotenv').config();

class RedditScraper {
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

  async scrapeSubreddit(subreddit, options = {}) {
    await this.init();
    const page = await this.context.newPage();

    try {
      const sort = options.sort || 'hot';
      const limit = options.limit || 50;
      const url = `https://www.reddit.com/r/${subreddit}/${sort}`;

      await page.goto(url, { waitUntil: 'networkidle', timeout: this.config.timeout });
      await this.delay(this.config.delayMin, this.config.delayMax);

      const posts = [];
      let scrollAttempts = 0;
      const maxScrolls = Math.ceil(limit / 10);

      while (posts.length < limit && scrollAttempts < maxScrolls) {
        const newPosts = await page.evaluate(() => {
          const postElements = document.querySelectorAll('div[data-testid="post-container"]');
          const extracted = [];

          postElements.forEach(post => {
            const getTextContent = (selector) => {
              const el = post.querySelector(selector);
              return el ? el.textContent.trim() : null;
            };

            const getAttributeContent = (selector, attr) => {
              const el = post.querySelector(selector);
              return el ? el.getAttribute(attr) : null;
            };

            const title = getTextContent('h3[data-testid="post-title"]');
            const score = getTextContent('span[data-testid="post-score"]');
            const author = getTextContent('a[href*="/user/"]');
            const subreddit = getTextContent('a[href*="/r/"]');
            const time = getTextContent('time');
            const comments = getTextContent('a[href*="/comments/"]');
            const awards = Array.from(post.querySelectorAll('span[aria-label*="award"]'))
              .map(award => award.textContent.trim())
              .filter(text => text);

            if (title) {
              const engagement = {};
              const scoreMatch = score ? score.match(/(\d+(?:[.,]\d+)?)/) : null;
              if (scoreMatch) engagement.score = parseFloat(scoreMatch[1].replace(/,/g, ''));

              const commentsMatch = comments ? comments.match(/(\d+(?:[.,]\d+)?)/) : null;
              if (commentsMatch) engagement.comments = parseInt(commentsMatch[1].replace(/,/g, ''));

              extracted.push({
                title,
                engagement,
                author,
                subreddit,
                time,
                awards,
                id: getAttributeContent('div[data-testid="post-container"]', 'data-fullname')
              });
            }
          });

          return extracted;
        });

        newPosts.forEach(post => {
          if (!posts.find(p => p.id === post.id) && posts.length < limit) {
            posts.push(post);
          }
        });

        await page.evaluate(() => window.scrollBy(0, window.innerHeight));
        await this.delay(1000, 2000);
        scrollAttempts++;
      }

      return posts.slice(0, limit);

    } catch (error) {
      console.error(`Error scraping subreddit ${subreddit}:`, error.message);
      throw error;
    } finally {
      await page.close();
    }
  }

  async analyzeTrends(subreddit, options = {}) {
    await this.init();
    const page = await this.context.newPage();

    try {
      const timeframe = options.timeframe || '24h';
      const minScore = options.minScore || 100;
      const url = `https://www.reddit.com/r/${subreddit}/top/?t=${timeframe}`;

      await page.goto(url, { waitUntil: 'networkidle', timeout: this.config.timeout });
      await this.delay(this.config.delayMin, this.config.delayMax);

      const posts = await page.evaluate(() => {
        const postElements = document.querySelectorAll('div[data-testid="post-container"]');
        const extracted = [];

        postElements.forEach(post => {
          const score = post.querySelector('span[data-testid="post-score"]');
          if (score) {
            const scoreText = score.textContent.trim();
            const scoreMatch = scoreText.match(/(\d+(?:[.,]\d+)?)/);
            if (scoreMatch) {
              const scoreValue = parseFloat(scoreMatch[1].replace(/,/g, ''));
              if (scoreValue >= 100) {
                const title = post.querySelector('h3[data-testid="post-title"]');
                if (title) {
                  extracted.push({
                    title: title.textContent.trim(),
                    score: scoreValue,
                    id: post.getAttribute('data-fullname')
                  });
                }
              }
            }
          }
        });

        return extracted;
      });

      // Analyze trends
      const trends = {
        topPosts: posts.slice(0, 10),
        scoreDistribution: this.calculateScoreDistribution(posts),
        popularKeywords: this.extractPopularKeywords(posts)
      };

      return trends;

    } catch (error) {
      console.error(`Error analyzing trends for ${subreddit}:`, error.message);
      throw error;
    } finally {
      await page.close();
    }
  }

  async aggregateSubreddits(subreddits, options = {}) {
    const limit = options.limit || 25;
    const aggregated = [];

    for (const subreddit of subreddits) {
      try {
        const posts = await this.scrapeSubreddit(subreddit, { limit: 20 });
        posts.forEach(post => {
          post.subreddit = subreddit;
          aggregated.push(post);
        });
        
        await this.delay(this.config.delayMin, this.config.delayMax);
      } catch (error) {
        console.error(`Error aggregating subreddit ${subreddit}:`, error.message);
      }
    }

    // Sort by score
    aggregated.sort((a, b) => {
      const scoreA = a.engagement?.score || 0;
      const scoreB = b.engagement?.score || 0;
      return scoreB - scoreA;
    });

    return aggregated.slice(0, limit);
  }

  async scrapeUserActivity(username, options = {}) {
    await this.init();
    const page = await this.context.newPage();

    try {
      const url = `https://www.reddit.com/user/${username}`;
      
      await page.goto(url, { waitUntil: 'networkidle', timeout: this.config.timeout });
      await this.delay(this.config.delayMin, this.config.delayMax);

      const activity = await page.evaluate(() => {
        const getTextContent = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.textContent.trim() : null;
        };

        const userStats = {};
        
        // Extract karma
        const karmaElements = document.querySelectorAll('[data-testid="user-karma"]');
        karmaElements.forEach(karma => {
          const text = karma.textContent.trim();
          const match = text.match(/(\d+(?:[.,]\d+)?)/);
          if (match) {
            const value = parseFloat(match[1].replace(/,/g, ''));
            if (karma.textContent.includes('post')) {
              userStats.postKarma = value;
            } else if (karma.textContent.includes('comment')) {
              userStats.commentKarma = value;
            }
          }
        });

        // Extract recent activity
        const recentPosts = [];
        const postElements = document.querySelectorAll('div[data-testid="post-container"]');
        
        postElements.forEach(post => {
          const title = post.querySelector('h3[data-testid="post-title"]');
          const score = post.querySelector('span[data-testid="post-score"]');
          const time = post.querySelector('time');
          
          if (title && score && time) {
            recentPosts.push({
              title: title.textContent.trim(),
              score: parseInt(score.textContent.replace(/,/g, '')),
              time: time.getAttribute('datetime'),
              subreddit: post.querySelector('a[href*="/r/"]').textContent.trim()
            });
          }
        });

        return {
          username: getTextContent('[data-testid="user-username"]'),
          stats: userStats,
          recentActivity: recentPosts.slice(0, 10)
        };
      });

      return activity;

    } catch (error) {
      console.error(`Error scraping user activity for ${username}:`, error.message);
      throw error;
    } finally {
      await page.close();
    }
  }

  async healthCheck() {
    try {
      await this.init();
      const page = await this.context.newPage();
      await page.goto('https://www.reddit.com', { timeout: 10000 });
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

  calculateScoreDistribution(posts) {
    const bins = {
      '0-100': 0,
      '100-500': 0,
      '500-1000': 0,
      '1000+': 0
    };

    posts.forEach(post => {
      const score = post.engagement?.score || 0;
      if (score < 100) bins['0-100']++;
      else if (score < 500) bins['100-500']++;
      else if (score < 1000) bins['500-1000']++;
      else bins['1000']++;
    });

    return bins;
  }

  extractPopularKeywords(posts) {
    const wordFrequency = {};
    const stopWords = new Set(['the', 'and', 'a', 'an', 'in', 'on', 'with', 'to', 'of', 'for']);

    posts.forEach(post => {
      const title = post.title.toLowerCase();
      const words = title.match(/\b\w+\b/g) || [];
      
      words.forEach(word => {
        if (word.length > 3 && !stopWords.has(word)) {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
      });
    });

    return Object.entries(wordFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
  }
}

module.exports = { RedditScraper };
