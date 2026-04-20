#!/usr/bin/env node

/**
 * VECTOR MEMORY SYSTEM
 *
 * - Never loses context across sessions
 * - Builds persistent knowledge base
 * - Checks if issues already fixed
 * - Enables agent-to-agent knowledge sharing
 * - Always retrieves relevant context before responding
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEMORY_DB = path.join(__dirname, '../data/memory/vector-memory.jsonl');
const KNOWLEDGE_DB = path.join(__dirname, '../data/memory/knowledge-base.json');

export class VectorMemory {
  constructor() {
    this.memories = [];
    this.knowledgeBase = {
      fixes: {},          // Issue fixes
      patterns: {},       // Common patterns
      solutions: {},      // Solution templates
      context: {}         // Long-term context
    };
    this.init();
  }

  /**
   * Initialize vector memory system
   */
  async init() {
    await fs.mkdir(path.dirname(MEMORY_DB), { recursive: true });
    await this.loadMemories();
    await this.loadKnowledgeBase();

    console.log('🧠 Vector Memory System: ONLINE');
    console.log('   ✅ Context never lost');
    console.log('   ✅ Knowledge base loaded');
    console.log('   ✅ ${this.memories.length} memories available');
    console.log('   ✅ Agent-to-agent knowledge sharing enabled');
  }

  /**
   * Store conversation in memory
   */
  async storeConversation(data) {
    const memory = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: 'conversation',
      agentId: data.agentId || 'main',
      userId: data.userId || 'anonymous',
      message: data.message,
      response: data.response,
      model: data.model,
      cost: data.cost || 0,
      latency: data.latency || 0,
      success: data.success !== false,

      // Vector embedding (simple for now - can upgrade to OpenAI embeddings later)
      embedding: this.createEmbedding(data.message),

      // Metadata
      tags: this.extractTags(data.message),
      intent: this.detectIntent(data.message),
      complexity: this.estimateComplexity(data.message)
    };

    this.memories.push(memory);
    await this.saveMemory(memory);

    // Update knowledge base
    await this.updateKnowledgeBase(memory);

    return memory;
  }

  /**
   * Retrieve relevant context for a query
   */
  async retrieveContext(query, limit = 5) {
    const queryEmbedding = this.createEmbedding(query);
    const queryIntent = this.detectIntent(query);

    // Find similar memories using cosine similarity
    const similarities = this.memories.map(memory => ({
      memory,
      similarity: this.cosineSimilarity(queryEmbedding, memory.embedding),
      intentMatch: memory.intent === queryIntent
    }));

    // Sort by similarity and intent match
    similarities.sort((a, b) => {
      if (a.intentMatch && !b.intentMatch) return -1;
      if (!a.intentMatch && b.intentMatch) return 1;
      return b.similarity - a.similarity;
    });

    // Get top results
    const relevantMemories = similarities.slice(0, limit).map(s => s.memory);

    console.log(`\n🧠 Context Retrieved:`);
    console.log(`   Query: "${query.substring(0, 50)}..."`);
    console.log(`   Found: ${relevantMemories.length} relevant memories`);
    relevantMemories.forEach((m, i) => {
      console.log(`   ${i + 1}. [${m.intent}] ${m.message.substring(0, 40)}... (similarity: ${(similarities[i].similarity * 100).toFixed(0)}%)`);
    });

    return {
      memories: relevantMemories,
      knowledge: this.getRelevantKnowledge(query),
      intent: queryIntent
    };
  }

  /**
   * Check if issue already fixed
   */
  async isIssueSolved(issueDescription) {
    const embedding = this.createEmbedding(issueDescription);

    // Check knowledge base for similar fixes
    for (const [fixId, fix] of Object.entries(this.knowledgeBase.fixes)) {
      const fixEmbedding = this.createEmbedding(fix.description);
      const similarity = this.cosineSimilarity(embedding, fixEmbedding);

      if (similarity > 0.85) { // High similarity = likely same issue
        console.log(`\n🔍 Similar issue found in knowledge base!`);
        console.log(`   Fix ID: ${fixId}`);
        console.log(`   Description: ${fix.description}`);
        console.log(`   Solution: ${fix.solution}`);
        console.log(`   Similarity: ${(similarity * 100).toFixed(1)}%`);

        return {
          solved: true,
          fix: fix,
          similarity: similarity
        };
      }
    }

    return { solved: false };
  }

  /**
   * Record a fix in knowledge base
   */
  async recordFix(issueId, issueDescription, solution) {
    const fix = {
      id: issueId,
      description: issueDescription,
      solution: solution,
      timestamp: new Date().toISOString(),
      timesApplied: 1
    };

    this.knowledgeBase.fixes[issueId] = fix;
    await this.saveKnowledgeBase();

    console.log(`\n✅ Fix recorded in knowledge base: ${issueId}`);
    return fix;
  }

  /**
   * Get agent knowledge (for agent-to-agent sharing)
   */
  async getAgentKnowledge(agentId) {
    const agentMemories = this.memories.filter(m => m.agentId === agentId);

    return {
      totalExperiences: agentMemories.length,
      successRate: agentMemories.filter(m => m.success).length / agentMemories.length,
      commonIntents: this.getCommonIntents(agentMemories),
      averageCost: agentMemories.reduce((sum, m) => sum + m.cost, 0) / agentMemories.length,
      averageLatency: agentMemories.reduce((sum, m) => sum + m.latency, 0) / agentMemories.length,
      recentMemories: agentMemories.slice(-10)
    };
  }

  /**
   * Share knowledge between agents
   */
  async shareKnowledgeWith(fromAgentId, toAgentId, topic) {
    const fromKnowledge = await this.getAgentKnowledge(fromAgentId);
    const relevantMemories = fromKnowledge.recentMemories.filter(m =>
      m.tags.some(tag => topic.toLowerCase().includes(tag))
    );

    console.log(`\n🤝 Knowledge Sharing:`);
    console.log(`   From: ${fromAgentId}`);
    console.log(`   To: ${toAgentId}`);
    console.log(`   Topic: ${topic}`);
    console.log(`   Memories shared: ${relevantMemories.length}`);

    return relevantMemories;
  }

  /**
   * Create simple embedding (can upgrade to OpenAI embeddings later)
   */
  createEmbedding(text) {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(100).fill(0);

    // Simple hash-based embedding (deterministic)
    words.forEach((word, idx) => {
      const hash = crypto.createHash('md5').update(word).digest('hex');
      for (let i = 0; i < 100; i++) {
        embedding[i] += parseInt(hash.substr(i % 32, 2), 16) / 255;
      }
    });

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  /**
   * Cosine similarity between two embeddings
   */
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Detect intent
   */
  detectIntent(text) {
    const lower = text.toLowerCase();

    if (/\b(error|issue|problem|bug|fix|broken)\b/.test(lower)) return 'troubleshooting';
    if (/\b(how|what|when|where|why|explain)\b/.test(lower)) return 'question';
    if (/\b(create|build|make|write|generate)\b/.test(lower)) return 'creation';
    if (/\b(update|modify|change|edit)\b/.test(lower)) return 'modification';
    if (/\b(latest|news|current|today)\b/.test(lower)) return 'information';
    if (/\b(help|assist|support)\b/.test(lower)) return 'support';

    return 'general';
  }

  /**
   * Extract tags
   */
  extractTags(text) {
    const tags = [];
    const lower = text.toLowerCase();

    // Technology tags
    const techKeywords = ['python', 'javascript', 'node', 'react', 'docker', 'git', 'api', 'database', 'code'];
    techKeywords.forEach(keyword => {
      if (lower.includes(keyword)) tags.push(keyword);
    });

    // Action tags
    if (/\b(debug|fix|error)\b/.test(lower)) tags.push('debug');
    if (/\b(deploy|launch|start)\b/.test(lower)) tags.push('deployment');
    if (/\b(test|verify|check)\b/.test(lower)) tags.push('testing');

    return tags.length > 0 ? tags : ['general'];
  }

  /**
   * Estimate complexity
   */
  estimateComplexity(text) {
    const wordCount = text.split(/\s+/).length;
    const hasCode = /```|function|class|def |const |let /.test(text);
    const hasMultipleQuestions = (text.match(/\?/g) || []).length > 1;

    if (wordCount > 100 || hasCode || hasMultipleQuestions) return 'high';
    if (wordCount > 30) return 'medium';
    return 'low';
  }

  /**
   * Get relevant knowledge
   */
  getRelevantKnowledge(query) {
    const queryLower = query.toLowerCase();
    const knowledge = {
      fixes: [],
      patterns: [],
      solutions: []
    };

    // Find relevant fixes
    for (const [fixId, fix] of Object.entries(this.knowledgeBase.fixes)) {
      if (queryLower.includes(fix.description.toLowerCase().split(' ').slice(0, 3).join(' '))) {
        knowledge.fixes.push(fix);
      }
    }

    return knowledge;
  }

  /**
   * Update knowledge base
   */
  async updateKnowledgeBase(memory) {
    // Track patterns
    const intent = memory.intent;
    if (!this.knowledgeBase.patterns[intent]) {
      this.knowledgeBase.patterns[intent] = {
        count: 0,
        successRate: 0,
        avgCost: 0
      };
    }

    const pattern = this.knowledgeBase.patterns[intent];
    pattern.count++;
    pattern.successRate = ((pattern.successRate * (pattern.count - 1)) + (memory.success ? 1 : 0)) / pattern.count;
    pattern.avgCost = ((pattern.avgCost * (pattern.count - 1)) + memory.cost) / pattern.count;

    // Save periodically (every 10 memories)
    if (this.memories.length % 10 === 0) {
      await this.saveKnowledgeBase();
    }
  }

  /**
   * Get common intents for agent
   */
  getCommonIntents(memories) {
    const intentCounts = {};
    memories.forEach(m => {
      intentCounts[m.intent] = (intentCounts[m.intent] || 0) + 1;
    });

    return Object.entries(intentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([intent, count]) => ({ intent, count }));
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `MEM-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  /**
   * Save memory to disk
   */
  async saveMemory(memory) {
    const line = JSON.stringify(memory) + '\n';
    await fs.appendFile(MEMORY_DB, line, 'utf8');
  }

  /**
   * Load memories from disk
   */
  async loadMemories() {
    try {
      const data = await fs.readFile(MEMORY_DB, 'utf8');
      this.memories = data.trim().split('\n').filter(l => l).map(l => JSON.parse(l));
      console.log(`   📚 Loaded ${this.memories.length} memories from disk`);
    } catch (error) {
      this.memories = [];
      console.log(`   📚 No existing memories found, starting fresh`);
    }
  }

  /**
   * Save knowledge base
   */
  async saveKnowledgeBase() {
    await fs.writeFile(KNOWLEDGE_DB, JSON.stringify(this.knowledgeBase, null, 2), 'utf8');
  }

  /**
   * Load knowledge base
   */
  async loadKnowledgeBase() {
    try {
      const data = await fs.readFile(KNOWLEDGE_DB, 'utf8');
      this.knowledgeBase = JSON.parse(data);
      console.log(`   📖 Knowledge base loaded: ${Object.keys(this.knowledgeBase.fixes).length} fixes`);
    } catch (error) {
      // Use default empty knowledge base
      console.log(`   📖 No existing knowledge base, starting fresh`);
    }
  }

  /**
   * Get memory stats
   */
  getStats() {
    return {
      totalMemories: this.memories.length,
      totalFixes: Object.keys(this.knowledgeBase.fixes).length,
      patterns: Object.keys(this.knowledgeBase.patterns).length,
      successRate: this.memories.filter(m => m.success).length / this.memories.length || 0,
      avgCost: this.memories.reduce((sum, m) => sum + m.cost, 0) / this.memories.length || 0,
      intents: this.getCommonIntents(this.memories)
    };
  }
}

// Export singleton
export const vectorMemory = new VectorMemory();
