const fs = require('fs').promises;
const path = require('path');
const { TwitterScraper } = require('../scrapers/twitter');
const { RedditScraper } = require('../scrapers/reddit');
require('dotenv').config();

class BackgroundCollector {
  constructor(config = {}) {
    this.config = {
      targets: config.targets || [],
      interval: config.interval || 900000, // 15 minutes
      storage: config.storage || 'filesystem',
      storagePath: config.storagePath || './data',
      autoDiscover: config.autoDiscover || false,
      maxTargets: config.maxTargets || 100,
      headless: config.headless !== false
    };
    
    this.twitterScraper = new TwitterScraper({ headless: this.config.headless });
    this.redditScraper = new RedditScraper({ headless: this.config.headless });
    
    this.isRunning = false;
    this.intervalId = null;
    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      totalDataPoints: 0,
      lastRun: null,
      errors: []
    };
    
    this.discoveredTargets = new Set();
  }

  async start(options = {}) {
    if (this.isRunning) {
      console.log('Collector already running');
      return;
    }

    // Merge options with config
    this.config = { ...this.config, ...options };
    
    console.log(`Starting background collector with ${this.config.targets.length} targets`);
    console.log(`Interval: ${this.config.interval}ms (${this.config.interval / 60000} minutes)`);
    
    this.isRunning = true;
    
    // Initial run
    await this.collect();
    
    // Schedule periodic runs
    this.intervalId = setInterval(async () => {
      await this.collect();
    }, this.config.interval);
    
    console.log('Background collector started');
  }

  async stop() {
    if (!this.isRunning) {
      console.log('Collector not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    await this.twitterScraper.close();
    await this.redditScraper.close();
    
    this.isRunning = false;
    console.log('Background collector stopped');
    
    return this.stats;
  }

  async collect() {
    this.stats.totalRuns++;
    this.stats.lastRun = new Date().toISOString();
    
    console.log(`[${this.stats.lastRun}] Starting collection run #${this.stats.totalRuns}`);
    
    const results = {
      timestamp: this.stats.lastRun,
      targets: {},
      errors: []
    };

    for (const target of this.config.targets) {
      try {
        let data = null;
        
        if (target.platform === 'twitter') {
          if (target.username) {
            data = await this.collectTwitterProfile(target.username);
          } else if (target.search) {
            data = await this.collectTwitterSearch(target.search);
          }
        } else if (target.platform === 'reddit') {
          if (target.subreddit) {
            data = await this.collectRedditSubreddit(target.subreddit);
          } else if (target.username) {
            data = await this.collectRedditUser(target.username);
          }
        }

        if (data) {
          results.targets[this.getTargetKey(target)] = data;
          this.stats.totalDataPoints += data.count || 0;
          
          // Auto-discover new targets
          if (this.config.autoDiscover) {
            await this.discoverTargets(target, data);
          }
        }

        // Delay between targets
        await this.delay(2000, 5000);

      } catch (error) {
        console.error(`Error collecting target ${JSON.stringify(target)}:`, error.message);
        results.errors.push({
          target,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        this.stats.errors.push({
          target,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        this.stats.failedRuns++;
      }
    }

    // Save results
    await this.saveResults(results);
    
    if (results.errors.length === 0) {
      this.stats.successfulRuns++;
    }

    console.log(`Collection run #${this.stats.totalRuns} completed. ` +
                `Targets: ${Object.keys(results.targets).length}, ` +
                `Errors: ${results.errors.length}`);
  }

  async collectTwitterProfile(username) {
    console.log(`Collecting Twitter profile: ${username}`);
    
    const profile = await this.twitterScraper.scrapeProfile(username);
    const tweets = await this.twitterScraper.scrapeTweets(username, { limit: 20 });
    
    return {
      type: 'twitter_profile',
      username,
      profile,
      tweets,
      count: tweets.length,
      timestamp: new Date().toISOString()
    };
  }

  async collectTwitterSearch(query) {
    console.log(`Collecting Twitter search: ${query}`);
    
    // Note: Search requires additional implementation
    // For now, we'll return empty results
    return {
      type: 'twitter_search',
      query,
      results: [],
      count: 0,
      timestamp: new Date().toISOString()
    };
  }

  async collectRedditSubreddit(subreddit) {
    console.log(`Collecting Reddit subreddit: ${subreddit}`);
    
    const posts = await this.redditScraper.scrapeSubreddit(subreddit, { limit: 50 });
    
    return {
      type: 'reddit_subreddit',
      subreddit,
      posts,
      count: posts.length,
      timestamp: new Date().toISOString()
    };
  }

  async collectRedditUser(username) {
    console.log(`Collecting Reddit user: ${username}`);
    
    const activity = await this.redditScraper.scrapeUserActivity(username);
    
    return {
      type: 'reddit_user',
      username,
      activity,
      count: activity.recentActivity?.length || 0,
      timestamp: new Date().toISOString()
    };
  }

  async discoverTargets(originalTarget, data) {
    const newTargets = [];

    if (originalTarget.platform === 'twitter' && data.tweets) {
      // Discover from mentions
      data.tweets.forEach(tweet => {
        const mentions = tweet.text.match(/@(\w+)/g) || [];
        mentions.forEach(mention => {
          const username = mention.slice(1);
          if (!this.hasTarget('twitter', username)) {
            newTargets.push({
              platform: 'twitter',
              username,
              discoveredFrom: originalTarget.username,
              discoveredAt: new Date().toISOString()
            });
            this.discoveredTargets.add(`twitter:${username}`);
          }
        });
      });
    }

    if (originalTarget.platform === 'reddit' && data.posts) {
      // Discover from subreddit mentions
      data.posts.forEach(post => {
        const mentions = post.title.match(/r\/(\w+)/g) || [];
        mentions.forEach(mention => {
          const subreddit = mention.slice(2);
          if (!this.hasTarget('reddit', subreddit, 'subreddit')) {
            newTargets.push({
              platform: 'reddit',
              subreddit,
              discoveredFrom: originalTarget.subreddit,
              discoveredAt: new Date().toISOString()
            });
            this.discoveredTargets.add(`reddit:${subreddit}`);
          }
        });
      });
    }

    // Add new targets if under limit
    if (newTargets.length > 0 && this.config.targets.length < this.config.maxTargets) {
      const toAdd = newTargets.slice(0, this.config.maxTargets - this.config.targets.length);
      this.config.targets.push(...toAdd);
      console.log(`Auto-discovered ${toAdd.length} new targets`);
    }
  }

  hasTarget(platform, identifier, type = 'username') {
    return this.config.targets.some(t => 
      t.platform === platform && (t.username === identifier || t.subreddit === identifier)
    ) || this.discoveredTargets.has(`${platform}:${identifier}`);
  }

  getTargetKey(target) {
    if (target.username) return `${target.platform}:${target.username}`;
    if (target.subreddit) return `${target.platform}:${target.subreddit}`;
    if (target.search) return `${target.platform}:search:${target.search}`;
    return `${target.platform}:unknown`;
  }

  async saveResults(results) {
    if (this.config.storage === 'filesystem') {
      await this.saveToFilesystem(results);
    } else if (this.config.storage === 'database') {
      await this.saveToDatabase(results);
    } else if (this.config.storage === 'cloud') {
      await this.saveToCloud(results);
    }
  }

  async saveToFilesystem(results) {
    try {
      // Create storage directory
      await fs.mkdir(this.config.storagePath, { recursive: true });
      
      // Save results by date
      const date = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      const datePath = path.join(this.config.storagePath, date);
      await fs.mkdir(datePath, { recursive: true });
      
      const filePath = path.join(datePath, `collection-${timestamp}.json`);
      await fs.writeFile(filePath, JSON.stringify(results, null, 2));
      
      console.log(`Results saved to: ${filePath}`);
      
      // Save individual target data
      for (const [key, data] of Object.entries(results.targets)) {
        const targetPath = path.join(datePath, 'targets', key.replace(/:/g, '_'));
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(
          `${targetPath}-${timestamp}.json`,
          JSON.stringify(data, null, 2)
        );
      }
    } catch (error) {
      console.error('Error saving to filesystem:', error.message);
    }
  }

  async saveToDatabase(results) {
    // Placeholder for database storage
    console.log('Database storage not implemented');
  }

  async saveToCloud(results) {
    // Placeholder for cloud storage
    console.log('Cloud storage not implemented');
  }

  async getStatus() {
    return {
      isRunning: this.isRunning,
      config: {
        interval: this.config.interval,
        targets: this.config.targets.length,
        autoDiscover: this.config.autoDiscover,
        storage: this.config.storage
      },
      stats: this.stats,
      discoveredTargets: this.discoveredTargets.size,
      nextRun: this.isRunning && this.stats.lastRun ? 
        new Date(new Date(this.stats.lastRun).getTime() + this.config.interval).toISOString() : 
        null
    };
  }

  async exportStats() {
    const exportData = {
      generatedAt: new Date().toISOString(),
      status: await this.getStatus(),
      targets: this.config.targets,
      discoveredTargets: Array.from(this.discoveredTargets),
      recentErrors: this.stats.errors.slice(-10)
    };

    const exportPath = path.join(this.config.storagePath, 'stats-export.json');
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`Stats exported to: ${exportPath}`);
    
    return exportData;
  }

  delay(min, max) {
    const ms = min + Math.random() * (max - min);
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { BackgroundCollector };
