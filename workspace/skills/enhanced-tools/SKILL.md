# Enhanced Tools Skill

## Overview
Implements enhanced tool capabilities based on patterns from leading AI tools (Cursor, v0, Perplexity) to improve OpenClaw agent effectiveness and user experience.

## When to Use
- When agents need advanced search capabilities
- When file operations require context awareness
- When web fetching needs metadata extraction
- When repository analysis is needed

## Enhanced Tools

### 1. Enhanced Codebase Search
Based on Cursor's semantic search with directory targeting.

```json
{
  "tool": "enhanced_codebase_search",
  "explanation": "Search codebase semantically with directory targeting for relevant results",
  "expected": "Return ranked code snippets with relevance scores",
  "risk": "low",
  "taskNameActive": "Searching codebase...",
  "taskNameComplete": "Codebase search completed",
  "parameters": {
    "query": "string - search query (reuse user's exact wording)",
    "target_directories": "array - glob patterns for directories",
    "max_results": "integer - maximum results to return (default 10)",
    "min_relevance": "float - minimum relevance score (default 0.7)",
    "include_context": "boolean - include surrounding code context"
  }
}
```

### 2. Enhanced File Operations
Based on Cursor's context-aware file reading with sufficiency checks.

```json
{
  "tool": "enhanced_read_file",
  "explanation": "Read file with context sufficiency verification and range optimization",
  "expected": "Return file contents with context completeness assessment",
  "risk": "low",
  "taskNameActive": "Reading file...",
  "taskNameComplete": "File read completed",
  "parameters": {
    "target_file": "string - file path to read",
    "start_line_one_indexed": "integer - start line (optional)",
    "end_line_one_indexed_inclusive": "integer - end line (optional)",
    "should_read_entire_file": "boolean - read entire file (default false)",
    "verify_context": "boolean - check context sufficiency (default true)",
    "max_lines": "integer - maximum lines to read (default 250)"
  }
}
```

### 3. Enhanced Web Fetching
Based on v0's FetchFromWeb with metadata extraction.

```json
{
  "tool": "enhanced_web_fetch",
  "explanation": "Fetch web content with metadata extraction and task naming",
  "expected": "Return clean content with metadata and task completion status",
  "risk": "medium",
  "taskNameActive": "Fetching web content...",
  "taskNameComplete": "Web content fetched",
  "parameters": {
    "urls": "array - URLs to fetch content from",
    "taskNameActive": "string - 2-5 word task name while running",
    "taskNameComplete": "string - 2-5 word task name when complete",
    "extract_metadata": "boolean - extract title, author, date (default true)",
    "clean_content": "boolean - remove HTML/markdown formatting (default true)",
    "timeout": "integer - request timeout in seconds (default 30)"
  }
}
```

### 4. Enhanced Repository Search
Based on v0's GrepRepo with regex patterns and glob filtering.

```json
{
  "tool": "enhanced_repo_search",
  "explanation": "Search repository with regex patterns and intelligent filtering",
  "expected": "Return matching lines with file paths and relevance ranking",
  "risk": "low",
  "taskNameActive": "Searching repository...",
  "taskNameComplete": "Repository search completed",
  "parameters": {
    "pattern": "string - regex pattern to search for",
    "path": "string - directory to search within (optional)",
    "globPattern": "string - glob pattern for file filtering (optional)",
    "max_results": "integer - maximum results to return (default 200)",
    "context_lines": "integer - lines of context around matches (default 2)",
    "case_sensitive": "boolean - case sensitive matching (default false)"
  }
}
```

### 5. Enhanced Semantic Search
Combines patterns from multiple tools for intelligent content discovery.

```json
{
  "tool": "enhanced_semantic_search",
  "explanation": "Perform semantic search across multiple content types with ranking",
  "expected": "Return ranked results with relevance scores and source attribution",
  "risk": "low",
  "taskNameActive": "Performing semantic search...",
  "taskNameComplete": "Semantic search completed",
  "parameters": {
    "query": "string - semantic search query",
    "search_scope": "enum - codebase, web, repository, all",
    "target_directories": "array - directories to prioritize",
    "max_results": "integer - maximum results per source (default 5)",
    "min_relevance": "float - minimum relevance threshold (default 0.6)",
    "include_sources": "boolean - include source attribution (default true)"
  }
}
```

## Implementation as OpenClaw Utilities

### 1. Tool Wrapper Framework
```python
class EnhancedToolWrapper:
    """Wraps existing tools with governance and enhancement patterns"""
    
    def wrap_tool(self, tool_name, tool_func):
        """Add explanation, task naming, and validation to any tool"""
        def enhanced_wrapper(params):
            # Validate parameters
            self.validate_params(tool_name, params)
            
            # Add governance fields
            params = self.add_governance_fields(params)
            
            # Execute with task naming
            return self.execute_with_naming(tool_func, params)
        
        return enhanced_wrapper
```

### 2. Context Sufficiency Checker
```python
class ContextSufficiencyChecker:
    """Ensures sufficient context before file operations"""
    
    def check_sufficiency(self, file_path, operation):
        """Verify context is sufficient for operation"""
        # Check file exists and is readable
        # Assess content size and complexity
        # Verify anchor text for edits
        # Recommend context expansion if needed
```

### 3. Metadata Extractor
```python
class MetadataExtractor:
    """Extracts and standardizes metadata from various sources"""
    
    def extract_web_metadata(self, content, url):
        """Extract title, author, date from web content"""
        
    def extract_code_metadata(self, code_snippet, file_path):
        """Extract function signatures, imports, dependencies"""
        
    def extract_repo_metadata(self, search_results):
        """Extract file types, modification dates, authors"""
```

## Integration with OpenClaw Framework

### Skill Registration
```bash
# Register enhanced tools skill
openclaw skills register enhanced-tools

# Enable for specific agents
openclaw agents set research --tools enhanced_codebase_search,enhanced_web_fetch
openclaw agents set eng --tools enhanced_repo_search,enhanced_file_operations
```

### Configuration
```yaml
enhanced_tools:
  codebase_search:
    max_results: 10
    min_relevance: 0.7
    context_lines: 3
  
  file_operations:
    max_lines: 250
    verify_context: true
    auto_expand: true
  
  web_fetch:
    timeout: 30
    clean_content: true
    extract_metadata: true
  
  repo_search:
    max_results: 200
    context_lines: 2
    case_sensitive: false
```

### Agent Integration
```python
# Enhanced agent prompt template
ENHANCED_AGENT_PROMPT = """
You have access to enhanced tools with governance capabilities.

Before using any tool:
1. Provide clear explanation of why the tool is needed
2. Define what success looks like
3. Assess risk level (low/medium/high)
4. Use task naming for better UX

After tool execution:
1. Verify results match expectations
2. Provide structured output with Answer/Evidence/Action/Risks
3. Log any issues or unexpected results
"""
```

## Benefits

### Immediate Benefits
- Better search results with semantic understanding
- Reduced file operation errors through context checks
- Enhanced web content with metadata
- Improved repository search capabilities
- Consistent tool governance across all operations

### Agent Experience Improvements
- Clear task naming during execution
- Better error handling and recovery
- Structured output for easier consumption
- Comprehensive audit trails

### User Experience Improvements
- Real-time task progress feedback
- Better search result relevance
- Rich metadata for content
- Consistent response formatting

## Examples

### Enhanced Codebase Search
```bash
# Before: Basic search
openclaw search "user authentication"

# After: Enhanced search with targeting
openclaw enhanced_codebase_search \
  --query "user authentication" \
  --target_directories "src/auth/**" \
  --max_results 5 \
  --min_relevance 0.8
```

### Enhanced File Operations
```bash
# Before: Risky edit without context
openclaw edit file.py line 10 "new code"

# After: Context-aware operation
openclaw enhanced_read_file \
  --target_file file.py \
  --start_line 5 \
  --end_line 15 \
  --verify_context true
```

## Monitoring and Metrics

### Tool Performance Metrics
- Search relevance scores
- Context sufficiency success rates
- Web fetch success rates
- Repository search accuracy

### User Experience Metrics
- Task naming clarity
- Error recovery success
- Output format consistency
- Overall task completion rates

## Installation

1. Install enhanced tools skill:
```bash
openclaw skills install enhanced-tools
```

2. Configure tool parameters:
```bash
openclaw config set enhanced_tools.codebase_search.max_results 10
```

3. Enable for agents:
```bash
openclaw agents set research --enhanced-tools true
```

4. Test enhanced capabilities:
```bash
openclaw test enhanced-tools --suite full
```

## Future Enhancements

### Planned Improvements
- Machine learning for relevance scoring
- Cross-tool context sharing
- Advanced metadata extraction
- Real-time collaboration features

### Integration Opportunities
- External search APIs (Elasticsearch, Algolia)
- Code analysis platforms (SonarQube, CodeClimate)
- Documentation systems (Confluence, Notion)
- Project management tools (Jira, Asana)
