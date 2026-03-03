const { TwitterScraper } = require('../scrapers/twitter');
require('dotenv').config();

async function main() {
  console.log('=== Twitter Profile Scraper Example ===\n');

  const scraper = new TwitterScraper({
    headless: true,
    stealth: true
  });

  try {
    // Example 1: Scrape a profile
    console.log('Example 1: Scraping Twitter profile...');
    const username = 'elonmusk'; // Change to any username
    const profile = await scraper.scrapeProfile(username);
    console.log('Profile:', JSON.stringify(profile, null, 2));
    console.log('');

    // Example 2: Scrape tweets
    console.log('Example 2: Scraping recent tweets...');
    const tweets = await scraper.scrapeTweets(username, { limit: 10 });
    console.log(`Scraped ${tweets.length} tweets`);
    console.log('Sample tweet:', JSON.stringify(tweets[0], null, 2));
    console.log('');

    // Example 3: Monitor with auto-discovery
    console.log('Example 3: Starting monitoring (will run once, then stop)...');
    const monitor = await scraper.scrapeWithMonitoring([username], {
      interval: 900000, // 15 minutes
      autoDiscover: true
    });
    
    // Stop after 5 seconds for demo purposes
    setTimeout(() => {
      monitor.stop();
      console.log('Monitoring stopped');
    }, 5000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await scraper.close();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
