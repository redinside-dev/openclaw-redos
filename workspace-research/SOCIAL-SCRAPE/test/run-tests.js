const { testTwitterScraper } = require('./twitter-test');
const { testRedditScraper } = require('./reddit-test');

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
  
  try {
    // Run Twitter tests
    console.log('Running Twitter Scraper tests...');
    const twitterResults = await testTwitterScraper();
    allResults.passed += twitterResults.passed;
    allResults.failed += twitterResults.failed;
    allResults.suites.push({ name: 'Twitter Scraper', ...twitterResults });
    console.log('');
  } catch (error) {
    console.error('Twitter test suite failed:', error.message);
    allResults.failed++;
  }
  
  try {
    // Run Reddit tests
    console.log('Running Reddit Scraper tests...');
    const redditResults = await testRedditScraper();
    allResults.passed += redditResults.passed;
    allResults.failed += redditResults.failed;
    allResults.suites.push({ name: 'Reddit Scraper', ...redditResults });
    console.log('');
  } catch (error) {
    console.error('Reddit test suite failed:', error.message);
    allResults.failed++;
  }
  
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
