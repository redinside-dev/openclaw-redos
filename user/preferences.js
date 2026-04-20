#!/usr/bin/env node

/**
 * USER PREFERENCES SYSTEM
 *
 * - Store user-specific settings
 * - Model overrides (bypass smart routing)
 * - Custom configurations
 * - Per-user, per-channel preferences
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PREFS_FILE = path.join(__dirname, '../data/user/preferences.json');

export class UserPreferences {
  constructor() {
    this.preferences = {};
    this.init();
  }

  /**
   * Initialize preferences system
   */
  async init() {
    await fs.mkdir(path.dirname(PREFS_FILE), { recursive: true });
    await this.load();

    console.log('👤 User Preferences: ONLINE');
    console.log('   ✅ Model overrides enabled');
    console.log('   ✅ ${Object.keys(this.preferences).length} users configured');
  }

  /**
   * Set model override for user
   */
  async setModelOverride(userId, provider, model) {
    if (!this.preferences[userId]) {
      this.preferences[userId] = {};
    }

    this.preferences[userId].modelOverride = {
      provider: provider,
      model: model,
      setAt: new Date().toISOString()
    };

    await this.save();

    console.log(`\n👤 Model override set for user ${userId}`);
    console.log(`   Provider: ${provider}`);
    console.log(`   Model: ${model}`);

    return this.preferences[userId].modelOverride;
  }

  /**
   * Clear model override (back to auto-routing)
   */
  async clearModelOverride(userId) {
    if (this.preferences[userId]) {
      delete this.preferences[userId].modelOverride;
      await this.save();
    }

    console.log(`\n👤 Model override cleared for user ${userId}`);
    console.log(`   Now using smart routing`);
  }

  /**
   * Get model override for user
   */
  getModelOverride(userId) {
    return this.preferences[userId]?.modelOverride || null;
  }

  /**
   * Get all preferences for user
   */
  getUserPreferences(userId) {
    return this.preferences[userId] || {};
  }

  /**
   * Set custom preference
   */
  async setPreference(userId, key, value) {
    if (!this.preferences[userId]) {
      this.preferences[userId] = {};
    }

    this.preferences[userId][key] = value;
    await this.save();

    return value;
  }

  /**
   * Get custom preference
   */
  getPreference(userId, key, defaultValue = null) {
    return this.preferences[userId]?.[key] || defaultValue;
  }

  /**
   * Save preferences to disk
   */
  async save() {
    await fs.writeFile(PREFS_FILE, JSON.stringify(this.preferences, null, 2), 'utf8');
  }

  /**
   * Load preferences from disk
   */
  async load() {
    try {
      const data = await fs.readFile(PREFS_FILE, 'utf8');
      this.preferences = JSON.parse(data);
      console.log(`   📚 Loaded preferences for ${Object.keys(this.preferences).length} users`);
    } catch (error) {
      this.preferences = {};
      console.log(`   📚 No existing preferences, starting fresh`);
    }
  }
}

// Export singleton
export const userPreferences = new UserPreferences();
