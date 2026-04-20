# Tool Governance Skill

## Overview
Implements tool governance patterns from Cursor, v0, and other leading AI tools to improve OpenClaw agent reliability and auditability.

## When to Use
- When agents need to execute tools with proper governance
- When you need tool call explanations and risk assessment
- When implementing task naming for better UX
- When adding parameter validation to prevent errors

## What This Skill Does

### 1. Tool Call Wrapper
Adds required governance fields to all tool calls:
- `explanation`: Why this tool is being used
- `expected`: What success looks like  
- `risk`: Low/Medium/High risk assessment
- `taskNameActive`: Present tense task name
- `taskNameComplete`: Past tense completion name

### 2. Parameter Validation
Validates tool parameters against JSON schemas before execution:
- Required field validation
- Type checking
- Mutually exclusive field validation
- Range/format validation

### 3. Context Sufficiency Checks
Ensures agents have sufficient context before file operations:
- File existence verification
- Content size assessment
- Anchor text verification
- Context completeness checks

### 4. Structured Output Formatting
Standardizes agent responses across all agents:
- Answer section (2-5 bullets)
- Evidence section (sources/logs/files)
- Action section (what changed/next steps)
- Risks/Notes section (optional)

### 5. Approval gates (human-in-the-loop)
For **risk: high** or any of the following, the agent **must not** execute until a human has explicitly approved in the same session:
- Deploy/release to production; payments or financial commits; destructive file ops (`rm -rf`, bulk delete); production DB or secrets writes; elevated exec (sudo, system services, firewall).
- **Behavior:** Before calling the tool, send a clear message: what will be done, why, and the exact action. Ask "Approve? (yes/no)" and wait for a reply. Proceed only on explicit "yes". See SOUL.md § Approval gates.

## Implementation

### Tool Call Template
```json
{
  "tool": "tool_name",
  "explanation": "Why this tool is needed now",
  "expected": "What success looks like",
  "risk": "low|medium|high",
  "taskNameActive": "Performing operation...",
  "taskNameComplete": "Operation completed",
  "parameters": {
    // Original tool parameters
  }
}
```

### Response Template
```markdown
## Answer
- Key point 1
- Key point 2
- Key point 3

## Evidence
- Source: file.log line 123
- Source: https://example.com
- Source: agent output

## Action
- Updated configuration file
- Created new skill
- Restarted gateway

## Risks/Notes
- Requires gateway restart
- May affect existing sessions
```

## Configuration

### Required Environment Variables
- `OPENCLAW_TOOL_GOVERNANCE_ENABLED`: true/false
- `OPENCLAW_RISK_ASSESSMENT`: strict/lenient
- `OPENCLAW_TASK_NAMING`: true/false

### Tool Schema Validation
Each tool must have a JSON schema defining:
- Required parameters
- Parameter types
- Validation rules
- Risk level defaults

## Integration Points

### With Existing Skills
- **web-search**: Add explanation and task naming
- **file-operations**: Add context sufficiency checks
- **agent-communication**: Add structured output formatting
- **cron-jobs**: Add parameter validation

### With Agent Framework
- **Agent Prompts**: Include governance requirements
- **Tool Registration**: Validate schemas on registration
- **Session Management**: Track task names and explanations
- **Logging**: Enhanced audit trail with governance data

## Benefits

### Immediate Benefits
- Reduced tool call errors
- Better audit trails
- Improved user experience
- Consistent agent responses

### Long-term Benefits
- Easier debugging
- Better agent coordination
- Enhanced security
- Competitive advantage

## Examples

### Before (without governance)
```json
{
  "tool": "read_file",
  "parameters": {
    "file": "/path/to/file"
  }
}
```

### After (with governance)
```json
{
  "tool": "read_file",
  "explanation": "Need to read configuration to verify API key",
  "expected": "Return file contents with API key validation",
  "risk": "low",
  "taskNameActive": "Reading configuration file...",
  "taskNameComplete": "Configuration file read",
  "parameters": {
    "file": "/path/to/file",
    "validate_context": true
  }
}
```

## Monitoring and Metrics

### Governance Metrics
- Tool call success rate
- Parameter validation failures
- Risk assessment accuracy
- Task naming compliance

### Audit Trail
- All tool calls with explanations
- Parameter validation results
- Context sufficiency checks
- Risk assessments and outcomes

## Installation

1. Copy skill to `~/.openclaw/workspace/skills/tool-governance/`
2. Update agent configurations to use governance wrapper
3. Define JSON schemas for existing tools
4. Enable skill in agent configurations
5. Test with sample tool calls

## Troubleshooting

### Common Issues
- Schema validation failures: Check JSON schema syntax
- Missing explanations: Ensure explanation field is required
- Task naming conflicts: Use unique task names
- Context checks failing: Verify file permissions and paths

### Debug Mode
Enable debug logging with:
```bash
export OPENCLAW_TOOL_GOVERNANCE_DEBUG=true
```

## Future Enhancements

### Planned Features
- Dynamic risk assessment
- Learning from past tool calls
- Advanced context analysis
- Cross-agent coordination

### Integration Opportunities
- MCP server integration
- External audit systems
- Compliance reporting
- Performance analytics
