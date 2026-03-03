const { BackgroundCollector } = require('../collectors/background');
require('dotenv').config();

async function main() {
  console.log('=== Background Collector Example ===\n');

  const collector = new BackgroundCollector({
    headless: true,
    storage: 'filesystem',
    storagePath: './data',
    autoDiscover: true,
    maxTargets: 50
  });

  try {
    // Define targets to monitor
    const targets = [
      // Twitter targets
      { platform: 'twitter', username: 'elonmusk' },
      { platform: 'twitter', username: 'openai' },
      { platform: 'twitter', username: 'sama' },
      
      // Reddit targets
      { platform: 'reddit', subreddit: 'programming' },
      { platform: 'reddit', subreddit: 'MachineLearning' },
      { platform: 'reddit', subreddit: 'technology' }
    ];

    console.log('Starting background collector...');
    console.log(`Monitoring ${targets.length} targets`);
    console.log('Collection interval: 15 minutes');
    console.log('Auto-discovery: enabled\n');

    await collector.start({
      targets,
      interval: 900000, // 15 minutes
      autoDiscover: true
    });

    // Monitor status
    setInterval(async () => {
      const status = await collector.getStatus();
      console.log('\n=== Status Update ===');
      console.log(`Running: ${status.isRunning}`);
      console.log(`Total runs: ${status.stats.totalRuns}`);
      console.log(`Successful: ${status.stats.successfulRuns}`);
      console.log(`Failed: ${status.stats.failedRuns}`);
      console.log(`Data points collected: ${status.stats.totalDataPoints}`);
      console.log(`Discovered targets: ${status.discoveredTargets}`);
      console.log(`Next run: ${status.nextRun}`);
    }, 60000); // Every minute

    // Export stats periodically
    setInterval(async () => {
      await collector.exportStats();
      console.log('Stats exported');
    }, 3600000); // Every hour

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n\nShutting down...');
      const finalStats = await collector.stop();
      console.log('Final stats:', JSON.stringify(finalStats, null, 2));
      process.exit(0);
    });

    console.log('Background collector is running. Press Ctrl+C to stop.\n');

  } catch (error) {
    console.error('Error:', error.message);
    await collector.stop();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
