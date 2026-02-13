#!/usr/bin/env node

/**
 * PROMPT CACHE SYSTEM
 *
 * - Detects duplicate/similar questions
 * - Returns cached responses instantly
 * - Boosts performance by avoiding regeneration
 * - Smart similarity matching
 * - Automatic cache expiry
 */

import crypto from 'crypto';

export class PromptCache {
  constructor() {
    this.cache = new Map();
    this.similarityThreshold = 0.90; // 90% similarity = cache hit
    this.defaultTTL = 3600000; // 1 hour in milliseconds
    this.hits = 0;
    this.misses = 0;

    // Start cleanup interval
    this.startCleanup();

    console.log('⚡ Prompt Cache: ONLINE');
    console.log('   ✅ Similarity threshold: 90%');
    console.log('   ✅ Default TTL: 1 hour');
    console.log('   ✅ Auto-cleanup enabled');
  }

  /**
   * Check cache for similar question
   */
  async check(message, agentId = 'main') {
    const normalized = this.normalize(message);
    const hash = this.hash(normalized);
    const embedding = this.createEmbedding(normalized);

    // Check exact match first (fastest)
    if (this.cache.has(hash)) {
      const entry = this.cache.get(hash);

      if (this.isExpired(entry)) {
        this.cache.delete(hash);
        this.misses++;
        return { hit: false, reason: 'expired' };
      }

      console.log(`\n⚡ CACHE HIT (exact match)`);
      console.log(`   Query: "${message.substring(0, 50)}..."`);
      console.log(`   Age: ${this.getAge(entry)}s`);

      this.hits++;
      entry.hitCount++;
      entry.lastAccessed = Date.now();

      return {
        hit: true,
        type: 'exact',
        cached: entry,
        hitCount: entry.hitCount
      };
    }

    // Check similarity matches (slower but catches variations)
    for (const [cachedHash, entry] of this.cache.entries()) {
      if (entry.agentId !== agentId) continue;
      if (this.isExpired(entry)) {
        this.cache.delete(cachedHash);
        continue;
      }

      const similarity = this.cosineSimilarity(embedding, entry.embedding);

      if (similarity >= this.similarityThreshold) {
        console.log(`\n⚡ CACHE HIT (similarity: ${(similarity * 100).toFixed(1)}%)`);
        console.log(`   Original: "${entry.message.substring(0, 40)}..."`);
        console.log(`   Current:  "${message.substring(0, 40)}..."`);
        console.log(`   Age: ${this.getAge(entry)}s`);

        this.hits++;
        entry.hitCount++;
        entry.lastAccessed = Date.now();

        return {
          hit: true,
          type: 'similar',
          similarity: similarity,
          cached: entry,
          hitCount: entry.hitCount
        };
      }
    }

    // Cache miss
    this.misses++;
    console.log(`\n❌ Cache miss for: "${message.substring(0, 50)}..."`);

    return { hit: false, reason: 'no_match' };
  }

  /**
   * Store response in cache
   */
  async store(message, response, metadata = {}) {
    const normalized = this.normalize(message);
    const hash = this.hash(normalized);
    const embedding = this.createEmbedding(normalized);

    const entry = {
      hash: hash,
      message: message,
      normalized: normalized,
      embedding: embedding,
      response: response,
      agentId: metadata.agentId || 'main',
      model: metadata.model,
      cost: metadata.cost || 0,
      latency: metadata.latency || 0,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      expiresAt: Date.now() + (metadata.ttl || this.defaultTTL),
      hitCount: 0,
      metadata: metadata
    };

    this.cache.set(hash, entry);

    console.log(`\n💾 Cached response for: "${message.substring(0, 50)}..."`);
    console.log(`   Expires in: ${Math.floor((metadata.ttl || this.defaultTTL) / 1000)}s`);

    return entry;
  }

  /**
   * Normalize message for better matching
   */
  normalize(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[?!.,;:]/g, '')  // Remove punctuation
      .replace(/\s+/g, ' ')       // Normalize spaces
      .replace(/what's/g, 'what is')
      .replace(/what're/g, 'what are')
      .replace(/it's/g, 'it is')
      .replace(/don't/g, 'do not')
      .replace(/can't/g, 'cannot');
  }

  /**
   * Create hash of normalized text
   */
  hash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Create simple embedding for similarity matching
   */
  createEmbedding(text) {
    const words = text.split(/\s+/);
    const embedding = new Array(100).fill(0);

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
   * Cosine similarity
   */
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
    }
    return dotProduct;
  }

  /**
   * Check if entry expired
   */
  isExpired(entry) {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Get age of entry in seconds
   */
  getAge(entry) {
    return Math.floor((Date.now() - entry.createdAt) / 1000);
  }

  /**
   * Clear cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`\n🧹 Cache cleared: ${size} entries removed`);
  }

  /**
   * Clear expired entries
   */
  clearExpired() {
    let removed = 0;
    for (const [hash, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(hash);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`\n🧹 Removed ${removed} expired cache entries`);
    }

    return removed;
  }

  /**
   * Start automatic cleanup
   */
  startCleanup() {
    setInterval(() => {
      this.clearExpired();
    }, 300000); // Every 5 minutes
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;

    // Calculate savings
    let totalSaved = 0;
    let totalSavedCost = 0;
    for (const entry of this.cache.values()) {
      totalSaved += entry.hitCount * entry.latency;
      totalSavedCost += entry.hitCount * entry.cost;
    }

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: hitRate.toFixed(1) + '%',
      timeSaved: Math.floor(totalSaved / 1000) + 's',
      costSaved: '$' + totalSavedCost.toFixed(6),
      avgAge: this.getAvgAge()
    };
  }

  /**
   * Get average age of cache entries
   */
  getAvgAge() {
    if (this.cache.size === 0) return 0;

    let totalAge = 0;
    for (const entry of this.cache.values()) {
      totalAge += this.getAge(entry);
    }

    return Math.floor(totalAge / this.cache.size);
  }

  /**
   * Get popular queries
   */
  getPopular(limit = 5) {
    const entries = Array.from(this.cache.values());
    entries.sort((a, b) => b.hitCount - a.hitCount);

    return entries.slice(0, limit).map(e => ({
      message: e.message,
      hitCount: e.hitCount,
      age: this.getAge(e) + 's'
    }));
  }
}

// Export singleton
export const promptCache = new PromptCache();
