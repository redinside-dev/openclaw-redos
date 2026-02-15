#!/usr/bin/env node

/**
 * ONE-TIME DEADLOCK BREAKER
 * Force-reassigns DEVOPS tasks to active workers
 */

import fs from 'fs/promises';

console.log('🔧 BREAKING DEADLOCK - Force-reassigning DEVOPS tasks...\n');

// Load queue
const queue = JSON.parse(await fs.readFile('workspace/tasks/queue.json', 'utf8'));

// Find DEVOPS tasks
const devopsTasks = queue.pending.filter(t =>
  t.assigned_to && t.assigned_to.includes('DEVOPS')
);

console.log(`Found ${devopsTasks.length} DEVOPS tasks stuck in queue:`);
devopsTasks.forEach(t => {
  console.log(`  📋 ${t.id} - ${t.title}`);
});

// Reassign to BACKEND and FRONTEND (active workers)
let reassigned = 0;
queue.pending.forEach(task => {
  if (task.assigned_to && task.assigned_to.includes('DEVOPS')) {
    console.log(`\n🔄 Reassigning ${task.id}:`);
    console.log(`   FROM: ${task.assigned_to.join(', ')}`);

    // Replace DEVOPS with BACKEND and FRONTEND
    task.assigned_to = task.assigned_to.filter(a => a !== 'DEVOPS');
    task.assigned_to.push('BACKEND', 'FRONTEND');
    task.assigned_to = [...new Set(task.assigned_to)]; // dedupe

    console.log(`   TO: ${task.assigned_to.join(', ')}`);
    console.log(`   ✅ Reassigned to active workers`);

    // Add reassignment note
    task.reassignment_history = task.reassignment_history || [];
    task.reassignment_history.push({
      timestamp: new Date().toISOString(),
      from: ['DEVOPS'],
      to: ['BACKEND', 'FRONTEND'],
      reason: 'DEVOPS worker unavailable - manual deadlock break',
      by: 'bootstrap'
    });

    reassigned++;
  }
});

// Save updated queue
await fs.writeFile('workspace/tasks/queue.json', JSON.stringify(queue, null, 2));

console.log(`\n✅ Deadlock broken: ${reassigned} tasks reassigned to active agents`);
console.log('   BACKEND and FRONTEND workers will pick them up within 10-30 seconds');
console.log('\n📝 Note: This is ONE-TIME fix. Agents will implement A+B to prevent recurrence.');
