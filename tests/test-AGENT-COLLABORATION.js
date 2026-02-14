#!/usr/bin/env node

/**
 * AGENT COLLABORATION TEST
 *
 * Tests that agents work together like a real team:
 * - Share knowledge
 * - Communicate through workspace
 * - Hand off work to each other
 * - Build on each other's results
 */

import { teamWorkspace } from '../collaboration/team-workspace.js';
import { edRedOrchestrator } from '../agents/ed-red-orchestrator.js';
import { vectorMemory } from '../memory/vector-memory.js';

console.log('🧪 AGENT COLLABORATION TEST');
console.log('═══════════════════════════════════════════════════════════\n');

async function testAgentCollaboration() {
  let failed = false;

  // Test 1: Agent posts message to workspace
  console.log('1️⃣ Testing agent-to-agent messaging...');
  try {
    const msgId = await teamWorkspace.postMessage(
      'ENG',
      'I need help with Bitcoin API integration',
      { to: 'RESEARCH', type: 'question', tags: ['api', 'bitcoin'] }
    );

    if (msgId) {
      console.log('   ✅ PASS: Engineering Agent posted message to Research Agent\n');
    } else {
      console.log('   ❌ FAIL: Message not posted\n');
      failed = true;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    failed = true;
  }

  // Test 2: Agent reads messages
  console.log('2️⃣ Testing message retrieval...');
  try {
    const messages = await teamWorkspace.getMessagesFor('RESEARCH');

    if (messages.length > 0) {
      console.log(`   ✅ PASS: Research Agent received ${messages.length} message(s)`);
      console.log(`   Message: "${messages[0].message}"\n`);
    } else {
      console.log('   ❌ FAIL: No messages retrieved\n');
      failed = true;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    failed = true;
  }

  // Test 3: Agent shares artifact
  console.log('3️⃣ Testing artifact sharing...');
  try {
    const artifactId = await teamWorkspace.shareArtifact(
      'ENG',
      'code',
      'const bitcoin = { price: 50000 }; // Sample code',
      { reviewBy: 'OPS', tags: ['bitcoin', 'sample'] }
    );

    if (artifactId) {
      console.log('   ✅ PASS: Code artifact shared with DevOps for review\n');
    } else {
      console.log('   ❌ FAIL: Artifact not shared\n');
      failed = true;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    failed = true;
  }

  // Test 4: Agent retrieves artifact
  console.log('4️⃣ Testing artifact retrieval...');
  try {
    const messages = await teamWorkspace.getMessagesFor('OPS');
    const reviewRequest = messages.find(m => m.type === 'question' && m.tags.includes('review-request'));

    if (reviewRequest && reviewRequest.artifacts.length > 0) {
      const artifact = await teamWorkspace.getArtifact(reviewRequest.artifacts[0]);

      if (artifact && artifact.content.includes('bitcoin')) {
        console.log('   ✅ PASS: DevOps Agent retrieved code for review');
        console.log(`   Code: "${artifact.content}"\n`);
      } else {
        console.log('   ❌ FAIL: Artifact content incorrect\n');
        failed = true;
      }
    } else {
      console.log('   ❌ FAIL: No review request found\n');
      failed = true;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    failed = true;
  }

  // Test 5: Agent shares knowledge
  console.log('5️⃣ Testing knowledge sharing...');
  try {
    const knowledgeId = await teamWorkspace.shareKnowledge(
      'RESEARCH',
      'Bitcoin API Integration',
      'Use CoinGecko API for free Bitcoin prices: https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      ['api', 'bitcoin', 'integration']
    );

    if (knowledgeId) {
      console.log('   ✅ PASS: Research Agent shared knowledge with team\n');
    } else {
      console.log('   ❌ FAIL: Knowledge not shared\n');
      failed = true;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    failed = true;
  }

  // Test 6: Agent searches knowledge
  console.log('6️⃣ Testing knowledge search...');
  try {
    const result = await teamWorkspace.searchKnowledge('Bitcoin API', 'ENG');
    const knowledge = Array.isArray(result) ? result : (result.memories || []);

    if (knowledge.length > 0) {
      console.log(`   ✅ PASS: Found ${knowledge.length} relevant solution(s) from team\n`);
    } else {
      console.log('   ⚠️  WARNING: No knowledge found (might need vector memory to populate)\n');
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    failed = true;
  }

  // Test 7: Task workflow
  console.log('7️⃣ Testing task workflow (start → complete → handoff)...');
  try {
    const taskId = await teamWorkspace.startTask('ENG', 'Create Bitcoin price tracker');
    const task = await teamWorkspace.completeTask(taskId, 'ENG',
      { content: 'Bitcoin tracker created successfully' },
      { handoffTo: 'OPS' }
    );

    const opsMessages = await teamWorkspace.getMessagesFor('OPS');
    const handoffMsg = opsMessages.find(m => m.tags.includes('handoff'));

    if (task.status === 'completed' && handoffMsg) {
      console.log('   ✅ PASS: Task completed and handed off to DevOps');
      console.log(`   Handoff message: "${handoffMsg.message}"\n`);
    } else {
      console.log('   ❌ FAIL: Task workflow incomplete\n');
      failed = true;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    failed = true;
  }

  // Test 8: Workspace status
  console.log('8️⃣ Testing workspace status...');
  try {
    const status = teamWorkspace.getStatus();

    console.log(`   Active tasks: ${status.activeTasks}`);
    console.log(`   Recent messages: ${status.recentMessages}`);
    console.log(`   Total artifacts: ${status.totalArtifacts}`);
    console.log(`   Knowledge items: ${status.knowledgeItems}`);
    console.log(`   Online agents: ${status.onlineAgents}`);

    if (status.onlineAgents > 0) {
      console.log('   ✅ PASS: Workspace operational\n');
    } else {
      console.log('   ❌ FAIL: No agents online\n');
      failed = true;
    }
  } catch (error) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    failed = true;
  }

  console.log('═══════════════════════════════════════════════════════════');

  if (failed) {
    console.log('❌ AGENT COLLABORATION TEST FAILED');
    console.log('   Agents are NOT working together properly!');
    process.exit(1);
  } else {
    console.log('✅ AGENT COLLABORATION TEST PASSED');
    console.log('   Agents can communicate and collaborate like a real team!');
    console.log('   \n   Next: Test with actual orchestrator execution');
  }
}

// Run test
testAgentCollaboration().catch(error => {
  console.error('❌ FATAL ERROR:', error);
  process.exit(1);
});
