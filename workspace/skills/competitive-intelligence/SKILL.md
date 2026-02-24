# Competitive Intelligence Skill

## Overview
Continuously monitors and analyzes AI tool system prompts from leading companies (Cursor, v0, Perplexity, Devin AI, etc.) to identify patterns, improvements, and competitive advantages for OpenClaw.

## When to Use
- When you need competitive analysis of AI tools
- When identifying improvement opportunities for OpenClaw
- When researching market trends and patterns
- When developing new agent capabilities

## What This Skill Does

### 1. Repository Monitoring
Automatically monitors AI prompt repositories:
- GitHub repository scanning
- New prompt pattern detection
- Version tracking and changes
- License and compliance checking

### 2. Pattern Extraction
Identifies valuable patterns from competitor tools:
- Tool design patterns
- Prompt engineering techniques
- Security and governance mechanisms
- User experience improvements

### 3. Gap Analysis
Compares OpenClaw capabilities against competitors:
- Feature comparison matrix
- Capability gap identification
- Implementation difficulty assessment
- Priority ranking for improvements

### 4. Implementation Recommendations
Generates concrete implementation suggestions:
- Quick wins (1-2 weeks)
- Medium-term improvements (1 month)
- Long-term strategic initiatives (2-3 months)
- Risk assessment for each recommendation

## Integration with OpenClaw Framework

### As a Skill
```bash
# Enable competitive intelligence monitoring
openclaw skills enable competitive-intelligence

# Run analysis on specific repository
openclaw skills run competitive-intelligence --repo https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools

# Generate weekly intelligence report
openclaw skills run competitive-intelligence --report weekly
```

### As a Tool
```json
{
  "tool": "competitive_analysis",
  "explanation": "Analyze competitor AI tool patterns for improvement opportunities",
  "expected": "Return prioritized list of adoptable patterns",
  "risk": "low",
  "taskNameActive": "Analyzing competitor patterns...",
  "taskNameComplete": "Competitor analysis completed",
  "parameters": {
    "repository": "https://github.com/example/ai-prompts",
    "focus_areas": ["tool_governance", "prompt_engineering", "ux_patterns"],
    "implementation_timeline": "quick_wins"
  }
}
```

### As Agent Capability
Enhances RESEARCH agent with continuous competitive monitoring:
- Automated repository scanning
- Pattern recognition and categorization
- Implementation roadmap generation
- Competitive advantage tracking

## Core Utilities

### 1. Repository Scanner
```python
def scan_repository(repo_url, focus_areas=None):
    """
    Scan AI prompt repository for valuable patterns
    Returns: Pattern analysis and recommendations
    """
    # Clone and analyze repository
    # Extract tool definitions and prompts
    # Categorize patterns by type and value
    # Generate implementation suggestions
```

### 2. Pattern Matcher
```python
def match_patterns(competitor_tools, openclaw_tools):
    """
    Identify patterns that can improve OpenClaw
    Returns: Gap analysis and adoption recommendations
    """
    # Compare tool designs
    # Identify missing features
    # Assess implementation difficulty
    # Prioritize by impact and effort
```

### 3. Implementation Planner
```python
def plan_implementation(patterns, timeline="quick_wins"):
    """
    Create implementation roadmap for identified patterns
    Returns: Prioritized action items with timelines
    """
    # Categorize by implementation complexity
    # Estimate development effort
    # Create milestone-based roadmap
    # Identify dependencies and risks
```

## Configuration

### Environment Variables
```bash
OPENCLAW_COMPETITIVE_INTEL_ENABLED=true
OPENCLAW_INTEL_REPOS=https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools,https://github.com/example/other-repo
OPENCLAW_INTEL_SCHEDULE=daily
OPENCLAW_INTEL_FOCUS=tool_governance,prompt_engineering,security
```

### Monitoring Targets
```yaml
repositories:
  - url: https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools
    focus: tool_governance, prompt_engineering
    schedule: daily
  - url: https://github.com/example/cursor-prompts
    focus: ux_patterns, tool_design
    schedule: weekly
```

## Integration Points

### With RESEARCH Agent
- Continuous monitoring automation
- Pattern analysis and categorization
- Implementation recommendation generation
- Competitive intelligence reporting

### With ENG Agent
- Implementation feasibility assessment
- Technical specification creation
- Development effort estimation
- Integration testing and validation

### With OPS Agent
- Cost-benefit analysis
- Resource allocation planning
- Implementation timeline coordination
- Success metrics tracking

### With INFOSEC Agent
- Security pattern analysis
- Risk assessment for new patterns
- Compliance verification
- Threat intelligence integration

## Benefits

### Strategic Benefits
- Competitive advantage through pattern adoption
- Faster innovation cycle
- Market leadership positioning
- Reduced R&D costs through learning

### Operational Benefits
- Automated competitive monitoring
- Systematic improvement identification
- Prioritized implementation roadmap
- Measurable competitive intelligence

### Technical Benefits
- Proven patterns from market leaders
- Reduced development risk
- Faster feature implementation
- Better agent capabilities

## Examples

### Quick Win Implementation
```bash
# Identify and implement tool explanations from Cursor
openclaw skills run competitive-intelligence \
  --pattern tool_explanations \
  --source cursor \
  --timeline quick_wins

# Result: Tool explanation fields added to all OpenClaw tools
```

### Strategic Analysis
```bash
# Generate comprehensive competitive analysis
openclaw skills run competitive-intelligence \
  --report comprehensive \
  --timeline quarterly \
  --format markdown

# Result: 50-page competitive intelligence report
```

## Monitoring and Metrics

### Intelligence Metrics
- Patterns identified per week
- Implementation recommendations generated
- Adoption rate of suggested patterns
- Competitive position improvement

### Quality Metrics
- Pattern relevance score
- Implementation success rate
- User satisfaction with new features
- Performance impact assessment

## Installation

1. Clone skill to workspace:
```bash
git clone https://github.com/openclaw/competitive-intelligence-skill ~/.openclaw/workspace/skills/competitive-intelligence/
```

2. Configure monitoring targets:
```bash
openclaw config set competitive_intel.repos "https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools"
```

3. Enable skill for agents:
```bash
openclaw agents set research --skills competitive-intelligence
```

4. Schedule regular analysis:
```bash
openclaw cron create --name "competitive-intel" --schedule "0 9 * * 1" --skill competitive-intelligence
```

## Future Enhancements

### Planned Features
- Real-time pattern detection
- Automated implementation suggestions
- Cross-platform pattern analysis
- Machine learning for pattern prediction

### Integration Opportunities
- External market intelligence APIs
- Industry analyst integration
- Patent and IP monitoring
- Academic research tracking

## Compliance and Ethics

### Data Usage
- Only analyzes publicly available repositories
- Respects repository licenses and terms
- Does not copy proprietary content
- Focuses on patterns, not specific implementations

### Intellectual Property
- Patterns are considered common knowledge
- Implementation details are original
- No direct code copying from competitors
- Focus on learning and adaptation
