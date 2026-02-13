#!/usr/bin/env node

/**
 * HATAKE Parser - Message Intelligence Agent
 * Converts raw user messages into structured briefs
 * Routes to appropriate track (fast vs orchestrated)
 */

export class HatakeParser {
  constructor() {
    this.name = 'HATAKE';
    this.patterns = this.initPatterns();
    this.promptTemplates = this.initPromptTemplates();
    this.modelMatrix = this.initModelMatrix();
  }

  /**
   * Initialize intent detection patterns
   */
  initPatterns() {
    return {
      // Simple intents (Fast Track)
      simple: [
        { pattern: /^(what|who|when|where|why) is/i, type: 'simple_question' },
        { pattern: /^\d+\s*[\+\-\*\/]\s*\d+/, type: 'calculation' },
        { pattern: /^(hi|hello|hey|greetings)/i, type: 'greeting' },
        { pattern: /^(thanks|thank you)/i, type: 'gratitude' },
        { pattern: /^(yes|no|ok|sure)/i, type: 'confirmation' },
        { pattern: /^(status|health|ping)/i, type: 'status_check' }
      ],

      // Code intents (Orchestrated - need ENG)
      code: [
        { pattern: /(write|create|build|generate|develop|code)\s+(a\s+)?(python|javascript|java|go|rust|typescript|c\+\+)/i, type: 'code_generation' },
        { pattern: /(fix|debug|solve|resolve)\s+(bug|error|issue|problem)/i, type: 'debugging' },
        { pattern: /(refactor|improve|optimize|enhance)\s+(code|function|class)/i, type: 'code_improvement' },
        { pattern: /(test|tests|testing)\s+(code|function|class)/i, type: 'code_testing' },
        { pattern: /code\s+review/i, type: 'code_review' }
      ],

      // Research intents (Orchestrated - need RESEARCH)
      research: [
        { pattern: /(research|investigate|analyze|study|explore)/i, type: 'research' },
        { pattern: /(find|search|look\s+for|discover)\s+(information|data|articles)/i, type: 'information_search' },
        { pattern: /(compare|contrast|difference\s+between)/i, type: 'comparison' },
        { pattern: /(explain|describe|tell\s+me\s+about)\s+.{20,}/i, type: 'detailed_explanation' }
      ],

      // Complex intents (Orchestrated - multi-step)
      complex: [
        { pattern: /(build|create|develop)\s+(a|an)\s+(system|application|platform|service|api)/i, type: 'complex_development' },
        { pattern: /(design|architect|plan)\s+(a|an)\s+/i, type: 'architecture_design' },
        { pattern: /with\s+(authentication|database|testing|deployment)/i, type: 'complex_with_features' },
        { pattern: /\band\b.*\band\b/i, type: 'multi_requirement' }, // Multiple ANDs suggest complexity
        { pattern: /step\s+by\s+step/i, type: 'multi_step_task' }
      ]
    };
  }

  /**
   * Main entry point - parse message and create structured brief
   */
  async parse(message, context = {}) {
    const startTime = Date.now();

    // Create brief
    const brief = {
      brief_id: this.generateBriefId(),
      timestamp: new Date().toISOString(),
      original_message: message,
      user_context: context,

      // Analysis results
      intent: null,
      entities: [],
      complexity: 'unknown',
      track: 'unknown',
      suggested_agents: [],
      constraints: this.extractConstraints(message, context),

      // Metadata
      word_count: this.countWords(message),
      has_code_block: this.hasCodeBlock(message),
      urgency: this.detectUrgency(message, context),

      // Timing
      parsed_in_ms: 0
    };

    // Detect intent
    brief.intent = this.detectIntent(message);

    // Extract entities
    brief.entities = this.extractEntities(message, brief.intent);

    // Determine complexity
    brief.complexity = this.determineComplexity(message, brief.intent, brief.entities);

    // Route to track
    brief.track = this.selectTrack(brief);

    // Suggest agents
    brief.suggested_agents = this.suggestAgents(brief);

    // PROMPT ENGINEERING - Optimize prompts for each agent
    brief.optimized_prompts = this.engineerPrompts(brief);

    // MODEL SELECTION - Choose best model for each agent
    brief.model_recommendations = this.selectModels(brief);

    // Calculate parsing time
    brief.parsed_in_ms = Date.now() - startTime;

    // Log
    console.log(`\n🎯 HATAKE parsed message:`);
    console.log(`   Intent: ${brief.intent}`);
    console.log(`   Complexity: ${brief.complexity}`);
    console.log(`   Track: ${brief.track}`);
    console.log(`   Agents: ${brief.suggested_agents.join(', ')}`);
    console.log(`   ✨ Prompt Engineering: ${Object.keys(brief.optimized_prompts || {}).length} prompts optimized`);
    console.log(`   🎯 Model Selection: ${Object.keys(brief.model_recommendations || {}).length} models selected`);
    console.log(`   Time: ${brief.parsed_in_ms}ms\n`);

    return brief;
  }

  /**
   * Detect primary intent from message
   */
  detectIntent(message) {
    const lowerMessage = message.toLowerCase();

    // Check all pattern categories
    for (const [category, patterns] of Object.entries(this.patterns)) {
      for (const { pattern, type } of patterns) {
        if (pattern.test(message)) {
          return { category, type };
        }
      }
    }

    // Default: general query
    return { category: 'general', type: 'general_query' };
  }

  /**
   * Extract entities (programming languages, technologies, etc.)
   */
  extractEntities(message, intent) {
    const entities = [];
    const lowerMessage = message.toLowerCase();

    // Programming languages
    const languages = ['python', 'javascript', 'java', 'go', 'rust', 'typescript', 'c++', 'ruby', 'php', 'swift'];
    languages.forEach(lang => {
      if (lowerMessage.includes(lang)) {
        entities.push({ type: 'language', value: lang });
      }
    });

    // Technologies
    const technologies = ['react', 'vue', 'angular', 'node', 'express', 'django', 'flask', 'spring', 'docker', 'kubernetes'];
    technologies.forEach(tech => {
      if (lowerMessage.includes(tech)) {
        entities.push({ type: 'technology', value: tech });
      }
    });

    // Features
    const features = ['authentication', 'auth', 'database', 'db', 'api', 'rest', 'graphql', 'testing', 'tests', 'deployment'];
    features.forEach(feature => {
      if (lowerMessage.includes(feature)) {
        entities.push({ type: 'feature', value: feature });
      }
    });

    // File types
    const fileTypes = ['.py', '.js', '.java', '.go', '.rs', '.ts', '.cpp', '.rb', '.php'];
    fileTypes.forEach(ext => {
      if (message.includes(ext)) {
        entities.push({ type: 'file_type', value: ext });
      }
    });

    return entities;
  }

  /**
   * Determine complexity level
   */
  determineComplexity(message, intent, entities) {
    let score = 0;

    // Word count factor
    const wordCount = this.countWords(message);
    if (wordCount > 100) score += 3;
    else if (wordCount > 50) score += 2;
    else if (wordCount > 20) score += 1;

    // Intent category factor
    if (intent.category === 'complex') score += 5;
    else if (intent.category === 'code') score += 3;
    else if (intent.category === 'research') score += 2;
    else if (intent.category === 'simple') score += 0;

    // Entity count factor
    if (entities.length > 5) score += 3;
    else if (entities.length > 2) score += 2;
    else if (entities.length > 0) score += 1;

    // Multiple requirements factor
    const andCount = (message.match(/\band\b/gi) || []).length;
    if (andCount > 2) score += 3;
    else if (andCount > 1) score += 2;

    // Code block factor
    if (this.hasCodeBlock(message)) score += 2;

    // Classify complexity
    if (score >= 8) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  /**
   * Select appropriate track
   */
  selectTrack(brief) {
    // Force fast track for simple/urgent
    if (brief.complexity === 'low' && brief.urgency === 'high') {
      return 'fast';
    }

    // Force fast track for simple intents
    if (brief.intent.category === 'simple') {
      return 'fast';
    }

    // Use orchestrated for code/research/complex
    if (['code', 'research', 'complex'].includes(brief.intent.category)) {
      return 'orchestrated';
    }

    // Default based on complexity
    if (brief.complexity === 'low') {
      return 'fast';
    } else {
      return 'orchestrated';
    }
  }

  /**
   * Suggest agents based on brief
   */
  suggestAgents(brief) {
    const agents = [];

    // Intent-based suggestions
    if (brief.intent.category === 'code') {
      agents.push('ENG');
      agents.push('OPS'); // Always validate code
    } else if (brief.intent.category === 'research') {
      agents.push('RESEARCH');
    } else if (brief.intent.category === 'complex') {
      agents.push('ENG');
      agents.push('RESEARCH');
      agents.push('OPS');
    }

    // Entity-based suggestions
    const hasFinancialEntity = brief.entities.some(e =>
      ['cost', 'budget', 'price', 'finance'].includes(e.value)
    );
    if (hasFinancialEntity) {
      agents.push('FINANCE');
    }

    // Default for simple
    if (agents.length === 0) {
      // Fast track doesn't need specific agents
      return [];
    }

    // Remove duplicates
    return [...new Set(agents)];
  }

  /**
   * Extract constraints from message and context
   */
  extractConstraints(message, context) {
    const constraints = {
      budget: context.budget || null,
      max_time: context.max_time || null,
      urgent: false
    };

    // Check for urgency keywords
    if (/urgent|asap|quickly|fast|now|immediately/i.test(message)) {
      constraints.urgent = true;
    }

    return constraints;
  }

  /**
   * Detect urgency level
   */
  detectUrgency(message, context) {
    if (context.urgent) return 'high';

    const urgentKeywords = /urgent|asap|quickly|fast|now|immediately|emergency|critical/i;
    if (urgentKeywords.test(message)) return 'high';

    return 'normal';
  }

  /**
   * Count words in message
   */
  countWords(message) {
    return message.trim().split(/\s+/).length;
  }

  /**
   * Check if message contains code block
   */
  hasCodeBlock(message) {
    return /```/.test(message) || /`[^`]+`/.test(message);
  }

  /**
   * Generate unique brief ID
   */
  generateBriefId() {
    return `brief-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get parser statistics
   */
  getStats() {
    return {
      name: this.name,
      version: '2.0', // Updated with prompt engineering
      patterns_loaded: Object.keys(this.patterns).length,
      prompt_templates: Object.keys(this.promptTemplates).length,
      model_matrix_size: Object.keys(this.modelMatrix).length
    };
  }

  // ==========================================
  // PROMPT ENGINEERING SECTION
  // ==========================================

  /**
   * Initialize prompt templates for each intent type
   */
  initPromptTemplates() {
    return {
      // Code generation prompts
      code_generation: {
        ENG: `You are an expert {language} developer. Generate production-ready code based on the following requirements:

Requirements: {requirements}

Key constraints:
- Use {language} best practices and idioms
- Include comprehensive error handling
- Add input validation where needed
- Follow modern patterns and standards
- Make code maintainable and readable
{additional_features}

Return ONLY the complete, working code. No explanations, just code.`,

        OPS: `You are a code quality validator. Review the following code against these criteria:

Code to validate:
{code}

Validation checklist:
1. Correctness - Does it solve the problem correctly?
2. Error handling - Are edge cases covered?
3. Performance - Is it efficient?
4. Security - Any vulnerabilities?
5. Best practices - Follows {language} standards?
6. Tests - Are tests comprehensive?

Return your assessment in this format:
PASS/FAIL
Reason: [detailed feedback]
Issues: [list any problems]
Suggestions: [improvements if any]`
      },

      debugging: {
        ENG: `You are a debugging expert specializing in {language}. Analyze and fix the following issue:

Problem: {problem_description}

Context:
{code_context}

Instructions:
- Identify the root cause
- Provide a complete fix
- Explain what was wrong
- Add safeguards to prevent recurrence
- Include relevant tests

Return: Fixed code + explanation`,

        OPS: `Validate the bug fix:

Original problem: {problem}
Proposed fix: {fix}

Verify:
1. Does it fix the root cause?
2. Are there side effects?
3. Is it properly tested?
4. Could this break existing functionality?

Return: PASS/FAIL with detailed analysis`
      },

      research: {
        RESEARCH: `You are a research specialist. Conduct thorough research on:

Topic: {topic}

Requirements:
- Provide accurate, up-to-date information
- Include multiple perspectives if applicable
- Cite sources or reasoning
- Structure information clearly
- Focus on practical, actionable insights
{specific_constraints}

Deliver a comprehensive, well-organized response.`
      },

      complex_development: {
        ENG: `You are a senior architect and developer. Build a complete {system_type}:

Requirements:
{requirements}

Components needed:
{components}

Technical specifications:
- Language/Framework: {technologies}
- Features: {features}
- Quality requirements: Production-ready, tested, documented

Deliver complete, working code for all components.`,

        RESEARCH: `Research best practices and patterns for:

System: {system_type}
Technologies: {technologies}
Features: {features}

Provide:
- Recommended architecture patterns
- Security considerations
- Performance optimization tips
- Common pitfalls to avoid
- Industry standards

Be specific and actionable.`,

        OPS: `Validate the complete system:

System: {system_type}
Components: {components}

Comprehensive validation:
1. Architecture - Is it well-designed?
2. Code quality - All components production-ready?
3. Integration - Do parts work together?
4. Testing - Adequate test coverage?
5. Security - Any vulnerabilities?
6. Performance - Any bottlenecks?
7. Documentation - Is it clear?

Provide detailed assessment with PASS/FAIL for each area.`
      },

      simple_question: {
        default: `Answer this question concisely and accurately:

Question: {question}

Provide a clear, direct answer.`
      },

      general_query: {
        default: `{original_message}

Provide a helpful, accurate response.`
      }
    };
  }

  /**
   * Initialize model selection matrix
   */
  initModelMatrix() {
    return {
      // Language-specific models
      languages: {
        python: {
          primary: 'ollama/qwen2.5-coder:7b',
          fallback: 'ollama/llama3.1:8b',
          reason: 'qwen2.5-coder specialized for Python'
        },
        javascript: {
          primary: 'ollama/qwen2.5-coder:7b',
          fallback: 'ollama/llama3.1:8b',
          reason: 'qwen2.5-coder optimized for JS/TS'
        },
        typescript: {
          primary: 'ollama/qwen2.5-coder:7b',
          fallback: 'ollama/llama3.1:8b',
          reason: 'qwen2.5-coder excellent for TypeScript'
        },
        java: {
          primary: 'ollama/qwen2.5-coder:7b',
          fallback: 'ollama/llama3.1:8b',
          reason: 'qwen2.5-coder handles Java well'
        },
        go: {
          primary: 'ollama/qwen2.5-coder:7b',
          fallback: 'ollama/llama3.1:8b',
          reason: 'qwen2.5-coder good for Go'
        },
        rust: {
          primary: 'ollama/qwen2.5-coder:7b',
          fallback: 'ollama/llama3.1:8b',
          reason: 'qwen2.5-coder handles Rust'
        }
      },

      // Task-specific models
      tasks: {
        code_generation: {
          ENG: 'ollama/qwen2.5-coder:7b',
          OPS: 'ollama/llama3.1:8b'
        },
        debugging: {
          ENG: 'ollama/qwen2.5-coder:7b',
          OPS: 'ollama/llama3.1:8b'
        },
        code_review: {
          OPS: 'ollama/llama3.1:8b'
        },
        research: {
          RESEARCH: 'ollama/llama3.1:8b'
        },
        simple_question: {
          default: 'ollama/llama3.1:8b'
        },
        complex_development: {
          ENG: 'ollama/qwen2.5-coder:7b',
          RESEARCH: 'ollama/llama3.1:8b',
          OPS: 'ollama/llama3.1:8b'
        }
      },

      // Complexity-based models
      complexity: {
        low: 'ollama/llama3.1:8b',
        medium: 'ollama/qwen2.5-coder:7b',
        high: 'ollama/qwen2.5-coder:7b'
      }
    };
  }

  /**
   * Engineer optimized prompts for each agent
   */
  engineerPrompts(brief) {
    const optimizedPrompts = {};
    const intentType = brief.intent.type;

    // Get base template for this intent
    const template = this.promptTemplates[intentType] || this.promptTemplates.general_query;

    // For each suggested agent, create optimized prompt
    brief.suggested_agents.forEach(agent => {
      const agentTemplate = template[agent] || template.default || template[Object.keys(template)[0]];

      // Inject dynamic values
      const optimized = this.injectDynamicValues(agentTemplate, brief);

      optimizedPrompts[agent] = optimized;
    });

    // If no agents (fast track), create default prompt
    if (brief.suggested_agents.length === 0) {
      const defaultTemplate = template.default || this.promptTemplates.general_query.default;
      optimizedPrompts.default = this.injectDynamicValues(defaultTemplate, brief);
    }

    return optimizedPrompts;
  }

  /**
   * Inject dynamic values into prompt template
   */
  injectDynamicValues(template, brief) {
    let prompt = template;

    // Extract language
    const languageEntity = brief.entities.find(e => e.type === 'language');
    const language = languageEntity ? languageEntity.value : 'the specified language';

    // Extract features
    const features = brief.entities
      .filter(e => e.type === 'feature')
      .map(e => e.value)
      .join(', ') || 'standard features';

    // Extract technologies
    const technologies = brief.entities
      .filter(e => e.type === 'technology')
      .map(e => e.value)
      .join(', ') || 'appropriate technologies';

    // Build additional features section
    let additionalFeatures = '';
    if (features !== 'standard features') {
      additionalFeatures = `- Implement these features: ${features}`;
    }

    // Replace placeholders
    prompt = prompt
      .replace(/{language}/g, language)
      .replace(/{requirements}/g, brief.original_message)
      .replace(/{original_message}/g, brief.original_message)
      .replace(/{question}/g, brief.original_message)
      .replace(/{topic}/g, brief.original_message)
      .replace(/{problem_description}/g, brief.original_message)
      .replace(/{problem}/g, brief.original_message)
      .replace(/{features}/g, features)
      .replace(/{technologies}/g, technologies)
      .replace(/{additional_features}/g, additionalFeatures)
      .replace(/{system_type}/g, this.extractSystemType(brief))
      .replace(/{components}/g, this.extractComponents(brief))
      .replace(/{specific_constraints}/g, this.formatConstraints(brief));

    return prompt.trim();
  }

  /**
   * Select best models for each agent
   */
  selectModels(brief) {
    const modelRecommendations = {};
    const intentType = brief.intent.type;

    // Get language-specific model if applicable
    const languageEntity = brief.entities.find(e => e.type === 'language');
    let primaryModel = null;
    let modelReason = '';

    if (languageEntity && this.modelMatrix.languages[languageEntity.value]) {
      const langConfig = this.modelMatrix.languages[languageEntity.value];
      primaryModel = langConfig.primary;
      modelReason = langConfig.reason;
    }

    // For each suggested agent, select best model
    brief.suggested_agents.forEach(agent => {
      let selectedModel = null;
      let reason = '';

      // Check task-specific model
      if (this.modelMatrix.tasks[intentType] && this.modelMatrix.tasks[intentType][agent]) {
        selectedModel = this.modelMatrix.tasks[intentType][agent];
        reason = `${agent} specialized for ${intentType}`;
      }

      // Override with language-specific if applicable
      if (primaryModel && agent === 'ENG') {
        selectedModel = primaryModel;
        reason = modelReason;
      }

      // Fallback to complexity-based
      if (!selectedModel) {
        selectedModel = this.modelMatrix.complexity[brief.complexity] || 'ollama/llama3.1:8b';
        reason = `best for ${brief.complexity} complexity tasks`;
      }

      modelRecommendations[agent] = {
        model: selectedModel,
        reason: reason
      };
    });

    // If no agents (fast track), select based on complexity
    if (brief.suggested_agents.length === 0) {
      const model = this.modelMatrix.complexity[brief.complexity] || 'ollama/llama3.1:8b';
      modelRecommendations.default = {
        model: model,
        reason: `optimal for ${brief.complexity} complexity queries`
      };
    }

    return modelRecommendations;
  }

  /**
   * Extract system type from brief
   */
  extractSystemType(brief) {
    const message = brief.original_message.toLowerCase();

    if (message.includes('api')) return 'REST API';
    if (message.includes('application')) return 'application';
    if (message.includes('system')) return 'system';
    if (message.includes('service')) return 'service';
    if (message.includes('platform')) return 'platform';

    return 'software system';
  }

  /**
   * Extract components from brief
   */
  extractComponents(brief) {
    const components = [];

    brief.entities.forEach(entity => {
      if (entity.type === 'feature') {
        components.push(entity.value);
      }
    });

    return components.length > 0 ? components.join(', ') : 'core components';
  }

  /**
   * Format constraints for prompt
   */
  formatConstraints(brief) {
    const constraints = [];

    if (brief.constraints.budget) {
      constraints.push(`- Budget: ${brief.constraints.budget}`);
    }

    if (brief.constraints.max_time) {
      constraints.push(`- Time limit: ${brief.constraints.max_time}`);
    }

    if (brief.constraints.urgent) {
      constraints.push(`- URGENT: Prioritize speed`);
    }

    return constraints.length > 0 ? '\n' + constraints.join('\n') : '';
  }
}

// Export singleton
export const hatakeParser = new HatakeParser();
