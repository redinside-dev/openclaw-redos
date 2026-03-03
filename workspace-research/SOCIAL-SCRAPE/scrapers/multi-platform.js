const { chromium } = require('playwright');
require('dotenv').config();

class MultiPlatformScraper {
  constructor(config = {}) {
    this.config = {
      headless: config.headless !== false,
      stealth: config.stealth !== false,
      timeout: config.timeout || 30000,
      delayMin: config.delayMin || 2000,
      delayMax: config.delayMax || 5000,
      maxRetries: config.maxRetries || 3
    };
    this.twitterScraper = new (require('./twitter'))(config);
    this.redditScraper = new (require('./reddit'))(config);
  }

  async aggregateByTopic(topic, options = {}) {
    const platforms = options.platforms || ['twitter', 'reddit'];
    const limit = options.limit || 100;
    const timeframe = options.timeframe || '24h';
    
    const results = {
      topic,
      timeframe,
      platforms: {},
      aggregated: [],
      metadata: {}
    };

    // Search Twitter
    if (platforms.includes('twitter')) {
      try {
        const tweets = await this.twitterScraper.scrapeTweets('search', {
          query: topic,
          limit: Math.floor(limit * 0.6)
        });
        
        results.platforms.twitter = {
          count: tweets.length,
          sample: tweets.slice(0, 5)
        };
        
        results.aggregated.push(...tweets.map(tweet => ({
          platform: 'twitter',
          type: 'tweet',
          content: tweet.text,
          timestamp: tweet.timestamp,
          metrics: tweet.metrics,
          url: `https://twitter.com/${tweet.username}/status/${tweet.id}`
        })));
      } catch (error) {
        console.error(`Error scraping Twitter for topic ${topic}:`, error.message);
        results.platforms.twitter = { error: error.message };
      }
    }

    // Search Reddit
    if (platforms.includes('reddit')) {
      try {
        const posts = await this.redditScraper.scrapeSubreddit('search', {
          query: topic,
          limit: Math.floor(limit * 0.4)
        });
        
        results.platforms.reddit = {
          count: posts.length,
          sample: posts.slice(0, 5)
        };
        
        results.aggregated.push(...posts.map(post => ({
          platform: 'reddit',
          type: 'post',
          content: post.title,
          timestamp: post.time,
          metrics: post.engagement,
          url: `https://www.reddit.com${post.url}`
        })));
      } catch (error) {
        console.error(`Error scraping Reddit for topic ${topic}:`, error.message);
        results.platforms.reddit = { error: error.message };
      }
    }

    // Sort aggregated results by timestamp (newest first)
    results.aggregated.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB - dateA;
    });

    // Add metadata
    results.metadata = {
      totalResults: results.aggregated.length,
      platformsCount: platforms.length,
      timeframe: timeframe,
      generatedAt: new Date().toISOString()
    };

    return results;
  }

  async trackUser(userIdentifiers, options = {}) {
    const results = {
      userIdentifiers,
      platforms: {},
      activity: {},
      insights: {}
    };

    // Track Twitter
    if (userIdentifiers.twitter) {
      try {
        const profile = await this.twitterScraper.scrapeProfile(userIdentifiers.twitter);
        const tweets = await this.twitterScraper.scrapeTweets(userIdentifiers.twitter, { limit: 10 });
        
        results.platforms.twitter = {
          profile,
          recentTweets: tweets,
          engagement: this.calculateTwitterEngagement(tweets)
        };
        
        results.activity[userIdentifiers.twitter] = {
          profile,
          tweets: tweets.length,
          lastActivity: tweets[0]?.timestamp || null
        };
      } catch (error) {
        console.error(`Error tracking Twitter user ${userIdentifiers.twitter}:`, error.message);
        results.platforms.twitter = { error: error.message };
      }
    }

    // Track Reddit
    if (userIdentifiers.reddit) {
      try {
        const activity = await this.redditScraper.scrapeUserActivity(userIdentifiers.reddit);
        
        results.platforms.reddit = {
          activity,
          engagement: this.calculateRedditEngagement(activity)
        };
        
        results.activity[userIdentifiers.reddit] = {
          profile: activity,
          posts: activity.recentActivity.length,
          lastActivity: activity.recentActivity[0]?.time || null
        };
      } catch (error) {
        console.error(`Error tracking Reddit user ${userIdentifiers.reddit}:`, error.message);
        results.platforms.reddit = { error: error.message };
      }
    }

    // Generate insights
    results.insights = this.generateCrossPlatformInsights(results.activity);

    return results;
  }

  async aggregateMultipleTopics(topics, options = {}) {
    const results = {
      topics,
      generatedAt: new Date().toISOString(),
      platformResults: {},
      combinedInsights: {}
    };

    for (const topic of topics) {
      try {
        const topicResults = await this.aggregateByTopic(topic, options);
        results.platformResults[topic] = topicResults;
        
        // Add delay between requests
        await this.delay(this.config.delayMin, this.config.delayMax);
      } catch (error) {
        console.error(`Error aggregating topic ${topic}:`, error.message);
        results.platformResults[topic] = { error: error.message };
      }
    }

    // Generate combined insights
    results.combinedInsights = this.generateCombinedInsights(results.platformResults);

    return results;
  }

  calculateTwitterEngagement(tweets) {
    const metrics = {
      totalTweets: tweets.length,
      totalLikes: 0,
      totalRetweets: 0,
      totalReplies: 0,
      avgLikes: 0,
      avgRetweets: 0,
      avgReplies: 0,
      engagementRate: 0
    };

    tweets.forEach(tweet => {
      metrics.totalLikes += tweet.metrics.likes || 0;
      metrics.totalRetweets += tweet.metrics.retweets || 0;
      metrics.totalReplies += tweet.metrics.replies || 0;
    });

    if (tweets.length > 0) {
      metrics.avgLikes = metrics.totalLikes / tweets.length;
      metrics.avgRetweets = metrics.totalRetweets / tweets.length;
      metrics.avgReplies = metrics.totalReplies / tweets.length;
      metrics.engagementRate = (metrics.totalLikes + metrics.totalRetweets + metrics.totalReplies) / tweets.length;
    }

    return metrics;
  }

  calculateRedditEngagement(activity) {
    const metrics = {
      totalPosts: activity.recentActivity.length,
      totalScore: 0,
      totalComments: 0,
      avgScore: 0,
      avgComments: 0,
      engagementRate: 0
    };

    activity.recentActivity.forEach(post => {
      metrics.totalScore += post.engagement?.score || 0;
      metrics.totalComments += post.engagement?.comments || 0;
    });

    if (activity.recentActivity.length > 0) {
      metrics.avgScore = metrics.totalScore / activity.recentActivity.length;
      metrics.avgComments = metrics.totalComments / activity.recentActivity.length;
      metrics.engagementRate = (metrics.totalScore + metrics.totalComments) / activity.recentActivity.length;
    }

    return metrics;
  }

  generateCrossPlatformInsights(activity) {
    const insights = {
      totalPlatforms: Object.keys(activity).length,
      totalActivity: 0,
      mostActivePlatform: null,
      engagementComparison: {},
      activityTimeline: {}
    };

    let maxActivity = 0;
    let mostActive = null;

    Object.entries(activity).forEach(([platform, data]) => {
      const activityCount = data.tweets || data.posts || 0;
      insights.totalActivity += activityCount;
      
      if (activityCount > maxActivity) {
        maxActivity = activityCount;
        mostActive = platform;
      }
    });

    insights.mostActivePlatform = mostActive;

    // Engagement comparison
    Object.entries(activity).forEach(([platform, data]) => {
      const engagement = data.engagement || {};
      insights.engagementComparison[platform] = {
        totalEngagement: engagement.totalLikes || engagement.totalScore || 0,
        avgEngagement: engagement.avgLikes || engagement.avgScore || 0,
        engagementRate: engagement.engagementRate || 0
      };
    });

    return insights;
  }

  generateCombinedInsights(platformResults) {
    const insights = {
      topicCoverage: {},
      trendingTopics: [],
      platformPerformance: {},
      crossPlatformTrends: {}
    };

    // Analyze topic coverage
    Object.entries(platformResults).forEach(([topic, results]) => {
      insights.topicCoverage[topic] = {
        platformsCovered: Object.keys(results.platforms).length,
        totalResults: results.aggregated.length,
        platformBreakdown: results.platforms
      };
    });

    // Identify trending topics
    const allTopics = Object.entries(platformResults).map(([topic, results]) => ({
      topic,
      totalResults: results.aggregated.length,
      platformCoverage: Object.keys(results.platforms).length
    }));

    insights.trendingTopics = allTopics
      .sort((a, b) => b.totalResults - a.totalResults)
      .slice(0, 5);

    // Platform performance
    const platformStats = {};
    Object.values(platformResults).forEach(results => {
      Object.entries(results.platforms).forEach(([platform, data]) => {
        if (data.count) {
          platformStats[platform] = platformStats[platform] || {
            totalResults: 0,
            topicCount: 0,
            avgResultsPerTopic: 0
          };
          platformStats[platform].totalResults += data.count;
          platformStats[platform].topicCount++;
        }
      });
    });

    Object.entries(platformStats).forEach(([platform, stats]) => {
      stats.avgResultsPerTopic = stats.totalResults / stats.topicCount;
    });

    insights.platformPerformance = platformStats;

    return insights;
  }

  delay(min, max) {
    const ms = min + Math.random() * (max - min);
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { MultiPlatformScraper };
