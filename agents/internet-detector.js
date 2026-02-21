#!/usr/bin/env node

/**
 * Internet Requirement Detector
 * Detects when a query NEEDS internet access
 */

export class InternetDetector {
  constructor() {
    this.internetKeywords = [
      // Real-time / Current
      'latest', 'current', 'today', 'now', 'recent', 'this week', 'this month',
      'breaking', 'live', 'real-time', 'right now',

      // News & Events
      'news', 'headlines', 'happening', 'update', 'updates',

      // Search & Research
      'search for', 'find', 'look up', 'google', 'research',
      'information about', 'tell me about', 'what is happening',

      // Version/Status Checks
      'version', 'upgrade', 'update', 'check', 'download',
      'install', 'latest release', 'new version',

      // Stock/Crypto/Markets
      'price', 'stock', 'crypto', 'bitcoin', 'market',
      'exchange rate', 'currency',

      // Weather
      'weather', 'temperature', 'forecast', 'rain', 'sunny',

      // Sports Scores
      'score', 'match', 'game', 'cricket', 'football', 'sports',

      // External Services
      'github', 'stackoverflow', 'wikipedia', 'website',
      'web', 'online', 'internet'
    ];

    this.patterns = [
      /what('s| is) (the )?(latest|current|new)/i,
      /how (much|many) is/i,
      /what happened (in|on|with)/i,
      /tell me about (the )?(latest|current)/i,
      /check (the )?(status|version|update)/i,
      /search (for|about)/i,
      /(news|updates?) (about|on|for)/i,
      /upgrade .* (to|from)/i,
      /download .* (from|version)/i
    ];
  }

  /**
   * Detect if query needs internet
   */
  needsInternet(message) {
    const lowerMessage = message.toLowerCase();

    // Check keywords
    for (const keyword of this.internetKeywords) {
      if (lowerMessage.includes(keyword)) {
        return {
          needed: true,
          reason: `Detected keyword: "${keyword}"`,
          confidence: 'high'
        };
      }
    }

    // Check patterns
    for (const pattern of this.patterns) {
      if (pattern.test(message)) {
        return {
          needed: true,
          reason: `Matched pattern: ${pattern.source}`,
          confidence: 'high'
        };
      }
    }

    // Questions about current/recent things
    if (/\b(today|now|current|latest)\b/i.test(message)) {
      return {
        needed: true,
        reason: 'Time-sensitive query',
        confidence: 'medium'
      };
    }

    return {
      needed: false,
      reason: 'Can be answered with local knowledge',
      confidence: 'high'
    };
  }

  /**
   * Get recommended tool/model for internet-required query
   */
  getInternetTool(message) {
    const detection = this.needsInternet(message);

    if (!detection.needed) {
      return null;
    }

    // Recommend Perplexity for internet queries
    return {
      tool: 'perplexity',
      model: 'sonar-pro',
      reason: 'Internet-enabled model for real-time information',
      fallback: 'web-search'
    };
  }
}

// Export singleton
export const internetDetector = new InternetDetector();
