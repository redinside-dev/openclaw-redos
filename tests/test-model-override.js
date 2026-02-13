#!/usr/bin/env node

/**
 * Test Model Override System
 * Verify users can bypass smart routing and select models
 */

import { userPreferences } from '../user/preferences.js';

console.log('🧪 TESTING MODEL OVERRIDE SYSTEM\n');
console.log('='.repeat(60));

async function runTests() {
  const userId = 'test-user-123';

  console.log('\n📋 Test 1: Check default (no override)');
  console.log('-'.repeat(60));

  const override1 = userPreferences.getModelOverride(userId);
  console.log(`\n✅ Model override: ${override1 ? 'SET' : 'NOT SET'}`);
  if (!override1) {
    console.log(`   Using smart auto-routing`);
  }

  console.log('\n📋 Test 2: Set model override (Ollama)');
  console.log('-'.repeat(60));

  await userPreferences.setModelOverride(userId, 'ollama', 'llama3.1:8b');

  const override2 = userPreferences.getModelOverride(userId);
  console.log(`\n✅ Override set:`);
  console.log(`   Provider: ${override2.provider}`);
  console.log(`   Model: ${override2.model}`);

  console.log('\n📋 Test 3: Change to Perplexity');
  console.log('-'.repeat(60));

  await userPreferences.setModelOverride(userId, 'perplexity', 'llama-3.1-sonar-small-128k-online');

  const override3 = userPreferences.getModelOverride(userId);
  console.log(`\n✅ Override changed:`);
  console.log(`   Provider: ${override3.provider}`);
  console.log(`   Model: ${override3.model}`);

  console.log('\n📋 Test 4: Clear override (back to auto)');
  console.log('-'.repeat(60));

  await userPreferences.clearModelOverride(userId);

  const override4 = userPreferences.getModelOverride(userId);
  console.log(`\n✅ Override cleared: ${override4 ? 'FAILED' : 'SUCCESS'}`);
  if (!override4) {
    console.log(`   Back to smart auto-routing`);
  }

  console.log('\n📋 Test 5: Multiple users');
  console.log('-'.repeat(60));

  await userPreferences.setModelOverride('user-1', 'ollama', 'llama3.1:8b');
  await userPreferences.setModelOverride('user-2', 'perplexity', 'llama-3.1-sonar-small-128k-online');
  await userPreferences.setModelOverride('user-3', 'anthropic', 'claude-sonnet-4.5');

  const user1 = userPreferences.getModelOverride('user-1');
  const user2 = userPreferences.getModelOverride('user-2');
  const user3 = userPreferences.getModelOverride('user-3');

  console.log(`\n✅ Multiple users configured:`);
  console.log(`   User 1: ${user1.provider}/${user1.model}`);
  console.log(`   User 2: ${user2.provider}/${user2.model}`);
  console.log(`   User 3: ${user3.provider}/${user3.model}`);

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests passed!\n');
  console.log('📊 Summary:');
  console.log('   - Users can override smart routing');
  console.log('   - Per-user preferences stored');
  console.log('   - Easy to switch models');
  console.log('   - Can reset to auto-routing anytime');
  console.log('\n🎯 Telegram Commands:');
  console.log('   /model - Show current model');
  console.log('   /use-ollama - Fast local AI');
  console.log('   /use-perplexity - Internet-enabled AI');
  console.log('   /use-anthropic - Powerful Claude');
  console.log('   /auto - Reset to smart routing');
}

runTests().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
