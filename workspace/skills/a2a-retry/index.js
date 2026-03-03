#!/usr/bin/env node
/**
 * A2A Retry Skill - Replaces direct sessions_send calls with retry logic
 */

const SKILL = {
  name: "a2a-retry",
  description: "Send message to another agent with retry logic and Telegram fallback",
  
  input_schema: {
    type: "object",
    properties: {
      agent: {
        type: "string",
        description: "Target agent ID (eng, ops, research, etc.)"
      },
      message: {
        type: "string",
        description: "Message to send"
      },
      context: {
        type: "object",
        description: "Additional context (priority, deadline, etc.)",
        properties: {
          priority: { type: "string" },
          deadline: { type: "string" },
          task_type: { type: "string" }
        }
      }
    },
    required: ["agent", "message"]
  }
};

async function run({ agent, message, context = {} }) {
  const fs = require('fs').promises;
  const path = require('path');
  const { spawn } = require('child_process');
  
  const HANDOFFS_DIR = path.join(process.env.HOME, 'workspace/handoffs');
  const MAX_RETRIES = 3;
  const BASE_TIMEOUT = 60000;
  
  // Ensure handoffs directory exists
  await fs.mkdir(HANDOFFS_DIR, { recursive: true });
  
  // Create handoff ID
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fromAgent = process.env.OPENCLAW_AGENT_ID || 'unknown';
  const handoffId = `${fromAgent}-to-${agent}-${timestamp}`;
  
  // Write context file FIRST
  const contextData = {
    handoff_id: handoffId,
    from_agent: fromAgent,
    to_agent: agent,
    timestamp: new Date().toISOString(),
    message,
    ...context
  };
  
  const contextPath = path.join(HANDOFFS_DIR, `${handoffId}.json`);
  await fs.writeFile(contextPath, JSON.stringify(contextData, null, 2));
  
  // Try sessions_send with retry
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const timeoutSec = (BASE_TIMEOUT * Math.pow(2, attempt - 1)) / 1000;
    
    try {
      // Use sessions_send tool directly
      const result = await new Promise((resolve, reject) => {
        const proc = spawn('openclaw', [
          'tool',
          'sessions_send',
          '--agent', agent,
          '--message', message,
          '--timeout', timeoutSec.toString()
        ], {
          stdio: ['ignore', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        proc.stdout.on('data', d => stdout += d);
        proc.stderr.on('data', d => stderr += d);
        
        proc.on('close', code => {
          if (code === 0) resolve(stdout);
          else reject(new Error(stderr || `Exit code ${code}`));
        });
        
        setTimeout(() => {
          proc.kill();
          reject(new Error('Timeout'));
        }, timeoutSec * 1000 + 5000);
      });
      
      // Success!
      return {
        success: true,
        attempt,
        handoff_id: handoffId,
        context_path: contextPath,
        message: `✅ Delivered to ${agent} on attempt ${attempt}`
      };
      
    } catch (error) {
      // Log failure
      const failurePath = path.join(HANDOFFS_DIR, 'failures.jsonl');
      await fs.appendFile(failurePath, JSON.stringify({
        timestamp: new Date().toISOString(),
        handoff_id: handoffId,
        attempt,
        error: error.message
      }) + '\n');
      
      if (attempt < MAX_RETRIES) {
        // Wait 5s before retry
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }
  
  // All retries failed - use Telegram fallback
  try {
    const telegramMsg = `🔄 A2A Retry Failed\n\n` +
      `To: @${agent}\n` +
      `From: ${fromAgent}\n` +
      `Message: ${message}\n\n` +
      `Context: ${contextPath}\n` +
      `Handoff ID: ${handoffId}`;
    
    await new Promise((resolve, reject) => {
      const proc = spawn('openclaw', [
        'message',
        'send',
        '--channel', 'telegram',
        '--message', telegramMsg
      ]);
      
      proc.on('close', code => {
        if (code === 0) resolve();
        else reject(new Error(`Telegram send failed: ${code}`));
      });
    });
    
    return {
      success: false,
      fallback: 'telegram',
      handoff_id: handoffId,
      context_path: contextPath,
      message: `⚠️ All retries failed, sent via Telegram to ${agent}`
    };
    
  } catch (telegramError) {
    return {
      success: false,
      fallback: 'failed',
      handoff_id: handoffId,
      context_path: contextPath,
      error: `❌ All retries and Telegram fallback failed: ${telegramError.message}`
    };
  }
}

// Skill interface
if (require.main === module) {
  const input = JSON.parse(process.argv[2] || '{}');
  run(input).then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  }).catch(err => {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  });
} else {
  module.exports = { SKILL, run };
}
