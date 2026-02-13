#!/usr/bin/env node

/**
 * ED/RED - Front Controller & Orchestrator
 * Plans, delegates, coordinates agents, and assembles final results
 *
 * Responsibilities:
 * - Create execution plans from structured briefs
 * - Delegate tasks to specialist agents
 * - Route agent-to-agent communication
 * - Handle exceptions and retries
 * - Assemble final responses
 */

import { resilientHandler } from '../gateway/resilient-handler.js';

export class EdRedOrchestrator {
  constructor() {
    this.name = 'ED/RED';
    this.version = '1.0';

    // Agent registry
    this.agents = {
      'ENG': {
        name: 'Engineering Agent',
        capabilities: ['code_generation', 'debugging', 'code_review', 'refactoring'],
        model: 'ollama/qwen2.5-coder:7b',
        timeout: 300000 // 5 minutes
      },
      'RESEARCH': {
        name: 'Research Agent',
        capabilities: ['information_search', 'analysis', 'comparison'],
        model: 'ollama/llama3.1:8b',
        timeout: 180000 // 3 minutes
      },
      'OPS': {
        name: 'Operations Agent',
        capabilities: ['validation', 'testing', 'security_check', 'quality_check'],
        model: 'ollama/llama3.1:8b',
        timeout: 120000 // 2 minutes
      },
      'FINANCE': {
        name: 'Finance Agent',
        capabilities: ['cost_analysis', 'budget_tracking'],
        model: 'ollama/llama3.1:8b',
        timeout: 60000 // 1 minute
      }
    };

    // Execution statistics
    this.stats = {
      total_orchestrations: 0,
      successful: 0,
      failed: 0,
      total_steps: 0,
      avg_steps_per_job: 0
    };
  }

  /**
   * Main orchestration entry point
   */
  async orchestrate(brief, context = {}) {
    const startTime = Date.now();
    const jobId = this.generateJobId();

    console.log(`\n${'━'.repeat(60)}`);
    console.log(`🎯 ED/RED ORCHESTRATION START`);
    console.log(`Job: ${jobId}`);
    console.log(`Brief: ${brief.brief_id}`);
    console.log(`Intent: ${brief.intent.type}`);
    console.log(`Agents: ${brief.suggested_agents.join(', ')}`);
    console.log(`${'━'.repeat(60)}`);

    this.stats.total_orchestrations++;

    try {
      // Step 1: Create execution plan
      const plan = await this.createPlan(brief, context);
      console.log(`\n📋 Execution plan created: ${plan.steps.length} steps`);

      // Step 2: Execute plan
      const results = await this.executePlan(plan, brief, context);
      console.log(`\n✅ Plan executed: ${results.completed_steps}/${plan.steps.length} steps`);

      // Step 3: Validate results (OPS gate if needed)
      const validated = await this.validateResults(results, plan, brief);
      console.log(`\n✓ Validation: ${validated.passed ? 'PASSED' : 'FAILED'}`);

      // Step 4: Assemble final response
      const response = await this.assembleResponse(results, validated, plan, brief);

      const elapsed = Date.now() - startTime;
      console.log(`\n${'━'.repeat(60)}`);
      console.log(`✅ ED/RED ORCHESTRATION COMPLETE`);
      console.log(`Job: ${jobId}`);
      console.log(`Time: ${elapsed}ms`);
      console.log(`Steps: ${results.completed_steps}`);
      console.log(`${'━'.repeat(60)}\n`);

      this.stats.successful++;
      this.stats.total_steps += results.completed_steps;
      this.updateAvgSteps();

      return {
        ...response,
        job_id: jobId,
        orchestration: {
          plan_id: plan.plan_id,
          steps_executed: results.completed_steps,
          elapsed_ms: elapsed,
          validation_passed: validated.passed
        }
      };

    } catch (error) {
      console.error(`\n❌ ED/RED ORCHESTRATION FAILED`);
      console.error(`Job: ${jobId}`);
      console.error(`Error: ${error.message}`);
      console.log(`${'━'.repeat(60)}\n`);

      this.stats.failed++;

      // Return error response
      return this.createErrorResponse(error, brief, jobId);
    }
  }

  /**
   * Create execution plan from brief
   */
  async createPlan(brief, context) {
    const planId = this.generatePlanId();
    const steps = [];

    // Determine plan based on intent
    const intentType = brief.intent.type;
    const suggestedAgents = brief.suggested_agents;

    if (intentType === 'code_generation') {
      // Plan for code generation
      steps.push({
        step_id: '1',
        agent: 'ENG',
        action: 'generate_code',
        description: 'Generate code based on requirements',
        dependencies: [],
        timeout: this.agents.ENG.timeout,
        retry: true
      });

      // Always validate code with OPS
      if (!suggestedAgents.includes('OPS')) {
        suggestedAgents.push('OPS');
      }

      steps.push({
        step_id: '2',
        agent: 'OPS',
        action: 'validate_code',
        description: 'Validate code quality and security',
        dependencies: ['1'],
        timeout: this.agents.OPS.timeout,
        retry: false
      });

    } else if (intentType === 'debugging') {
      // Plan for debugging
      steps.push({
        step_id: '1',
        agent: 'ENG',
        action: 'analyze_bug',
        description: 'Analyze the bug and find root cause',
        dependencies: [],
        timeout: this.agents.ENG.timeout,
        retry: true
      });

      steps.push({
        step_id: '2',
        agent: 'ENG',
        action: 'fix_bug',
        description: 'Implement fix for the bug',
        dependencies: ['1'],
        timeout: this.agents.ENG.timeout,
        retry: true
      });

      steps.push({
        step_id: '3',
        agent: 'OPS',
        action: 'verify_fix',
        description: 'Verify the fix works',
        dependencies: ['2'],
        timeout: this.agents.OPS.timeout,
        retry: false
      });

    } else if (intentType === 'research') {
      // Plan for research
      steps.push({
        step_id: '1',
        agent: 'RESEARCH',
        action: 'gather_information',
        description: 'Gather relevant information',
        dependencies: [],
        timeout: this.agents.RESEARCH.timeout,
        retry: true
      });

      steps.push({
        step_id: '2',
        agent: 'RESEARCH',
        action: 'analyze_and_summarize',
        description: 'Analyze and create summary',
        dependencies: ['1'],
        timeout: this.agents.RESEARCH.timeout,
        retry: false
      });

    } else if (intentType === 'complex_development') {
      // Plan for complex development
      steps.push({
        step_id: '1',
        agent: 'ENG',
        action: 'design_architecture',
        description: 'Design system architecture',
        dependencies: [],
        timeout: this.agents.ENG.timeout,
        retry: true
      });

      steps.push({
        step_id: '2',
        agent: 'ENG',
        action: 'implement_core',
        description: 'Implement core functionality',
        dependencies: ['1'],
        timeout: this.agents.ENG.timeout,
        retry: true
      });

      steps.push({
        step_id: '3',
        agent: 'ENG',
        action: 'add_features',
        description: 'Add requested features',
        dependencies: ['2'],
        timeout: this.agents.ENG.timeout,
        retry: true
      });

      steps.push({
        step_id: '4',
        agent: 'ENG',
        action: 'add_tests',
        description: 'Add tests',
        dependencies: ['3'],
        timeout: this.agents.ENG.timeout,
        retry: true
      });

      steps.push({
        step_id: '5',
        agent: 'OPS',
        action: 'full_validation',
        description: 'Complete validation',
        dependencies: ['4'],
        timeout: this.agents.OPS.timeout,
        retry: false
      });

    } else {
      // Generic plan
      for (const agentName of suggestedAgents) {
        if (this.agents[agentName]) {
          steps.push({
            step_id: String(steps.length + 1),
            agent: agentName,
            action: 'process_task',
            description: `Process with ${agentName}`,
            dependencies: steps.length > 0 ? [String(steps.length)] : [],
            timeout: this.agents[agentName].timeout,
            retry: true
          });
        }
      }
    }

    return {
      plan_id: planId,
      brief_id: brief.brief_id,
      steps: steps,
      created_at: new Date().toISOString(),
      estimated_time: steps.reduce((sum, step) => sum + step.timeout, 0)
    };
  }

  /**
   * Execute plan step by step
   */
  async executePlan(plan, brief, context) {
    const results = {
      plan_id: plan.plan_id,
      steps: {},
      completed_steps: 0,
      failed_steps: 0,
      execution_log: []
    };

    // Execute steps in dependency order
    for (const step of plan.steps) {
      console.log(`\n┌─ STEP ${step.step_id}: ${step.description} ─────────`);
      console.log(`│ Agent: ${step.agent}`);
      console.log(`│ Action: ${step.action}`);

      // Check dependencies
      const depsReady = this.checkDependencies(step, results);
      if (!depsReady) {
        console.log(`│ ⚠️  Dependencies not met, skipping`);
        console.log(`└${'─'.repeat(50)}`);
        results.failed_steps++;
        continue;
      }

      // Execute step
      try {
        const stepResult = await this.executeStep(step, plan, brief, results, context);

        results.steps[step.step_id] = {
          step,
          result: stepResult,
          status: 'completed',
          completed_at: new Date().toISOString()
        };

        results.completed_steps++;
        results.execution_log.push({
          step_id: step.step_id,
          agent: step.agent,
          status: 'success',
          timestamp: new Date().toISOString()
        });

        console.log(`│ ✅ Step completed successfully`);
        console.log(`└${'─'.repeat(50)}`);

      } catch (error) {
        console.log(`│ ❌ Step failed: ${error.message}`);

        // Retry if allowed
        if (step.retry) {
          console.log(`│ 🔄 Retrying step...`);
          try {
            const stepResult = await this.executeStep(step, plan, brief, results, context);
            results.steps[step.step_id] = {
              step,
              result: stepResult,
              status: 'completed_after_retry',
              completed_at: new Date().toISOString()
            };
            results.completed_steps++;
            console.log(`│ ✅ Step completed after retry`);
          } catch (retryError) {
            console.log(`│ ❌ Retry failed: ${retryError.message}`);
            results.steps[step.step_id] = {
              step,
              error: retryError.message,
              status: 'failed',
              failed_at: new Date().toISOString()
            };
            results.failed_steps++;
          }
        } else {
          results.steps[step.step_id] = {
            step,
            error: error.message,
            status: 'failed',
            failed_at: new Date().toISOString()
          };
          results.failed_steps++;
        }

        console.log(`└${'─'.repeat(50)}`);

        results.execution_log.push({
          step_id: step.step_id,
          agent: step.agent,
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * Execute a single step
   */
  async executeStep(step, plan, brief, results, context) {
    // Build context for agent
    const agentContext = {
      step_id: step.step_id,
      action: step.action,
      brief: brief,
      previous_results: this.getPreviousResults(step, results),
      original_message: brief.original_message
    };

    // 🎯 USE HATAKE'S OPTIMIZED PROMPT if available
    let prompt;
    if (brief.optimized_prompts && brief.optimized_prompts[step.agent]) {
      prompt = brief.optimized_prompts[step.agent];

      // Inject previous results if needed for validation steps
      if (step.action === 'validate_code' && context.previous_results['1']) {
        prompt = prompt.replace('{code}', context.previous_results['1'].content || '');
      }

      console.log(`   ✨ Using HATAKE-engineered prompt for ${step.agent}`);
    } else {
      // Fallback to basic prompt building
      prompt = this.buildStepPrompt(step, agentContext);
    }

    // 🎯 USE HATAKE'S MODEL RECOMMENDATION if available
    let selectedModel;
    if (brief.model_recommendations && brief.model_recommendations[step.agent]) {
      selectedModel = brief.model_recommendations[step.agent].model;
      console.log(`   🎯 Using HATAKE-selected model: ${selectedModel}`);
    } else {
      // Fallback to default agent model
      const agentConfig = this.agents[step.agent];
      selectedModel = agentConfig.model;
    }

    // Call agent via resilient handler
    const result = await resilientHandler.handleMessage(
      step.agent.toLowerCase(),
      prompt,
      {
        ...context,
        step_id: step.step_id,
        forceModel: selectedModel,
        timeout: step.timeout
      }
    );

    return result;
  }

  /**
   * Build prompt for a specific step
   */
  buildStepPrompt(step, context) {
    let prompt = '';

    // Add context from brief
    prompt += `Original Request: ${context.brief.original_message}\n\n`;

    // Add step-specific instructions
    if (step.action === 'generate_code') {
      prompt += `Task: Generate code based on the requirements above.\n`;
      prompt += `Include error handling, documentation, and follow best practices.\n`;
    } else if (step.action === 'validate_code') {
      const previousCode = context.previous_results['1']?.content || '';
      prompt += `Task: Validate the following code:\n\n${previousCode}\n\n`;
      prompt += `Check for:\n`;
      prompt += `- Syntax errors\n`;
      prompt += `- Security issues\n`;
      prompt += `- Code quality\n`;
      prompt += `- Best practices\n`;
      prompt += `\nRespond with PASS or FAIL and list any issues found.\n`;
    } else if (step.action === 'analyze_bug') {
      prompt += `Task: Analyze the bug and identify the root cause.\n`;
    } else if (step.action === 'fix_bug') {
      const analysis = context.previous_results['1']?.content || '';
      prompt += `Based on this analysis:\n${analysis}\n\n`;
      prompt += `Task: Implement a fix for the bug.\n`;
    } else if (step.action === 'design_architecture') {
      prompt += `Task: Design the system architecture.\n`;
      prompt += `Include: components, data flow, technology choices.\n`;
    } else if (step.action === 'implement_core') {
      const design = context.previous_results['1']?.content || '';
      prompt += `Based on this design:\n${design}\n\n`;
      prompt += `Task: Implement the core functionality.\n`;
    } else {
      // Generic task
      prompt += `Task: ${step.description}\n`;
    }

    return prompt;
  }

  /**
   * Check if step dependencies are met
   */
  checkDependencies(step, results) {
    if (!step.dependencies || step.dependencies.length === 0) {
      return true;
    }

    for (const depId of step.dependencies) {
      const depResult = results.steps[depId];
      if (!depResult || depResult.status === 'failed') {
        return false;
      }
    }

    return true;
  }

  /**
   * Get results from previous steps
   */
  getPreviousResults(step, results) {
    const previous = {};

    if (step.dependencies) {
      for (const depId of step.dependencies) {
        if (results.steps[depId]) {
          previous[depId] = results.steps[depId].result;
        }
      }
    }

    return previous;
  }

  /**
   * Validate results with OPS
   */
  async validateResults(results, plan, brief) {
    // Find OPS validation step
    const opsStep = Object.values(results.steps).find(
      s => s.step?.agent === 'OPS' && s.status !== 'failed'
    );

    if (opsStep && opsStep.result) {
      const content = opsStep.result.content.toLowerCase();
      const passed = content.includes('pass') && !content.includes('fail');

      return {
        passed: passed,
        validator: 'OPS',
        result: opsStep.result.content,
        checks: passed ? ['all_passed'] : ['some_failed']
      };
    }

    // No OPS validation, assume passed
    return {
      passed: true,
      validator: 'none',
      result: 'No validation step',
      checks: []
    };
  }

  /**
   * Assemble final response from all step results
   */
  async assembleResponse(results, validated, plan, brief) {
    let content = '';

    // Build response based on intent
    if (brief.intent.type === 'code_generation') {
      const codeStep = results.steps['1'];
      if (codeStep && codeStep.result) {
        content += codeStep.result.content;

        if (validated.passed) {
          content += `\n\n✅ Code validated by OPS - all checks passed!`;
        } else {
          content += `\n\n⚠️ Validation notes:\n${validated.result}`;
        }
      }
    } else {
      // Generic assembly - combine all step results
      for (const [stepId, stepData] of Object.entries(results.steps)) {
        if (stepData.status !== 'failed' && stepData.result) {
          content += `\n\n--- ${stepData.step.description} ---\n`;
          content += stepData.result.content;
        }
      }
    }

    // Calculate total cost and latency
    const totalCost = Object.values(results.steps)
      .filter(s => s.result)
      .reduce((sum, s) => sum + (s.result.cost || 0), 0);

    const totalLatency = Object.values(results.steps)
      .filter(s => s.result)
      .reduce((sum, s) => sum + (s.result.latency || 0), 0);

    return {
      content: content,
      model: {
        provider: 'orchestrated',
        model: 'ED/RED',
        reason: 'multi-agent coordination'
      },
      latency: totalLatency,
      cost: totalCost,
      tokens: {
        input: 0, // TODO: Calculate total tokens
        output: 0
      },
      steps_executed: results.completed_steps,
      validation: validated
    };
  }

  /**
   * Create error response
   */
  createErrorResponse(error, brief, jobId) {
    return {
      content: `❌ Orchestration failed: ${error.message}\n\nThe system encountered an issue while coordinating multiple agents for this complex task. This has been logged for investigation.`,
      model: {
        provider: 'orchestrated',
        model: 'ED/RED',
        reason: 'coordination_failed'
      },
      latency: 0,
      cost: 0,
      tokens: { input: 0, output: 0 },
      job_id: jobId,
      error: error.message,
      failed: true
    };
  }

  /**
   * Update average steps per job
   */
  updateAvgSteps() {
    if (this.stats.successful > 0) {
      this.stats.avg_steps_per_job =
        (this.stats.total_steps / this.stats.successful).toFixed(1);
    }
  }

  /**
   * Generate unique job ID
   */
  generateJobId() {
    return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique plan ID
   */
  generatePlanId() {
    return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get orchestrator statistics
   */
  getStats() {
    return {
      name: this.name,
      version: this.version,
      ...this.stats,
      success_rate: this.stats.total_orchestrations > 0
        ? ((this.stats.successful / this.stats.total_orchestrations) * 100).toFixed(1)
        : 0,
      agents_available: Object.keys(this.agents).length
    };
  }

  /**
   * Get agent registry
   */
  getAgents() {
    return this.agents;
  }
}

// Export singleton
export const edRedOrchestrator = new EdRedOrchestrator();
