const { RedditScraper } = require('../scrapers/reddit');
require('dotenv').config();

async function main() {
  console.log('=== Reddit Subreddit Monitor Example ===\n');

  const scraper = new RedditScraper({
    headless: true,
    stealth: true
  });

  try {
    // Example 1: Scrape subreddit
    console.log('Example 1: Scraping subreddit posts...');
    const subreddit = 'programming'; // Change to any subreddit
    const posts = await scraper.scrapeSubreddit(subreddit, {
      sort: 'hot',
      limit: 25
    });
    console.log(`Scraped ${posts.length} posts from r/${subreddit}`);
    console.log('Sample post:', JSON.stringify(posts[0], null, 2));
    console.log('');

    // Example 2: Analyze trends
    console.log('Example 2: Analyzing trends...');
    const trends = await scraper.analyzeTrends(subreddit, {
      timeframe: '24h',
      minScore: 100
    });
    console.log('Trends:', JSON.stringify(trends, null, 2));
    console.log('');

    // Example 3: Multi-subreddit aggregation
    console.log('Example 3: Aggregating multiple subreddits...');
    const aggregated = await scraper.aggregateSubreddits(
      ['programming', 'javascript', 'python'],
      { limit: 15 }
    );
    console.log(`Aggregated ${aggregated.length} posts across 3 subreddits`);
    console.log('Top post:', JSON.stringify(aggregated[0], null, 2));
    console.log('');

    // Example 4: User activity
    console.log('Example 4: Scraping user activity...');
    const username = 'AutoModerator'; // Change to any username
    const activity = await scraper.scrapeUserActivity(username);
    console.log('User activity:', JSON.stringify(activity, null, 2));

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
