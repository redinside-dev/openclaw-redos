#!/usr/bin/env node

/**
 * Test HATAKE's Prompt Engineering
 */

import { hatakeParser } from './agents/hatake-parser.js';

async function testPromptEngineering() {
  console.log('\n🧪 Testing HATAKE Prompt Engineering\n');
  console.log('='.repeat(80));

  // Test case: Python REST API with authentication
  const testMessage = 'Create a Python REST API with user authentication and database integration';

  console.log(`\n📝 Original Message:`);
  console.log(`"${testMessage}"\n`);

  // Parse with HATAKE
  const brief = await hatakeParser.parse(testMessage);

  console.log('\n📊 HATAKE Analysis:');
  console.log(`   Intent: ${brief.intent.category} / ${brief.intent.type}`);
  console.log(`   Complexity: ${brief.complexity}`);
  console.log(`   Track: ${brief.track}`);
  console.log(`   Agents: ${brief.suggested_agents.join(', ')}`);

  // Show optimized prompts
  console.log('\n✨ OPTIMIZED PROMPTS:');
  console.log('='.repeat(80));

  for (const [agent, prompt] of Object.entries(brief.optimized_prompts || {})) {
    console.log(`\n🤖 ${agent} Agent Prompt:`);
    console.log('-'.repeat(80));
    console.log(prompt);
    console.log('-'.repeat(80));
  }

  // Show model recommendations
  console.log('\n🎯 MODEL RECOMMENDATIONS:');
  console.log('='.repeat(80));

  for (const [agent, config] of Object.entries(brief.model_recommendations || {})) {
    console.log(`\n${agent}:`);
    console.log(`   Model: ${config.model}`);
    console.log(`   Reason: ${config.reason}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Test complete!\n');
}

testPromptEngineering().catch(console.error);
