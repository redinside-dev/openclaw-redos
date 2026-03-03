# SOCIAL-SCRAPE Testing Guide

## Running Tests

```bash
# Run all tests
npm test

# Run specific test
node test/twitter-test.js
node test/reddit-test.js
node test/multi-platform-test.js
```

## Test Suite

### Basic Functionality Tests

#### Twitter Scraper Tests
```javascript
const { TwitterScraper } = require('../scrapers/twitter');

async function testTwitterScraper() {
  console.log('Testing Twitter Scraper...\n');
  
  const scraper = new TwitterScraper({ headless: true });
  const results = { passed: 0, failed: 0 };
  
  try {
    // Test 1: Profile scraping
    console.log('Test 1: Profile scraping');
    try {
      const profile = await scraper.scrapeProfile('elonmusk');
      console.assert(profile.username === 'elonmusk', 'Username should match');
      console.assert(profile.name, 'Name should be present');
      console.log('✓ Test 1 passed\n');
      results.passed++;
    } catch (error) {
      console.error('✗ Test 1 failed:', error.message, '\n');
      results.failed++;
    }
    
    // Test 2: Tweet scraping
    console.log('Test 2: Tweet scraping');
    try {
      const tweets = await scraper.scrapeTweets('elonmusk', { limit: 10 });
      console.assert(tweets.length > 0, 'Should scrape at least 1 tweet');
      console.assert(tweets[0].text, 'Tweet should have text');
      console.log(`✓ Test 2 passed (scraped ${tweets.length} tweets)\n`);
      results.passed++;
    } catch (error) {
      console.error('✗ Test 2 failed:', error.message, '\n');
      results.failed++;
    }
    
    // Test 3: Health check
    console.log('Test 3: Health check');
    try {
      const health = await scraper.healthCheck();
      console.assert(health.status === 'healthy', 'Health status should be healthy');
      console.log('✓ Test 3 passed\n');
      results.passed++;
    } catch (error) {
      console.error('✗ Test 3 failed:', error.message, '\n');
      results.failed++;
    }
    
  } finally {
    await scraper.close();
  }
  
  console.log(`\nTwitter Scraper Tests: ${results.passed} passed, ${results.failed} failed`);
  return results;
}

if (require.main === module) {
  testTwitterScraper().catch(console.error);
}

module.exports = { testTwitterScraper };
```

#### Reddit Scraper Tests
```javascript
const { RedditScraper } = require('../scrapers/reddit');

async function testRedditScraper() {
  console.log('Testing Reddit Scraper...\n');
  
  const scraper = new RedditScraper({ headless: true });
  const results = { passed: 0, failed: 0 };
  
  try {
    // Test 1: Subreddit scraping
    console.log('Test 1: Subreddit scraping');
    try {
      const posts = await scraper.scrapeSubreddit('programming', { limit: 25 });
      console.assert(posts.length > 0, 'Should scrape at least 1 post');
      console.assert(posts[0].title, 'Post should have title');
      console.log(`✓ Test 1 passed (scraped ${posts.length} posts)\n`);
      results.passed++;
    } catch (error) {
      console.error('✗ Test 1 failed:', error.message, '\n');
      results.failed++;
    }
    
    // Test 2: Multi-subreddit aggregation
    console.log('Test 2: Multi-subreddit aggregation');
    try {
      const aggregated = await scraper.aggregateSubreddits(
        ['programming', 'javascript'],
        { limit: 15 }
      );
      console.assert(aggregated.length > 0, 'Should aggregate posts');
      console.log(`✓ Test 2 passed (aggregated ${aggregated.length} posts)\n`);
      results.passed++;
    } catch (error) {
      console.error('✗ Test 2 failed:', error.message, '\n');
      results.failed++;
    }
    
    // Test 3: Health check
    console.log('Test 3: Health check');
    try {
      const health = await scraper.healthCheck();
      console.assert(health.status === 'healthy', 'Health status should be healthy');
      console.log('✓ Test 3 passed\n');
      results.passed++;
    } catch (error) {
      console.error('✗ Test 3 failed:', error.message, '\n');
      results.failed++;
    }
    
  } finally {
    await scraper.close();
  }
  
  console.log(`\nReddit Scraper Tests: ${results.passed} passed, ${results.failed} failed`);
  return results;
}

if (require.main === module) {
  testRedditScraper().catch(console.error);
}

module.exports = { testRedditScraper };
```

### Integration Tests

```javascript
const { BackgroundCollector } = require('../collectors/background');

async function testBackgroundCollector() {
  console.log('Testing Background Collector...\n');
  
  const results = { passed: 0, failed: 0 };
  const collector = new BackgroundCollector({
    headless: true,
    storage: 'filesystem',
    storagePath: './test-data'
  });
  
  try {
    // Test 1: Start collector
    console.log('Test 1: Start collector');
    try {
      await collector.start({
        targets: [
          { platform: 'twitter', username: 'elonmusk' },
          { platform: 'reddit', subreddit: 'programming' }
        ],
        interval: 60000 // 1 minute for testing
      });
      
      console.assert(collector.isRunning, 'Collector should be running');
      console.log('✓ Test 1 passed\n');
      results.passed++;
    } catch (error) {
      console.error('✗ Test 1 failed:', error.message, '\n');
      results.failed++;
    }
    
    // Wait for one collection cycle
    console.log('Waiting for collection cycle...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test 2: Check status
    console.log('Test 2: Check status');
    try {
      const status = await collector.getStatus();
      console.assert(status.isRunning, 'Should be running');
      console.assert(status.stats.totalRuns > 0, 'Should have at least 1 run');
      console.log('✓ Test 2 passed\n');
      results.passed++;
    } catch (error) {
      console.error('✗ Test 2 failed:', error.message, '\n');
      results.failed++;
    }
    
    // Test 3: Stop collector
    console.log('Test 3: Stop collector');
    try {
      const stats = await collector.stop();
      console.assert(!collector.isRunning, 'Collector should be stopped');
      console.assert(stats.totalRuns > 0, 'Should have run at least once');
      console.log('✓ Test 3 passed\n');
      results.passed++;
    } catch (error) {
      console.error('✗ Test 3 failed:', error.message, '\n');
      results.failed++;
    }
    
  } catch (error) {
    console.error('Test suite error:', error);
    await collector.stop();
  }
  
  console.log(`\nBackground Collector Tests: ${results.passed} passed, ${results.failed} failed`);
  return results;
}

if (require.main === module) {
  testBackgroundCollector().catch(console.error);
}

module.exports = { testBackgroundCollector };
```

### Test Runner

```javascript
const { testTwitterScraper } = require('./twitter-test');
const { testRedditScraper } = require('./reddit-test');
const { testBackgroundCollector } = require('./background-collector-test');

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('SOCIAL-SCRAPE Test Suite');
  console.log('='.repeat(60));
  console.log('');
  
  const allResults = {
    passed: 0,
    failed: 0,
    suites: []
  };
  
  // Run Twitter tests
  console.log('Running Twitter Scraper tests...');
  const twitterResults = await testTwitterScraper();
  allResults.passed += twitterResults.passed;
  allResults.failed += twitterResults.failed;
  allResults.suites.push({ name: 'Twitter Scraper', ...twitterResults });
  console.log('');
  
  // Run Reddit tests
  console.log('Running Reddit Scraper tests...');
  const redditResults = await testRedditScraper();
  allResults.passed += redditResults.passed;
  allResults.failed += redditResults.failed;
  allResults.suites.push({ name: 'Reddit Scraper', ...redditResults });
  console.log('');
  
  // Run Background Collector tests
  console.log('Running Background Collector tests...');
  const collectorResults = await testBackgroundCollector();
  allResults.passed += collectorResults.passed;
  allResults.failed += collectorResults.failed;
  allResults.suites.push({ name: 'Background Collector', ...collectorResults });
  console.log('');
  
  // Summary
  console.log('='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  allResults.suites.forEach(suite => {
    console.log(`${suite.name}: ${suite.passed} passed, ${suite.failed} failed`);
  });
  console.log('-'.repeat(60));
  console.log(`Total: ${allResults.passed} passed, ${allResults.failed} failed`);
  console.log('='.repeat(60));
  
  // Exit with appropriate code
  process.exit(allResults.failed > 0 ? 1 : 0);
}

if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };
```

## Manual Testing

### Test Twitter Scraping
```bash
node examples/twitter-profile-scraper.js
```

### Test Reddit Scraping
```bash
node examples/reddit-subreddit-monitor.js
```

### Test Multi-Platform
```bash
node examples/multi-platform-aggregator.js
```

### Test Background Collection
```bash
# Start collector (will run continuously)
node examples/background-collector.js

# In another terminal, check status
curl http://localhost:3000/status  # If API enabled
```

## Performance Testing

### Load Testing
```javascript
const { performance } = require('perf_hooks');

async function performanceTest() {
  const scraper = new TwitterScraper({ headless: true });
  
  // Test profile scraping performance
  const profileStart = performance.now();
  await scraper.scrapeProfile('elonmusk');
  const profileTime = performance.now() - profileStart;
  console.log(`Profile scraping: ${profileTime.toFixed(2)}ms`);
  
  // Test tweet scraping performance
  const tweetsStart = performance.now();
  await scraper.scrapeTweets('elonmusk', { limit: 50 });
  const tweetsTime = performance.now() - tweetsStart;
  console.log(`Tweet scraping (50): ${tweetsTime.toFixed(2)}ms`);
  
  await scraper.close();
}
```

### Memory Testing
```javascript
async function memoryTest() {
  const initialMemory = process.memoryUsage();
  
  const scraper = new TwitterScraper({ headless: true });
  
  // Scrape multiple profiles
  for (let i = 0; i < 10; i++) {
    await scraper.scrapeProfile('elonmusk');
  }
  
  const finalMemory = process.memoryUsage();
  const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
  
  console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
  
  await scraper.close();
}
```

## Troubleshooting Tests

### Common Issues

1. **Playwright not installed**
   ```bash
   npx playwright install chromium
   ```

2. **Rate limiting during tests**
   - Increase delays between requests
   - Use smaller test datasets
   - Mock responses for unit tests

3. **Selector failures**
   - Update selectors in scraper files
   - Add multiple fallback selectors
   - Enable screenshots on failure

4. **Timeout errors**
   - Increase timeout values
   - Check network connectivity
   - Verify target website is accessible

### Debug Mode

Enable debug logging:
```bash
DEBUG=* node examples/twitter-profile-scraper.js
```

Enable screenshots on error:
```javascript
const scraper = new TwitterScraper({
  headless: false,  // See browser
  screenshotOnError: true
});
```
