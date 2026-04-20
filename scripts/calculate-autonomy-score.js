#!/usr/bin/env node
/**
 * calculate-autonomy-score.js
 * Calculates real_autonomy_score from tasks-log.md and updates STATE.yaml
 * Formula: (verified_completions / dispatched_tasks) * 100
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE_DIR = path.join(process.env.HOME, '.openclaw', 'workspace');
const TASKS_LOG_PATH = path.join(WORKSPACE_DIR, 'tasks-log.md');
const STATE_YAML_PATH = path.join(WORKSPACE_DIR, 'STATE.yaml');
const STATE_YAML_TMP = path.join(WORKSPACE_DIR, 'STATE.yaml.tmp');

function calculateAutonomyScore() {
  try {
    // Read tasks-log.md
    if (!fs.existsSync(TASKS_LOG_PATH)) {
      console.error(`ERROR: ${TASKS_LOG_PATH} not found`);
      process.exit(1);
    }

    const tasksLog = fs.readFileSync(TASKS_LOG_PATH, 'utf8');
    const lines = tasksLog.split('\n');
    
    // Count dispatched tasks (all non-header, non-empty lines with task IDs)
    // Count verified completions (lines with status "done")
    let dispatchedTasks = 0;
    let verifiedCompletions = 0;
    const perAgent = {};

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip headers, separators, empty lines
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('|---') ||
          trimmed.startsWith('| Task ID') || trimmed === '---') {
        continue;
      }

      // Parse task line: AUTO-NNN | agentId | timestamp | status | result
      if (trimmed.startsWith('|') || /^(AUTO|TASK|BOOTSTRAP|CONTEXT)-/.test(trimmed)) {
        dispatchedTasks++;
        const parts = trimmed.replace(/^\|/, '').split('|').map(s => s.trim());
        const agentId = parts[1] || 'unknown';
        const status = parts[3] || '';
        if (!perAgent[agentId]) perAgent[agentId] = { dispatched: 0, completed: 0 };
        perAgent[agentId].dispatched++;

        if (status === 'done' || trimmed.includes('| done |') || trimmed.includes('|done|')) {
          verifiedCompletions++;
          perAgent[agentId].completed++;
        }
      }
    }

    // Calculate score
    const realAutonomyScore = dispatchedTasks > 0
      ? Math.round((verifiedCompletions / dispatchedTasks) * 100)
      : 0;

    console.log(`Dispatched tasks: ${dispatchedTasks}`);
    console.log(`Verified completions: ${verifiedCompletions}`);
    console.log(`Real autonomy score: ${realAutonomyScore}%`);
    console.log('Per-agent breakdown:', JSON.stringify(perAgent));

    // Read STATE.yaml
    if (!fs.existsSync(STATE_YAML_PATH)) {
      console.error(`ERROR: ${STATE_YAML_PATH} not found`);
      process.exit(1);
    }

    const stateContent = fs.readFileSync(STATE_YAML_PATH, 'utf8');
    const state = yaml.load(stateContent);

    // Update metrics section
    if (!state.metrics) {
      state.metrics = {};
    }

    state.metrics.real_autonomy_score = realAutonomyScore;
    state.metrics.dispatched_tasks_total = dispatchedTasks;
    state.metrics.verified_completions_total = verifiedCompletions;
    state.metrics.last_autonomy_calc = new Date().toISOString();
    state.metrics.per_agent_completions = perAgent;
    state.last_updated = new Date().toISOString();
    state.updated_by = 'ops-autonomy-calc';

    // Atomic write: write to .tmp then rename
    const updatedYaml = yaml.dump(state, { lineWidth: -1, noRefs: true });
    fs.writeFileSync(STATE_YAML_TMP, updatedYaml, 'utf8');
    fs.renameSync(STATE_YAML_TMP, STATE_YAML_PATH);

    console.log(`✅ STATE.yaml updated with real_autonomy_score: ${realAutonomyScore}%`);
    
    return {
      realAutonomyScore,
      dispatchedTasks,
      verifiedCompletions
    };

  } catch (error) {
    console.error('ERROR calculating autonomy score:', error.message);
    process.exit(1);
  }
}

// Run calculation
const result = calculateAutonomyScore();

// Append to tasks-log.md
try {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19).replace(/-/g, '-').substring(0, 16) + ' EST';
  const logEntry = `AUTO-018 | ops | ${timestamp} | done | Calculated real_autonomy_score=${result.realAutonomyScore}% (${result.verifiedCompletions}/${result.dispatchedTasks} tasks)\n`;
  
  fs.appendFileSync(TASKS_LOG_PATH, logEntry, 'utf8');
  console.log(`✅ Appended to tasks-log.md: ${logEntry.trim()}`);
} catch (error) {
  console.error('ERROR appending to tasks-log.md:', error.message);
}
