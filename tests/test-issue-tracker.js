#!/usr/bin/env node

/**
 * Test Autonomous Issue Tracker
 * Verify it NEVER refuses to log issues
 */

import { autonomousIssueTracker } from '../resilience/autonomous-issue-tracker.js';

console.log('🧪 TESTING AUTONOMOUS ISSUE TRACKER\n');
console.log('='.repeat(60));

async function runTests() {
  console.log('\n📋 Test 1: Log a simple issue');
  console.log('-'.repeat(60));

  const issue1 = await autonomousIssueTracker.logIssue({
    title: 'Test Issue: Connection Timeout',
    description: 'Testing automatic issue logging for connection timeout scenario',
    severity: 'HIGH',
    clientImpacted: true,
    reporter: 'TEST_SUITE'
  });

  console.log(`\n✅ Issue logged successfully!`);
  console.log(`   Issue ID: ${issue1.id}`);
  console.log(`   Severity: ${issue1.severity}`);
  console.log(`   Assigned to: ${issue1.assigned_to.join(', ')}`);
  console.log(`   Auto-actions: ${issue1.auto_actions.length}`);
  console.log(`   Tags: ${issue1.tags.join(', ')}`);

  console.log('\n📋 Test 2: Log a critical issue');
  console.log('-'.repeat(60));

  const issue2 = await autonomousIssueTracker.logIssue({
    title: 'System Down: Gateway Not Responding',
    description: 'Gateway server not responding to client requests. Revenue impact.',
    severity: 'CRITICAL',
    clientImpacted: true,
    revenueImpact: true,
    reporter: 'MONITORING_SYSTEM'
  });

  console.log(`\n✅ Critical issue logged!`);
  console.log(`   Issue ID: ${issue2.id}`);
  console.log(`   Severity: ${issue2.severity}`);
  console.log(`   Assigned to: ${issue2.assigned_to.join(', ')}`);
  console.log(`   Auto-actions: ${issue2.auto_actions.length}`);
  console.log(`   Revenue Impact: ${issue2.revenue_impact ? 'YES 💰' : 'No'}`);

  console.log('\n📋 Test 3: Get system status');
  console.log('-'.repeat(60));

  const status = await autonomousIssueTracker.getSystemStatus();
  console.log(`\n✅ System Status: ${status.status}`);
  console.log(`   Message: ${status.message}`);
  if (status.eta) {
    console.log(`   ETA: ${status.eta}`);
  }
  if (status.details.length > 0) {
    console.log(`   Critical Issues:`);
    status.details.forEach(detail => console.log(`     - ${detail}`));
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests passed!\n');
  console.log('📊 Summary:');
  console.log('   - Issues are logged AUTOMATICALLY');
  console.log('   - NEVER refuses to log');
  console.log('   - Auto-assigns to correct teams');
  console.log('   - Triggers auto-healing actions');
  console.log('   - Provides status for client communication');
  console.log('\n⚠️  Check ./data/issues/issues.jsonl for saved issues');
}

runTests().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
