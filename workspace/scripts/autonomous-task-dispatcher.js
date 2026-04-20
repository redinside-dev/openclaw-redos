#!/usr/bin/env node
/**
 * Autonomous Task Dispatcher - reads AUTONOMOUS.md and dispatches tasks to agents
 */

import fs from 'fs';
import path from 'path';

const AUTONOMOUS_FILE = path.join(process.env.HOME, '.openclaw', 'workspace-main', 'AUTONOMOUS.md');

function readAutonomous() {
  if (!fs.existsSync(AUTONOMOUS_FILE)) {
    return null;
  }
  return fs.readFileSync(AUTONOMOUS_FILE, 'utf8');
}

function parseTasks(content) {
  // Simple parser: look for "## P1 — PENDING" and "## P2 — PENDING" sections
  const lines = content.split('\n');
  const tasks = [];
  let inPending = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('## P1 — PENDING') || line.includes('## P2 — PENDING')) {
      inPending = true;
      continue;
    }
    if (inPending && line.startsWith('## ')) {
      break; // End of pending section
    }
    if (inPending && line.trim() && !line.startsWith('#')) {
      // Task format: TASK-ID | agentId | description | [timestamp]
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 3) {
        tasks.push({
          id: parts[0],
          agentId: parts[1],
          description: parts[2],
          timestamp: parts[3] || null
        });
      }
    }
  }
  
  return tasks;
}

function updateTaskStatus(content, taskId, newStatus) {
  // Replace the task line to add timestamp if needed
  const lines = content.split('\n');
  const updated = lines.map(line => {
    if (line.includes(taskId)) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 3) {
        if (!parts[3]) {
          parts[3] = `[${newStatus} @ ${new Date().toISOString()}]`;
        } else {
          parts[3] = parts[3].replace(/\[.*\]/, `[${newStatus} @ ${new Date().toISOString()}]`);
        }
        return parts.join(' | ');
      }
    }
    return line;
  });
  return updated.join('\n');
}

async function dispatchTask(task) {
  // Use OpenClaw CLI to spawn agent session
  const { execSync } = require('child_process');
  const message = `${task.description}\n\n(Dispatched by autonomous-task-dispatcher)`;
  
  try {
    execSync(`openclaw agent --agent ${task.agentId} --message "${message.replace(/"/g, '\\"')}"`, {
      stdio: 'inherit',
      timeout: 300000
    });
    return true;
  } catch (err) {
    console.error(`Failed to dispatch task ${task.id}:`, err.message);
    return false;
  }
}

function logDispatch(taskId, agentId, status) {
  const logFile = path.join(process.env.HOME, '.openclaw', 'workspace', 'logs', 'dispatch.jsonl');
  const logEntry = {
    ts: new Date().toISOString(),
    taskId,
    agentId,
    status
  };
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
}

async function main() {
  console.log('Autonomous Task Dispatcher starting...');
  
  try {
    const content = readAutonomous();
    if (!content) {
      console.log('AUTONOMOUS.md not found, nothing to dispatch');
      process.exit(0);
    }
    
    const tasks = parseTasks(content);
    const pendingTasks = tasks.filter(t => !t.timestamp || t.timestamp.includes('PENDING'));
    
    if (pendingTasks.length === 0) {
      console.log('No PENDING tasks found');
      process.exit(0);
    }
    
    console.log(`Found ${pendingTasks.length} pending tasks, dispatching top 1-2`);
    
    // Take top 1-2 tasks
    const toDispatch = pendingTasks.slice(0, 2);
    let contentUpdated = content;
    
    for (const task of toDispatch) {
      console.log(`Dispatching ${task.id} to ${task.agentId}: ${task.description.substring(0, 50)}...`);
      contentUpdated = updateTaskStatus(contentUpdated, task.id, 'IN_PROGRESS');
      
      const success = await dispatchTask(task);
      if (success) {
        logDispatch(task.id, task.agentId, 'dispatched');
        console.log(`✅ Dispatched ${task.id}`);
      } else {
        console.log(`❌ Failed to dispatch ${task.id}`);
      }
    }
    
    // Write updated AUTONOMOUS.md
    fs.writeFileSync(AUTONOMOUS_FILE, contentUpdated, 'utf8');
    console.log('Updated AUTONOMOUS.md with IN_PROGRESS status');
    
  } catch (error) {
    console.error('Dispatcher error:', error);
    process.exit(1);
  }
}

main();