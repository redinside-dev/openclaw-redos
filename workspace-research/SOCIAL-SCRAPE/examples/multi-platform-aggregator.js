const { MultiPlatformScraper } = require('../scrapers/multi-platform');
require('dotenv').config();

async function main() {
  console.log('=== Multi-Platform Aggregator Example ===\n');

  const scraper = new MultiPlatformScraper({
    platforms: ['twitter', 'reddit'],
    headless: true,
    stealth: true
  });

  try {
    // Example 1: Aggregate by topic
    console.log('Example 1: Aggregating content by topic...');
    const topic = 'artificial intelligence';
    const results = await scraper.aggregateByTopic(topic, {
      platforms: ['twitter', 'reddit'],
      limit: 50,
      timeframe: '24h'
    });
    console.log(`Aggregated ${results.aggregated.length} items about "${topic}"`);
    console.log('Metadata:', JSON.stringify(results.metadata, null, 2));
    console.log('Sample result:', JSON.stringify(results.aggregated[0], null, 2));
    console.log('');

    // Example 2: Track user across platforms
    console.log('Example 2: Tracking user across platforms...');
    const userActivity = await scraper.trackUser({
      twitter: 'sama',
      reddit: 'sama'
    });
    console.log('Cross-platform activity:', JSON.stringify(userActivity.insights, null, 2));
    console.log('');

    // Example 3: Multiple topics aggregation
    console.log('Example 3: Aggregating multiple topics...');
    const topics = ['machine learning', 'web development', 'cybersecurity'];
    const multiTopicResults = await scraper.aggregateMultipleTopics(topics, {
      platforms: ['twitter', 'reddit'],
      limit: 20
    });
    console.log('Combined insights:', JSON.stringify(multiTopicResults.combinedInsights, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
