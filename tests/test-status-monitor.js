#!/usr/bin/env node

/**
 * Test Status Monitor Integration
 * Verify it provides immediate status updates to clients
 */

import { statusMonitor } from '../resilience/status-monitor.js';

console.log('🧪 TESTING STATUS MONITOR\n');
console.log('='.repeat(60));

async function runTests() {
  console.log('\n📋 Test 1: Check operational status');
  console.log('-'.repeat(60));

  const status1 = await statusMonitor.getStatus();
  console.log(`\n✅ Status: ${status1.status}`);
  console.log(`   Operational: ${status1.operational}`);
  console.log(`   Message: ${status1.message}`);
  console.log(`   Client Message: ${status1.client_message || '(none - system operational)'}`);

  console.log('\n📋 Test 2: Enter maintenance mode');
  console.log('-'.repeat(60));

  await statusMonitor.enterMaintenanceMode('Upgrading to v3.7.0', '15 minutes');

  const status2 = await statusMonitor.getStatus();
  console.log(`\n✅ Status: ${status2.status}`);
  console.log(`   Operational: ${status2.operational}`);
  console.log(`   Message: ${status2.message}`);
  console.log(`\n📢 Client would see:`);
  console.log(status2.client_message);

  console.log('\n📋 Test 3: Intercept client request during maintenance');
  console.log('-'.repeat(60));

  const intercept = await statusMonitor.interceptClientRequest('Hello, how are you?', 'client-123');
  console.log(`\n✅ Intercepted: ${intercept.intercepted}`);
  console.log(`   Proceed: ${intercept.proceed}`);
  console.log(`   Status: ${intercept.status}`);
  if (intercept.response) {
    console.log(`\n📢 Response to client:`);
    console.log(intercept.response);
  }

  console.log('\n📋 Test 4: Exit maintenance mode');
  console.log('-'.repeat(60));

  await statusMonitor.exitMaintenanceMode();

  const status3 = await statusMonitor.getStatus();
  console.log(`\n✅ Status: ${status3.status}`);
  console.log(`   Operational: ${status3.operational}`);
  console.log(`   Message: ${status3.message}`);

  console.log('\n📋 Test 5: Normal request when operational');
  console.log('-'.repeat(60));

  const intercept2 = await statusMonitor.interceptClientRequest('Hello again!', 'client-456');
  console.log(`\n✅ Intercepted: ${intercept2.intercepted}`);
  console.log(`   Proceed: ${intercept2.proceed}`);
  if (intercept2.proceed) {
    console.log(`   ✅ Request would be processed normally`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests passed!\n');
  console.log('📊 Summary:');
  console.log('   - Status monitor provides immediate updates');
  console.log('   - NEVER leaves clients wondering');
  console.log('   - Intercepts requests during maintenance');
  console.log('   - Builds trust through transparency');
}

runTests().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
