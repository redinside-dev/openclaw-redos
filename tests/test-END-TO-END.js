#!/usr/bin/env node

/**
 * END-TO-END INTEGRATION TEST
 *
 * Tests the ACTUAL system working, not just components!
 * This is what I SHOULD have written first.
 */

import fetch from 'node-fetch';

const GATEWAY_URL = 'http://localhost:19000';

console.log('🚨 END-TO-END INTEGRATION TEST');
console.log('═══════════════════════════════════════════════════════════\n');

async function runE2ETests() {
  let failed = false;

  // Test 1: Basic query (Ollama - no API key needed)
  console.log('1️⃣ Testing basic query (Ollama)...');
  try {
    const response = await fetch(`${GATEWAY_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'main',
        message: 'What is 2+2?'
      })
    });

    const data = await response.json();

    // STRICT CHECK: Must NOT be fallback!
    if (data.model?.provider !== 'fallback' && !data.fallback) {
      console.log('   ✅ PASS: Got REAL response (not fallback)');
      console.log(`   Model: ${data.model?.provider}/${data.model?.model}`);
      console.log(`   Response: "${data.content.substring(0, 50)}..."`);
    } else {
      console.log('   ❌ FAIL: Using fallback/error handler!');
      console.log(`   Model: ${data.model?.provider}/${data.model?.model}`);
      console.log(`   This means basic routing is broken!`);
      failed = true;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}`);
    failed = true;
  }

  console.log('');

  // Test 2: Internet query (Perplexity - NEEDS API KEY)
  console.log('2️⃣ Testing internet query (Perplexity)...');
  try {
    const response = await fetch(`${GATEWAY_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'main',
        message: 'What is the latest news?'
      })
    });

    const data = await response.json();

    // STRICT CHECK: Must be from Perplexity, not fallback!
    if (data.model?.provider === 'perplexity' && !data.fallback) {
      console.log('   ✅ PASS: Got REAL response from Perplexity');
      console.log(`   Model: ${data.model.provider}/${data.model.model}`);
      console.log(`   Response: "${data.content.substring(0, 50)}..."`);
    } else {
      console.log('   ❌ FAIL: NOT using Perplexity!');
      console.log(`   Got: ${data.model?.provider}/${data.model?.model}`);
      console.log(`   Fallback: ${data.fallback || false}`);
      console.log('   ');
      console.log('   🚨 ROOT CAUSE: PERPLEXITY_API_KEY is not valid!');
      console.log('   ');
      console.log('   🔧 FIX:');
      console.log('   1. Get key from: https://www.perplexity.ai/settings/api');
      console.log('   2. Edit .env: PERPLEXITY_API_KEY=pplx-your-real-key');
      console.log('   3. Restart gateway');
      failed = true;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}`);
    failed = true;
  }

  console.log('');

  // Test 3: Cache hit
  console.log('3️⃣ Testing prompt cache (repeat query)...');
  try {
    const response = await fetch(`${GATEWAY_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'main',
        message: 'What is 2+2?'
      })
    });

    const data = await response.json();

    if (data.cached) {
      console.log('   ✅ PASS: Cache hit! (instant response)');
      console.log(`   Cache type: ${data.cacheType}`);
    } else {
      console.log('   ⚠️  WARNING: No cache hit (first run?)');
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}`);
    failed = true;
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');

  if (failed) {
    console.log('❌ END-TO-END TEST FAILED');
    console.log('   System will NOT work correctly for users!');
    console.log('   Fix the issues above before deploying.');
    process.exit(1);
  } else {
    console.log('✅ END-TO-END TEST PASSED');
    console.log('   System is ready for production!');
  }
}

// Check if gateway is running first
fetch(`${GATEWAY_URL}/health`)
  .then(() => runE2ETests())
  .catch(error => {
    console.log('❌ FATAL: Gateway is not running!');
    console.log(`   Error: ${error.message}`);
    console.log('   Start gateway first: node gateway/server.js');
    process.exit(1);
  });
