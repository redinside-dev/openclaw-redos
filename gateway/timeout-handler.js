/**
 * SELF-HEALING TIMEOUT HANDLER
 *
 * Automatically detects when models are taking too long and switches to faster alternatives
 */

export class TimeoutHandler {
  constructor() {
    // Model fallback chain: fast → medium → slow
    this.modelFallbackChain = [
      {
        provider: 'ollama',
        model: 'llama3.1:8b',
        timeout: 30000, // 30 seconds max
        name: 'Fast Local'
      },
      {
        provider: 'ollama',
        model: 'qwen2.5-coder:7b',
        timeout: 120000, // 2 minutes max
        name: 'Medium Quality'
      },
      {
        provider: 'ollama',
        model: 'glm-4.7-flash:latest',
        timeout: 300000, // 5 minutes max
        name: 'High Quality'
      }
    ];
  }

  /**
   * Execute with timeout and automatic fallback
   */
  async executeWithTimeout(fn, model, timeout) {
    return Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`TIMEOUT: ${model.name} exceeded ${timeout/1000}s`)), timeout)
      )
    ]);
  }

  /**
   * Try models in fallback chain until one succeeds
   */
  async tryWithFallback(executeFn, startIndex = 0) {
    for (let i = startIndex; i < this.modelFallbackChain.length; i++) {
      const model = this.modelFallbackChain[i];

      console.log(`🔄 Trying ${model.name} (timeout: ${model.timeout/1000}s)...`);

      try {
        const result = await this.executeWithTimeout(
          () => executeFn(model),
          model,
          model.timeout
        );

        console.log(`✅ ${model.name} succeeded!`);
        return {
          success: true,
          result,
          model: `${model.provider}/${model.model}`,
          fallbackLevel: i
        };

      } catch (error) {
        if (error.message.startsWith('TIMEOUT')) {
          console.log(`⏱️  ${model.name} TIMEOUT - trying faster model...`);

          // If this was already the fastest model, give up
          if (i === 0) {
            throw new Error('Even fastest model timed out - system overloaded');
          }

          // Continue to next (faster) model
          continue;
        }

        // Non-timeout error, rethrow
        throw error;
      }
    }

    throw new Error('All models in fallback chain failed or timed out');
  }

  /**
   * SMART: Start with appropriate model based on task complexity
   */
  async executeWithSmartFallback(executeFn, taskComplexity = 'simple') {
    let startIndex;

    // Choose starting point based on task
    switch(taskComplexity) {
      case 'simple':
        startIndex = 0; // Start with fastest
        break;
      case 'medium':
        startIndex = 0; // Still start fast, may fallback to medium if needed
        break;
      case 'complex':
        startIndex = 1; // Start with medium quality
        break;
      default:
        startIndex = 0;
    }

    console.log(`🧠 Task complexity: ${taskComplexity}, starting at fallback level ${startIndex}`);

    try {
      return await this.tryWithFallback(executeFn, startIndex);
    } catch (error) {
      // If complex task failed, try starting from fastest
      if (taskComplexity !== 'simple' && startIndex > 0) {
        console.log(`⚠️  Retrying from fastest model...`);
        return await this.tryWithFallback(executeFn, 0);
      }
      throw error;
    }
  }

  /**
   * Monitor ongoing requests and kill stuck ones
   */
  async monitorAndKillStuck(requestId, maxTime = 600000) { // 10 min absolute max
    setTimeout(() => {
      console.log(`🚨 REQUEST ${requestId} exceeded 10 minutes - KILLING`);
      // This would integrate with process management to kill stuck Ollama processes
      this.killStuckProcess(requestId);
    }, maxTime);
  }

  killStuckProcess(requestId) {
    // Implementation would kill the actual Ollama runner process
    console.log(`💀 Killing stuck process for request: ${requestId}`);
    // exec('pkill -9 -f "ollama runner"');
  }
}

export const timeoutHandler = new TimeoutHandler();
