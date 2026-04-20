const { TwitterScraper } = require('./scrapers/twitter');
const { RedditScraper } = require('./scrapers/reddit');
const { MultiPlatformScraper } = require('./scrapers/multi-platform');
const { BackgroundCollector } = require('./collectors/background');

class SocialScrape {
  constructor(config) {
    this.config = config;
    this.twitterScraper = new TwitterScraper(config);
    this.redditScraper = new RedditScraper(config);
    this.multiPlatformScraper = new MultiPlatformScraper(config);
    this.backgroundCollector = new BackgroundCollector(config);
  }

  async scrapeTwitterProfile(username) {
    return await this.twitterScraper.scrapeProfile(username);
  }

  async scrapeTwitterTweets(username, options = {}) {
    return await this.twitterScraper.scrapeTweets(username, options);
  }

  async monitorRedditSubreddit(subreddit, options = {}) {
    return await this.redditScraper.scrapeSubreddit(subreddit, options);
  }

  async aggregateByTopic(topic, platforms = ['twitter', 'reddit']) {
    return await this.multiPlatformScraper.aggregateByTopic(topic, {
      platforms,
      limit: 100,
      timeframe: '24h'
    });
  }

  async startBackgroundCollection(targets, interval = 900000) {
    return await this.backgroundCollector.start({
      targets,
      interval,
      storage: this.config.STORAGE_TYPE,
      autoDiscover: this.config.AUTO_DISCOVER
    });
  }

  async stopBackgroundCollection() {
    return await this.backgroundCollector.stop();
  }

  async getHealthStatus() {
    const status = {
      twitter: await this.twitterScraper.healthCheck(),
      reddit: await this.redditScraper.healthCheck(),
      background: await this.backgroundCollector.getStatus()
    };
    return status;
  }
}

module.exports = { SocialScrape };