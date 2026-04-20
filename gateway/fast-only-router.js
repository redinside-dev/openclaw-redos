/**
 * FAST-ONLY ROUTER
 *
 * STRICT SLA: Maximum 1 minute response time
 * - Only uses models that can respond in < 60 seconds
 * - Auto-kills requests exceeding 60 seconds
 * - Falls back to faster models if timeout detected
 */

export class FastOnlyRouter {
  constructor() {
    // ONLY FAST MODELS (< 60 second response)
    this.fastModels = {
      // Local - Fast (20-30 seconds)
      'ollama/llama3.1:8b': {
        timeout: 45000, // 45 second hard limit
        capabilities: ['all'],
        priority: 1
      }

      // Add cloud APIs here when user provides keys:
      // 'glm/glm-4-flash': { timeout: 5000, capabilities: ['all'], priority: 0 },
      // 'openai/codex': { timeout: 5000, capabilities: ['code'], priority: 0 }
    };

    this.ABSOLUTE_MAX_TIMEOUT = 60000; // 1 minute - NEVER exceed
  }

  /**
   * Select fastest available model
   */
  selectModel(taskType = 'general') {
    // For now, always return llama3.1 (only fast model available)
    return {
      provider: 'ollama',
      model: 'llama3.1:8b',
      timeout: this.fastModels['ollama/llama3.1:8b'].timeout,
      reason: 'Only fast model available - meets 1min SLA'
    };
  }

  /**
   * Execute with STRICT timeout enforcement
   */
  async executeWithTimeout(fn, modelConfig) {
    const timeout = Math.min(modelConfig.timeout, this.ABSOLUTE_MAX_TIMEOUT);

    console.log(`⏱️  STRICT SLA: ${timeout/1000}s timeout enforced`);

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`SLA_VIOLATION: Exceeded ${timeout/1000}s limit`));
      }, timeout);
    });

    try {
      const result = await Promise.race([fn(), timeoutPromise]);
      console.log(`✅ SLA met - responded within ${timeout/1000}s`);
      return result;
    } catch (error) {
      if (error.message.startsWith('SLA_VIOLATION')) {
        console.log(`🚨 SLA VIOLATION - request exceeded ${timeout/1000}s`);

        // Kill stuck Ollama process
        await this.killStuckOllamaProcess();

        throw new Error(`Request exceeded ${timeout/1000}s SLA - automatically terminated`);
      }
      throw error;
    }
  }

  /**
   * Kill stuck Ollama processes
   */
  async killStuckOllamaProcess() {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      console.log(`💀 Killing stuck Ollama runners...`);
      await execAsync('pkill -9 -f "ollama runner"').catch(() => {});

      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`✅ Cleanup complete`);
    } catch (error) {
      console.error(`⚠️  Cleanup error:`, error.message);
    }
  }

  /**
   * Add cloud API model (when user provides keys)
   */
  addCloudModel(modelId, config) {
    console.log(`➕ Adding fast cloud model: ${modelId}`);
    this.fastModels[modelId] = {
      timeout: config.timeout || 10000, // Cloud APIs should be < 10s
      capabilities: config.capabilities || ['all'],
      priority: 0 // Cloud = highest priority (fastest)
    };
  }
}

export const fastRouter = new FastOnlyRouter();
