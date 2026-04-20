#!/usr/bin/env node
const path = require('path');
const { TwitterScraper } = require('../scrapers/twitter');
const { RedditScraper } = require('../scrapers/reddit');

// Load config
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runHealthCheck() {
  console.log(`[${new Date().toISOString()}] Health check started`);

  const results = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {}
  };

  // Check Twitter scraper
  console.log('Checking Twitter scraper...');
  const twitterScraper = new TwitterScraper({ headless: true });
  try {
    const twitterHealth = await twitterScraper.healthCheck();
    results.checks.twitter = twitterHealth;
    console.log(`✓ Twitter: ${twitterHealth.status}`);
  } catch (error) {
    results.checks.twitter = {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    results.status = 'degraded';
    console.log(`✗ Twitter: ${error.message}`);
  } finally {
    await twitterScraper.close();
  }

  // Check Reddit scraper
  console.log('Checking Reddit scraper...');
  const redditScraper = new RedditScraper({ headless: true });
  try {
    const redditHealth = await redditScraper.healthCheck();
    results.checks.reddit = redditHealth;
    console.log(`✓ Reddit: ${redditHealth.status}`);
  } catch (error) {
    results.checks.reddit = {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    results.status = 'degraded';
    console.log(`✗ Reddit: ${error.message}`);
  } finally {
    await redditScraper.close();
  }

  // Check storage
  console.log('Checking storage...');
  try {
    const fs = require('fs').promises;
    const dataDir = path.join(__dirname, '..', 'data');
    await fs.access(dataDir);
    results.checks.storage = {
      status: 'healthy',
      path: dataDir,
      timestamp: new Date().toISOString()
    };
    console.log('✓ Storage: accessible');
  } catch (error) {
    results.checks.storage = {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    results.status = 'degraded';
    console.log(`✗ Storage: ${error.message}`);
  }

  // Check disk space
  console.log('Checking disk space...');
  try {
    const { execSync } = require('child_process');
    const diskUsage = execSync('df -h .').toString();
    const lines = diskUsage.split('\n');
    const dataLine = lines[1];
    const parts = dataLine.split(/\s+/);
    const usagePercent = parseInt(parts[4]);
    
    results.checks.diskSpace = {
      status: usagePercent < 90 ? 'healthy' : 'warning',
      usage: parts[4],
      available: parts[3],
      timestamp: new Date().toISOString()
    };
    
    if (usagePercent >= 90) {
      results.status = 'warning';
    }
    
    console.log(`✓ Disk space: ${parts[3]} available (${parts[4]} used)`);
  } catch (error) {
    results.checks.diskSpace = {
      status: 'unknown',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    console.log(`? Disk space: ${error.message}`);
  }

  // Save health check results
  try {
    const fs = require('fs').promises;
    const logsDir = path.join(__dirname, '..', 'logs');
    await fs.mkdir(logsDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(logsDir, `health-check-${timestamp}.json`);
    await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
    
    console.log(`\nHealth check results saved to: ${outputPath}`);
  } catch (error) {
    console.error('Error saving health check results:', error.message);
  }

  // Summary
  console.log(`\n[${new Date().toISOString()}] Health check completed`);
  console.log(`Overall status: ${results.status.toUpperCase()}`);

  // Exit with appropriate code
  if (results.status === 'healthy') {
    process.exit(0);
  } else if (results.status === 'degraded') {
    process.exit(1);
  } else {
    process.exit(2);
  }
}

// Run if executed directly
if (require.main === module) {
  runHealthCheck().catch(error => {
    console.error('Fatal error:', error);
    process.exit(3);
  });
}

module.exports = { runHealthCheck };
