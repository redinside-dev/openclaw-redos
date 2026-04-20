#!/usr/bin/env node
const path = require('path');
const { RedditScraper } = require('../scrapers/reddit');

// Load config
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runRedditCron() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Reddit cron job started`);

  const scraper = new RedditScraper({
    headless: true,
    stealth: true
  });

  try {
    // Define targets from environment or default list
    const targets = process.env.REDDIT_SUBREDDITS 
      ? process.env.REDDIT_SUBREDDITS.split(',')
      : ['programming', 'MachineLearning', 'technology'];

    const results = [];

    for (const subreddit of targets) {
      try {
        console.log(`Scraping: r/${subreddit}`);
        
        const posts = await scraper.scrapeSubreddit(subreddit, {
          sort: 'hot',
          limit: 50
        });
        
        results.push({
          subreddit,
          posts,
          scrapedAt: new Date().toISOString()
        });

        console.log(`✓ r/${subreddit}: ${posts.length} posts`);
        
        // Delay between targets
        await delay(3000, 6000);
      } catch (error) {
        console.error(`✗ r/${subreddit}: ${error.message}`);
      }
    }

    // Save results
    const fs = require('fs').promises;
    const dataDir = path.join(__dirname, '..', 'data', 'reddit');
    await fs.mkdir(dataDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(dataDir, `reddit-cron-${timestamp}.json`);
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[${new Date().toISOString()}] Reddit cron completed in ${duration}s`);
    console.log(`Results saved to: ${outputPath}`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Reddit cron failed:`, error.message);
    process.exit(1);
  } finally {
    await scraper.close();
  }
}

function delay(min, max) {
  const ms = min + Math.random() * (max - min);
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run if executed directly
if (require.main === module) {
  runRedditCron().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runRedditCron };
