export class ModelSelector {
  selectModel(task, budgetRemaining) {
    const { priority, complexity, type } = task;

    // Budget exhausted? Local only
    if (budgetRemaining < 0.01) {
      console.log('⚠️  Budget low, forcing local models');
      return this.selectLocal(complexity, type);
    }

    // Urgent? Use best model (if budget allows)
    if (priority === 'urgent' && budgetRemaining > 0.50) {
      return {
        provider: 'anthropic',
        model: 'claude-sonnet-4.5',
        cost: 0.003,
        reason: 'urgent priority'
      };
    }

    // Very complex? Use powerful model
    if (complexity >= 8 && budgetRemaining > 1.00) {
      return {
        provider: 'anthropic',
        model: 'claude-sonnet-4.5',
        cost: 0.003,
        reason: 'high complexity'
      };
    }

    // Complex but budget-conscious? Use local powerful model
    if (complexity >= 6) {
      return {
        provider: 'ollama',
        model: 'glm-4.7-flash:latest',
        cost: 0,
        reason: 'complex task, local model'
      };
    }

    // Simple/moderate? Use local 8B (fast and reliable)
    if (complexity <= 5) {
      return {
        provider: 'ollama',
        model: 'llama3.1:8b',
        cost: 0,
        reason: 'simple task'
      };
    }

    // Default: local 8B (safest choice)
    return {
      provider: 'ollama',
      model: 'llama3.1:8b',
      cost: 0,
      reason: 'default choice'
    };
  }

  selectLocal(complexity, type) {
    // Code tasks - use Qwen Coder
    if (type === 'code') {
      return {
        provider: 'ollama',
        model: 'qwen2.5-coder:7b',
        cost: 0,
        reason: 'code task, specialized model'
      };
    }

    // Complex - use powerful local model
    if (complexity >= 6) {
      return {
        provider: 'ollama',
        model: 'glm-4.7-flash:latest',
        cost: 0,
        reason: 'complex, local only'
      };
    }

    // Simple - use 8B
    return {
      provider: 'ollama',
      model: 'llama3.1:8b',
      cost: 0,
      reason: 'simple, local only'
    };
  }
}
