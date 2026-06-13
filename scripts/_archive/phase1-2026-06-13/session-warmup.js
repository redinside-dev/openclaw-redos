const { execSync } = require('child_process');

// Simple session warmup script to prevent "no session found" A2A failures
// This pings the OpenClaw gateway to keep sessions alive

try {
  console.log('Starting session warmup...');
  
  // Get current sessions to keep them alive
  const sessionsList = execSync('openclaw sessions list', { 
    encoding: 'utf8', 
    timeout: 10000 
  });
  console.log('Sessions list retrieved successfully');
  
  // Also ping the gateway status to ensure it's responsive
  const gatewayStatus = execSync('openclaw gateway status', { 
    encoding: 'utf8', 
    timeout: 5000 
  });
  console.log('Gateway status retrieved successfully');
  
  console.log('Session warmup completed successfully');
  console.log(sessionsList);
  console.log(gatewayStatus);
  
} catch (error) {
  console.error('Session warmup failed:', error.message);
  // Don't throw - this is a cron job, we want it to fail silently
}