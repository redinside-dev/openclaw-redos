import { TaskAnalyzer } from '../smart-router/analyzer.js';
import { ModelSelector } from '../smart-router/selector.js';
import { costMonitor } from '../cost-monitor/monitor.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class EnhancedHandler {
  constructor() {
    this.analyzer = new TaskAnalyzer();
    this.selector = new ModelSelector();
  }

  async handleMessage(agentId, message, context = {}) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📨 Message to ${agentId}: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);

    try {
      // 1. Analyze task
      const task = {
        priority: this.analyzer.analyzePriority(message, context),
        complexity: this.analyzer.analyzeComplexity(message),
        type: this.analyzer.classifyTaskType(message)
      };

      console.log(`📊 Analysis: priority=${task.priority}, complexity=${task.complexity}/10, type=${task.type}`);

      // 2. Select optimal model
      const budgetRemaining = costMonitor.getBudgetRemaining();
      const selectedModel = this.selector.selectModel(task, budgetRemaining);

      console.log(`🎯 Model: ${selectedModel.provider}/${selectedModel.model} (${selectedModel.reason})`);
      console.log(`💵 Budget: $${budgetRemaining.toFixed(2)} remaining`);

      // 3. Call OpenClaw with selected model
      const startTime = Date.now();
      const response = await this.callOpenClaw(agentId, message, selectedModel);
      const latency = Date.now() - startTime;

      console.log(`✅ Response received in ${latency}ms`);

      // 4. Track cost
      const estimatedTokens = {
        input: Math.ceil(message.length / 4),
        output: Math.ceil(response.length / 4)
      };

      await costMonitor.recordRequest(
        agentId,
        `${selectedModel.provider}/${selectedModel.model}`,
        estimatedTokens,
        selectedModel.cost
      );

      console.log(`${'='.repeat(60)}\n`);

      return {
        content: response,
        model: selectedModel,
        latency,
        cost: selectedModel.cost,
        tokens: estimatedTokens
      };

    } catch (error) {
      console.error('❌ Error:', error.message);
      throw error;
    }
  }

  async callOpenClaw(agentId, message, selectedModel) {
    if (selectedModel.provider === 'ollama') {
      // Use Ollama CLI - redirect stderr to avoid spinner noise
      const escapedMessage = message.replace(/'/g, "'\\''");
      const command = `printf '%s' '${escapedMessage}' | ollama run ${selectedModel.model} 2>/dev/null`;

      try {
        const { stdout } = await execAsync(command, {
          maxBuffer: 10 * 1024 * 1024,
          timeout: 120000,
          shell: '/bin/bash'
        });

        return stdout.trim() || 'No response generated';
      } catch (error) {
        // On error, log and throw
        console.error('❌ Ollama CLI error:', error.message.substring(0, 200));
        throw new Error('Model execution failed');
      }
    } else {
      // Use openclaw CLI for other providers (Anthropic, etc.)
      const command = `openclaw chat ${agentId} --model ${selectedModel.provider}/${selectedModel.model}`;
      const { stdout } = await execAsync(command, {
        input: message,
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120000
      });
      return stdout.trim() || 'No response generated';
    }
  }

}
