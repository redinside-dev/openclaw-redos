#!/usr/bin/env node
const path = require('path');
const { TwitterScraper } = require('../scrapers/twitter');

// Load config
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runTwitterCron() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Twitter cron job started`);

  const scraper = new TwitterScraper({
    headless: true,
    stealth: true
  });

  try {
    // Define targets from environment or default list
    const targets = process.env.TWITTER_TARGETS 
      ? process.env.TWITTER_TARGETS.split(',')
      : ['elonmusk', 'openai', 'sama'];

    const results = [];

    for (const username of targets) {
      try {
        console.log(`Scraping: @${username}`);
        
        const profile = await scraper.scrapeProfile(username);
        const tweets = await scraper.scrapeTweets(username, { limit: 20 });
        
        results.push({
          username,
          profile,
          tweets,
          scrapedAt: new Date().toISOString()
        });

        console.log(`✓ @${username}: ${tweets.length} tweets`);
        
        // Delay between targets
        await delay(3000, 6000);
      } catch (error) {
        console.error(`✗ @${username}: ${error.message}`);
      }
    }

    // Save results
    const fs = require('fs').promises;
    const dataDir = path.join(__dirname, '..', 'data', 'twitter');
    await fs.mkdir(dataDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(dataDir, `twitter-cron-${timestamp}.json`);
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[${new Date().toISOString()}] Twitter cron completed in ${duration}s`);
    console.log(`Results saved to: ${outputPath}`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Twitter cron failed:`, error.message);
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
  runTwitterCron().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runTwitterCron };
