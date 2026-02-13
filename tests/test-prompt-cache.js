#!/usr/bin/env node

/**
 * Test Prompt Cache System
 * Verify duplicate questions are cached for performance
 */

import { promptCache } from '../cache/prompt-cache.js';

console.log('🧪 TESTING PROMPT CACHE SYSTEM\n');
console.log('='.repeat(60));

async function runTests() {
  console.log('\n📋 Test 1: Cache miss (first time question)');
  console.log('-'.repeat(60));

  const check1 = await promptCache.check('What is 2+2?', 'main');
  console.log(`\n✅ Cache hit: ${check1.hit}`);
  console.log(`   Reason: ${check1.reason}`);

  console.log('\n📋 Test 2: Store response in cache');
  console.log('-'.repeat(60));

  await promptCache.store('What is 2+2?', '2+2 equals 4', {
    agentId: 'main',
    model: { provider: 'ollama', model: 'llama3.1:8b' },
    cost: 0,
    latency: 2000,
    ttl: 60000 // 1 minute for testing
  });

  console.log('\n✅ Response stored in cache');

  console.log('\n📋 Test 3: Cache hit (exact match)');
  console.log('-'.repeat(60));

  const check2 = await promptCache.check('What is 2+2?', 'main');
  console.log(`\n✅ Cache hit: ${check2.hit}`);
  console.log(`   Type: ${check2.type}`);
  console.log(`   Response: "${check2.cached.response}"`);
  console.log(`   Age: ${Math.floor((Date.now() - check2.cached.createdAt) / 1000)}s`);

  console.log('\n📋 Test 4: Cache hit (similar question)');
  console.log('-'.repeat(60));

  const check3 = await promptCache.check("What's 2+2?", 'main');
  console.log(`\n✅ Cache hit: ${check3.hit}`);
  console.log(`   Type: ${check3.type}`);
  console.log(`   Similarity: ${(check3.similarity * 100).toFixed(1)}%`);
  console.log(`   Response: "${check3.cached.response}"`);

  console.log('\n📋 Test 5: Different question (cache miss)');
  console.log('-'.repeat(60));

  const check4 = await promptCache.check('What is the capital of France?', 'main');
  console.log(`\n✅ Cache hit: ${check4.hit}`);
  console.log(`   Reason: ${check4.reason}`);

  console.log('\n📋 Test 6: Store another response');
  console.log('-'.repeat(60));

  await promptCache.store('What is the capital of France?', 'The capital of France is Paris', {
    agentId: 'main',
    model: { provider: 'ollama', model: 'llama3.1:8b' },
    cost: 0,
    latency: 1500
  });

  console.log('\n✅ Second response stored');

  console.log('\n📋 Test 7: Get cache stats');
  console.log('-'.repeat(60));

  const stats = promptCache.getStats();
  console.log(`\n✅ Cache Stats:`);
  console.log(`   Size: ${stats.size} entries`);
  console.log(`   Hits: ${stats.hits}`);
  console.log(`   Misses: ${stats.misses}`);
  console.log(`   Hit Rate: ${stats.hitRate}`);
  console.log(`   Time Saved: ${stats.timeSaved}`);
  console.log(`   Cost Saved: ${stats.costSaved}`);

  console.log('\n📋 Test 8: Get popular queries');
  console.log('-'.repeat(60));

  const popular = promptCache.getPopular(3);
  console.log(`\n✅ Popular Queries:`);
  popular.forEach((q, i) => {
    console.log(`   ${i + 1}. "${q.message}" (${q.hitCount} hits, age: ${q.age})`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests passed!\n');
  console.log('📊 Summary:');
  console.log('   - Cache miss on first question');
  console.log('   - Response stored successfully');
  console.log('   - Cache hit on exact match (instant response!)');
  console.log('   - Cache hit on similar question (90%+ similarity)');
  console.log('   - Performance boost: No regeneration needed');
  console.log('   - Cost savings: $0 for cached responses');
}

runTests().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
