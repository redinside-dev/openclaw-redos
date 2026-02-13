export class TaskAnalyzer {
  analyzePriority(message, context) {
    // Urgent keywords
    if (message.match(/urgent|asap|emergency|critical|now|immediately/i)) {
      return 'urgent';
    }

    // Owner gets high priority
    if (context.userId === '1012034994') {
      return 'high';
    }

    // Default
    return 'normal';
  }

  analyzeComplexity(message) {
    const length = message.length;

    // Very simple questions
    if (length < 50 && message.match(/^(what|who|when|where|how much|what's)/i)) {
      return 2;
    }

    // Code/technical tasks
    if (message.match(/code|implement|function|debug|refactor|algorithm|optimize/i)) {
      return 7;
    }

    // Research/analysis
    if (message.match(/research|analyze|investigate|explain|compare|evaluate/i)) {
      return 6;
    }

    // Long messages are complex
    if (length > 500) {
      return 7;
    }

    // Default moderate complexity
    return 5;
  }

  classifyTaskType(message) {
    if (message.match(/code|implement|debug|function|class|algorithm/i)) return 'code';
    if (message.match(/research|analyze|investigate|study/i)) return 'research';
    if (message.match(/latest|news|current|now|today|recent/i)) return 'realtime';
    if (message.match(/explain|what is|define|describe/i)) return 'explanation';
    return 'general';
  }
}
