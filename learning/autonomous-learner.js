import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { EnhancedHandler } from '../gateway/enhanced-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Autonomous Learning System
 * Agents learn from experience, improve prompts, and adapt strategies
 */
export class AutonomousLearner {
  constructor() {
    this.handler = new EnhancedHandler();
    this.experiences = new Map(); // agent_id -> Experience[]
    this.learnings = new Map(); // agent_id -> Learning[]
    this.knowledgeBase = new Map(); // topic -> Knowledge
    this.stateFile = path.join(__dirname, 'learning-state.json');

    // Load persisted state
    this.load().catch(() => console.log('No previous learning state'));
  }

  /**
   * Record an experience (Execute phase)
   */
  recordExperience(agentId, task, result, metadata = {}) {
    const experience = {
      id: `exp-${Date.now()}`,
      agentId: agentId,
      timestamp: new Date(),
      task: {
        description: task,
        complexity: metadata.complexity || 5,
        type: metadata.type || 'general'
      },
      result: {
        success: metadata.success !== false,
        output: result,
        latency: metadata.latency || 0,
        cost: metadata.cost || 0
      },
      context: metadata.context || {}
    };

    if (!this.experiences.has(agentId)) {
      this.experiences.set(agentId, []);
    }

    this.experiences.get(agentId).push(experience);

    console.log(`📝 Recorded experience for ${agentId}: ${task.substring(0, 50)}...`);

    // Trigger reflection after every 5 experiences
    const agentExperiences = this.experiences.get(agentId);
    if (agentExperiences.length % 5 === 0) {
      this.reflect(agentId).catch(err =>
        console.error(`Reflection error for ${agentId}:`, err.message)
      );
    }

    this.save();

    return experience.id;
  }

  /**
   * Reflect on experiences (Reflect phase)
   */
  async reflect(agentId) {
    const experiences = this.experiences.get(agentId) || [];
    if (experiences.length === 0) return null;

    console.log(`\n🤔 ${agentId} is reflecting on ${experiences.length} experiences...`);

    // Get recent experiences (last 10)
    const recentExperiences = experiences.slice(-10);

    // Analyze patterns
    const successRate = recentExperiences.filter(e => e.result.success).length / recentExperiences.length;
    const avgLatency = recentExperiences.reduce((sum, e) => sum + e.result.latency, 0) / recentExperiences.length;
    const avgCost = recentExperiences.reduce((sum, e) => sum + e.result.cost, 0) / recentExperiences.length;

    // Task types distribution
    const taskTypes = {};
    recentExperiences.forEach(e => {
      const type = e.task.type;
      taskTypes[type] = (taskTypes[type] || 0) + 1;
    });

    const reflection = {
      id: `ref-${Date.now()}`,
      agentId: agentId,
      timestamp: new Date(),
      experienceCount: experiences.length,
      metrics: {
        successRate: Math.round(successRate * 100) + '%',
        avgLatency: Math.round(avgLatency) + 'ms',
        avgCost: avgCost.toFixed(6),
        taskTypes: taskTypes
      },
      insights: []
    };

    // Generate insights based on patterns
    if (successRate < 0.7) {
      reflection.insights.push({
        type: 'warning',
        message: `Low success rate (${reflection.metrics.successRate}). Need improvement.`
      });
    }

    if (avgLatency > 5000) {
      reflection.insights.push({
        type: 'optimization',
        message: `High latency (${reflection.metrics.avgLatency}). Consider simpler approaches.`
      });
    }

    const mostCommonType = Object.entries(taskTypes).sort((a, b) => b[1] - a[1])[0];
    if (mostCommonType) {
      reflection.insights.push({
        type: 'specialization',
        message: `Specializing in ${mostCommonType[0]} tasks (${mostCommonType[1]} occurrences).`
      });
    }

    console.log(`💡 Reflection complete:`);
    console.log(`   Success Rate: ${reflection.metrics.successRate}`);
    console.log(`   Avg Latency: ${reflection.metrics.avgLatency}`);
    console.log(`   Insights: ${reflection.insights.length}`);

    // Trigger evaluation
    await this.evaluate(agentId, reflection);

    return reflection;
  }

  /**
   * Evaluate performance (Evaluate phase)
   */
  async evaluate(agentId, reflection) {
    console.log(`\n📊 Evaluating ${agentId} performance...`);

    // Ask AI oracle to evaluate
    const evaluationPrompt = `Evaluate this agent's performance:

Agent: ${agentId}
Experience Count: ${reflection.experienceCount}
Success Rate: ${reflection.metrics.successRate}
Avg Latency: ${reflection.metrics.avgLatency}
Task Types: ${JSON.stringify(reflection.metrics.taskTypes)}

Insights:
${reflection.insights.map(i => `- ${i.message}`).join('\n')}

Provide evaluation in JSON format:
{
  "score": 0-100,
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendations": ["rec1", "rec2"]
}`;

    const result = await this.handler.handleMessage('oracle',
      evaluationPrompt,
      { priority: 'normal' }
    );

    let evaluation;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      evaluation = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        score: 75,
        strengths: ['Consistent performance'],
        weaknesses: ['Unknown'],
        recommendations: ['Continue current approach']
      };
    } catch (e) {
      evaluation = {
        score: 75,
        strengths: ['Functional'],
        weaknesses: ['Evaluation parse error'],
        recommendations: ['Fix evaluation format']
      };
    }

    evaluation.id = `eval-${Date.now()}`;
    evaluation.agentId = agentId;
    evaluation.timestamp = new Date();

    console.log(`🎯 Evaluation Score: ${evaluation.score}/100`);
    console.log(`💪 Strengths: ${evaluation.strengths.join(', ')}`);
    console.log(`⚠️  Weaknesses: ${evaluation.weaknesses.join(', ')}`);

    // Trigger learning
    await this.learn(agentId, evaluation);

    return evaluation;
  }

  /**
   * Learn and adapt (Learn phase)
   */
  async learn(agentId, evaluation) {
    console.log(`\n🎓 ${agentId} is learning from evaluation...`);

    const learning = {
      id: `learn-${Date.now()}`,
      agentId: agentId,
      timestamp: new Date(),
      evaluation: evaluation,
      adaptations: []
    };

    // Generate adaptations based on weaknesses and recommendations
    for (const weakness of evaluation.weaknesses) {
      const adaptationPrompt = `How can I improve this weakness: "${weakness}"?

Provide a specific, actionable adaptation strategy in one sentence.`;

      const result = await this.handler.handleMessage('ceo',
        adaptationPrompt,
        { priority: 'low' }
      );

      learning.adaptations.push({
        weakness: weakness,
        strategy: result.content.trim().substring(0, 200)
      });
    }

    if (!this.learnings.has(agentId)) {
      this.learnings.set(agentId, []);
    }

    this.learnings.get(agentId).push(learning);

    console.log(`✅ Learned ${learning.adaptations.length} new adaptations`);

    // Update knowledge base
    for (const adaptation of learning.adaptations) {
      this.addToKnowledge(adaptation.weakness, adaptation.strategy);
    }

    this.save();

    return learning;
  }

  /**
   * Add knowledge to knowledge base
   */
  addToKnowledge(topic, knowledge) {
    const key = topic.toLowerCase().replace(/[^a-z0-9]/g, '_');

    if (!this.knowledgeBase.has(key)) {
      this.knowledgeBase.set(key, {
        topic: topic,
        entries: [],
        createdAt: new Date()
      });
    }

    const kb = this.knowledgeBase.get(key);
    kb.entries.push({
      knowledge: knowledge,
      timestamp: new Date(),
      confidence: 0.8 // Start with 0.8 confidence
    });

    kb.updatedAt = new Date();

    console.log(`📚 Added knowledge: ${topic} → ${knowledge.substring(0, 50)}...`);

    this.save();
  }

  /**
   * Query knowledge base
   */
  queryKnowledge(topic) {
    const key = topic.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return this.knowledgeBase.get(key) || null;
  }

  /**
   * Get learning summary for agent
   */
  getLearningSummary(agentId) {
    const experiences = this.experiences.get(agentId) || [];
    const learnings = this.learnings.get(agentId) || [];

    if (experiences.length === 0) {
      return {
        agentId: agentId,
        status: 'no_data',
        message: 'No experiences recorded yet'
      };
    }

    const recentExperiences = experiences.slice(-20);
    const successRate = recentExperiences.filter(e => e.result.success).length / recentExperiences.length;

    return {
      agentId: agentId,
      totalExperiences: experiences.length,
      totalLearnings: learnings.length,
      recentSuccessRate: Math.round(successRate * 100) + '%',
      lastLearning: learnings[learnings.length - 1] || null,
      knowledgeTopics: Array.from(this.knowledgeBase.keys()).length
    };
  }

  /**
   * Trigger full learning cycle
   */
  async runLearningCycle(agentId) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 AUTONOMOUS LEARNING CYCLE - ${agentId}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      // Step 1: Reflect
      const reflection = await this.reflect(agentId);
      if (!reflection) {
        console.log('⚠️  No experiences to reflect on');
        return null;
      }

      // Step 2: Evaluate (already triggered by reflect)
      console.log('✅ Learning cycle complete');

      return {
        success: true,
        agentId: agentId,
        reflection: reflection
      };

    } catch (error) {
      console.error(`❌ Learning cycle failed:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all agent summaries
   */
  getAllSummaries() {
    const summaries = {};

    for (const agentId of this.experiences.keys()) {
      summaries[agentId] = this.getLearningSummary(agentId);
    }

    return summaries;
  }

  /**
   * Save learning state to disk
   */
  async save() {
    try {
      const state = {
        experiences: Array.from(this.experiences.entries()),
        learnings: Array.from(this.learnings.entries()),
        knowledgeBase: Array.from(this.knowledgeBase.entries()),
        savedAt: new Date()
      };

      await fs.writeFile(
        this.stateFile,
        JSON.stringify(state, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Failed to save learning state:', error.message);
    }
  }

  /**
   * Load learning state from disk
   */
  async load() {
    try {
      const data = await fs.readFile(this.stateFile, 'utf8');
      const state = JSON.parse(data);

      this.experiences = new Map(state.experiences || []);
      this.learnings = new Map(state.learnings || []);
      this.knowledgeBase = new Map(state.knowledgeBase || []);

      const totalExperiences = Array.from(this.experiences.values())
        .reduce((sum, arr) => sum + arr.length, 0);

      console.log(`✅ Loaded learning state: ${totalExperiences} experiences`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Failed to load learning state:', error.message);
      }
    }
  }
}

// Export singleton instance
export const autonomousLearner = new AutonomousLearner();
