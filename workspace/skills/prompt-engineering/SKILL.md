# Prompt Engineering Skill

## Purpose
Automatically enhance and optimize every user query before it reaches the agent pipeline. Converts raw, informal, or ambiguous user input into well-structured, context-rich prompts that maximize LLM output quality.

## When It Runs
- **Trigger:** Every incoming user message (Telegram, CLI, web)
- **Position:** BEFORE HATAKE parser, BEFORE smart router
- **Pipeline:** User Input → **Prompt Engineering** → HATAKE Parser → Smart Router → Agent

## Processing Steps

### Step 1: Input Classification
Classify the raw input:
| Type | Example | Action |
|------|---------|--------|
| Question | "What's QQQ at?" | Add context framing, specify format |
| Command | "Build a dashboard" | Add requirements structure |
| Vague | "Fix it" | Request clarification or infer from context |
| Multi-part | "Research X then build Y" | Split into ordered sub-tasks |
| Follow-up | "Now do the same for Z" | Resolve references from conversation history |

### Step 2: Prompt Enhancement
Apply these transformations:

1. **Clarity Injection** — Remove ambiguity, expand abbreviations
   - "QQQ" → "QQQ (Invesco NASDAQ-100 ETF)"
   - "ASAP" → "with highest priority"

2. **Context Addition** — Add relevant context from:
   - Current conversation history
   - Agent memory (recent topics)
   - Time context (market hours, timezone)
   - Project context (active workspace, recent files)

3. **Format Specification** — Tell the LLM what output format to use:
   - Data queries → "Return as structured data with source citations"
   - Code tasks → "Provide complete, runnable code with error handling"
   - Research → "Summarize with bullet points, include sources"
   - Analysis → "Provide pros/cons, quantitative data where available"

4. **Constraint Injection** — Add guardrails:
   - Token budget awareness (don't request 10K tokens for a simple lookup)
   - Tool hints ("use web search for current data", "use file read for local data")
   - Response length guidance

### Step 3: Quality Checks
Before passing to HATAKE:
- [ ] Is the intent unambiguous?
- [ ] Are all references resolved?
- [ ] Is the expected output format specified?
- [ ] Are constraints reasonable?

## Examples

### Example 1: Simple Question
**Raw:** "whats qqq at"
**Enhanced:** "What is the current price of QQQ (Invesco NASDAQ-100 ETF)? Return the current price, today's change ($ and %), and the 52-week range. Use real-time market data."

### Example 2: Vague Command
**Raw:** "fix the bug"
**Enhanced:** "Investigate and fix the most recent bug reported in the system. Check TICKET-TRACKER.md for open tickets, review recent error logs, identify the root cause, and implement a fix. Document the fix in LEARNINGS.md."

### Example 3: Research Task
**Raw:** "compare claude and gpt"
**Enhanced:** "Compare Claude (Anthropic) and GPT (OpenAI) models across these dimensions: (1) coding ability, (2) reasoning, (3) context window, (4) pricing, (5) API features. Use current 2026 data. Present as a comparison table with a recommendation for our use case (multi-agent orchestration system)."

### Example 4: Multi-Part Task
**Raw:** "research competitors then build a comparison page"
**Enhanced:** Split into:
- Task 1 (RESEARCH): "Research our top 5 competitors. For each, gather: product name, pricing, key features, market position, recent funding. Use web search for current data."
- Task 2 (ENG): "Build a comparison dashboard page showing competitor data. Use React + TailwindCSS. Include sortable table, feature matrix, and pricing comparison chart."

## Rules
1. NEVER change the user's intent — only enhance clarity and structure
2. NEVER add requirements the user didn't ask for
3. ALWAYS preserve technical terms, names, and specific values exactly
4. Keep enhancements proportional — don't turn a simple question into an essay prompt
5. For follow-up messages, resolve "it", "that", "the same" from conversation context
6. If truly ambiguous and no context available, ask for clarification rather than guess
