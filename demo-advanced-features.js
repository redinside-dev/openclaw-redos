#!/usr/bin/env node

/**
 * Advanced Features Demo
 * Demonstrates CEO agents, Kanban board, and Autonomous learning
 */

import { ceoAgent } from './agents/ceo-agent.js';
import { kanbanBoard } from './kanban/board.js';
import { autonomousLearner } from './learning/autonomous-learner.js';

console.log('\n' + '═'.repeat(70));
console.log('🚀 OPENCLAW ADVANCED FEATURES DEMO');
console.log('═'.repeat(70) + '\n');

async function demo() {
  // ============================================================
  // PART 1: KANBAN BOARD
  // ============================================================
  console.log('\n📋 PART 1: KANBAN BOARD DEMO\n');
  console.log('─'.repeat(70));

  // Create some cards
  const card1 = kanbanBoard.createCard(
    'Implement user authentication',
    'Add JWT-based authentication to the API',
    { priority: 'high', assignee: 'eng', tags: ['security', 'api'] }
  );

  const card2 = kanbanBoard.createCard(
    'Design dashboard UI',
    'Create mockups for the main dashboard',
    { priority: 'normal', assignee: 'zen', column: 'todo', tags: ['design', 'ui'] }
  );

  const card3 = kanbanBoard.createCard(
    'Write API documentation',
    'Document all REST endpoints',
    { priority: 'low', column: 'todo', tags: ['docs'] }
  );

  const card4 = kanbanBoard.createCard(
    'Fix login bug',
    'Users cannot log in with special characters in password',
    { priority: 'urgent', assignee: 'eng', column: 'inProgress', tags: ['bug', 'critical'] }
  );

  // Move some cards
  kanbanBoard.moveCard(card1, 'inProgress');
  kanbanBoard.moveCard(card2, 'review');

  // Add comments
  kanbanBoard.addComment(card1, 'eng', 'Started implementing JWT tokens');
  kanbanBoard.addComment(card4, 'ceo', 'This is blocking production deployment!');

  // Display board
  kanbanBoard.printBoard();

  // Show stats
  console.log('\n📊 Board Statistics:');
  const stats = kanbanBoard.getStats();
  console.log(JSON.stringify(stats, null, 2));

  // ============================================================
  // PART 2: CEO AGENT & SECRETARIES
  // ============================================================
  console.log('\n\n👔 PART 2: CEO AGENT & SECRETARY DEMO\n');
  console.log('─'.repeat(70));

  // Create tasks
  const task1Id = ceoAgent.createTask(
    'Launch new feature',
    'Complete and deploy the new dashboard feature',
    { priority: 'high', status: 'in_progress' }
  );

  const task2Id = ceoAgent.createTask(
    'Code review backlog',
    'Review all pending pull requests',
    { priority: 'normal', status: 'todo' }
  );

  // Assign tasks
  ceoAgent.assignTask(task1Id, 'eng');
  ceoAgent.assignTask(task2Id, 'zen');

  // Spawn a secretary to monitor task1
  const task1 = ceoAgent.tasks.get(task1Id);
  console.log('\n📌 Spawning secretary to monitor feature launch...');

  const secretaryId = ceoAgent.spawnSecretary(task1, {
    role: 'monitor',
    maxRounds: 3,
    checkInterval: 5000 // 5 seconds for demo
  });

  console.log(`   Secretary ${secretaryId} spawned!`);
  console.log('   Will run 3 monitoring rounds at 5-second intervals...');

  // Show CEO dashboard
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('\n📊 CEO Dashboard:');
  const dashboard = ceoAgent.getDashboard();
  console.log(JSON.stringify(dashboard, null, 2));

  // ============================================================
  // PART 3: AUTONOMOUS LEARNING
  // ============================================================
  console.log('\n\n🎓 PART 3: AUTONOMOUS LEARNING DEMO\n');
  console.log('─'.repeat(70));

  // Simulate agent experiences
  console.log('\nRecording experiences for agent "eng"...\n');

  autonomousLearner.recordExperience(
    'eng',
    'Fix authentication bug',
    'Successfully fixed JWT token validation',
    { success: true, latency: 1200, cost: 0, complexity: 6, type: 'code' }
  );

  autonomousLearner.recordExperience(
    'eng',
    'Implement new API endpoint',
    'Created /api/users endpoint with full CRUD',
    { success: true, latency: 3400, cost: 0, complexity: 7, type: 'code' }
  );

  autonomousLearner.recordExperience(
    'eng',
    'Write unit tests',
    'Added 25 new unit tests',
    { success: true, latency: 800, cost: 0, complexity: 4, type: 'code' }
  );

  autonomousLearner.recordExperience(
    'eng',
    'Debug production issue',
    'Could not reproduce the bug',
    { success: false, latency: 8000, cost: 0, complexity: 8, type: 'debug' }
  );

  autonomousLearner.recordExperience(
    'eng',
    'Refactor codebase',
    'Refactored authentication module',
    { success: true, latency: 4500, cost: 0, complexity: 6, type: 'refactor' }
  );

  // This 5th experience will trigger reflection
  console.log('\n🤔 Recording 5th experience (will trigger reflection)...\n');

  await autonomousLearner.recordExperience(
    'eng',
    'Optimize database queries',
    'Reduced query time by 60%',
    { success: true, latency: 2100, cost: 0, complexity: 7, type: 'optimization' }
  );

  // Wait for async reflection/evaluation/learning to complete
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Show learning summary
  console.log('\n📚 Learning Summary for "eng":');
  const summary = autonomousLearner.getLearningSummary('eng');
  console.log(JSON.stringify(summary, null, 2));

  // Show all agent summaries
  console.log('\n📊 All Agent Learning Summaries:');
  const allSummaries = autonomousLearner.getAllSummaries();
  console.log(JSON.stringify(allSummaries, null, 2));

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n\n' + '═'.repeat(70));
  console.log('✅ DEMO COMPLETE!');
  console.log('═'.repeat(70));

  console.log('\n📋 What you just saw:');
  console.log('   1. Kanban Board - Created 4 cards, moved them, added comments');
  console.log('   2. CEO Agent - Created tasks, assigned them, spawned a secretary');
  console.log('   3. Autonomous Learning - Recorded experiences, triggered reflection cycle');

  console.log('\n🚀 Your AI company now has:');
  console.log('   ✅ Smart cost routing (Day 1)');
  console.log('   ✅ Real-time cost tracking (Day 1)');
  console.log('   ✅ CEO sub-agent system (Day 2)');
  console.log('   ✅ Kanban board (Day 2)');
  console.log('   ✅ Autonomous learning (Day 2)');

  console.log('\n🌐 All features available via REST API:');
  console.log('   POST /api/kanban/cards - Create card');
  console.log('   GET  /api/kanban/board - Get board');
  console.log('   POST /api/ceo/secretaries - Spawn secretary');
  console.log('   GET  /api/ceo/dashboard - CEO dashboard');
  console.log('   POST /api/learning/experience - Record experience');
  console.log('   GET  /api/learning/:agent/summary - Learning summary');

  console.log('\n💡 Next: Start the gateway to use the API!');
  console.log('   npm start\n');
}

// Run demo
demo().catch(error => {
  console.error('\n❌ Demo error:', error);
  process.exit(1);
});
