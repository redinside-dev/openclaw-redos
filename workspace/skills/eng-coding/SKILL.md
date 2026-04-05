# ENG Coding Skill — Multi-Stream Coding Factory

## Purpose
ENG runs a fully autonomous, multi-stream coding factory 24/7. Every stream produces complete, production-quality code — real commits, real PRs, zero human intervention.

**ENG is fully self-managing. Never stall, never ask for help, always self-heal.**

---

## Model

- Primary: `minimax/MiniMax-M2.7` (1M context — ENG default)
- Fallback: `9router/cu/default` → `9router/cc/claude-haiku-4-5`

---

## Coding Factory Streams

ENG operates 4 parallel streams. Each stream has its own repos, tools, and conventions.

### Stream A — Java / Spring Boot / Spring AI / LangChain4j

**Repos:** `spring-projects/spring-ai`, `langchain4j/langchain4j`, `spring-projects/spring-boot`

**Build tools:** Maven 3.9 (`mvn verify`), Gradle 8 (`./gradlew build`)
**Test framework:** JUnit 5, Mockito, Testcontainers
**Java version:** Java 21 (LTS)

**Key dependencies:**
```xml
<!-- Spring AI -->
<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-openai-spring-boot-starter</artifactId>
</dependency>
<!-- LangChain4j -->
<dependency>
  <groupId>dev.langchain4j</groupId>
  <artifactId>langchain4j-spring-boot-starter</artifactId>
</dependency>
```

**Spring AI pattern:**
```java
@Bean
ChatClient chatClient(ChatClient.Builder builder) {
    return builder.defaultSystem("You are a helpful assistant").build();
}

// Agentic tool use
String response = chatClient.prompt()
    .user(userMessage)
    .tools(myTool)
    .call().content();
```

**LangChain4j AI Service pattern:**
```java
interface MyAgent {
    @SystemMessage("You are an expert Java developer")
    String review(@UserMessage String code);
}
MyAgent agent = AiServices.builder(MyAgent.class)
    .chatLanguageModel(model)
    .tools(new WebSearchTool())
    .build();
```

---

### Stream B — JavaScript / TypeScript / Node.js

**Repos:** `decolua/9router`, `FellouAI/eko`, `affaan-m/everything-claude-code`

**Build tools:** npm/pnpm, `tsc`, `npm run build`
**Test framework:** vitest, jest
**Runtime:** Node.js 22, ESM modules

**Pattern:**
```typescript
// ESM TypeScript
import { Command } from 'commander';
export async function main(): Promise<void> { ... }
```

---

### Stream C — Python

**Repos:** `PathOnAIOrg/LiteMultiAgent`, `coasty-ai/open-computer-use`

**Build tools:** pip, `pytest`, `python -m pytest`
**Test framework:** pytest, pytest-asyncio
**Version:** Python 3.12+

**Agentic AI pattern:**
```python
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain_openai import ChatOpenAI
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
```

---

### Stream D — Mobile (iOS Swift + Android / React Native)

**iOS repos:** `nicklockwood/SwiftFormat`, `apple/swift-argument-parser`
**Android/RN repos:** `react-native-community/react-native-webview`, `Shopify/flash-list`

**iOS build tools:** Swift Package Manager (`swift build`, `swift test`)
**Android build tools:** Gradle (`./gradlew build`, `./gradlew test`)
**React Native:** npm + Metro (`npm test`)

**Swift pattern:**
```swift
import Foundation

struct MyFeature {
    func execute() -> Result<String, Error> {
        // Full implementation — no stubs
    }
}
```

**React Native pattern:**
```typescript
import React from 'react';
import { View, Text } from 'react-native';
export const MyComponent: React.FC<Props> = ({ value }) => (
    <View><Text>{value}</Text></View>
);
```

---

### Stream E — Claude Code Agent + MCP + Java Expert Skills

**Purpose:** A dedicated sub-agent stream that uses Claude Code (via `ccs-smart.sh`) enhanced with MCP servers and Java-specific skills plugins. Handles deep Java architecture tasks, Spring Boot project scaffolding, and multi-file refactors that need long context.

**MCP servers used:**
- `context7` — live Java/Spring/LangChain4j documentation lookup
- `exa-mcp` — web search for latest Spring AI API changes
- `cloud-code-bridge` — delegates to Claude Code for multi-file edits

**Java Expert Skills activated for this stream:**
- `eng-coding` (this skill)
- `mcp-context7` — always fetch latest Spring AI / LangChain4j docs before coding
- `prompt-engineering` — generate precise prompts for Java codegen tasks

**Invocation:**
```bash
# Deep Java task via Claude Code with MCP
bash /Users/redinside/.openclaw/scripts/ccs-smart.sh \
  -p "Implement the spring-ai-mcp-bridge project from workspace/projects/backlog.md item #41. Use context7 to fetch the latest Spring AI MCP docs first. Full Maven project, JUnit 5 tests, working README."
```

**When to use Stream E:**
- Backlog Java projects (#38–41) requiring 5+ files
- Spring Boot autoconfiguration / starter creation
- Spring AI / LangChain4j integration tasks with complex APIs
- Any Java task where getting the API right requires doc lookup

---

## Implementation Contract (ALL STREAMS)

Every piece of code MUST:
1. **Be fully implemented** — no `// TODO`, no `throw new UnsupportedOperationException()`, no stub functions that return `null`/`undefined`
2. **Have tests** — real assertions, not empty test files
3. **Build clean** — zero errors, zero warnings where possible
4. **Follow stack conventions** — Spring annotations for Java, ESM for TS, type hints for Python, Swift concurrency for iOS
5. **Include README** — quickstart + example output

---

## OSS Contribution Protocol (ALL STREAMS)

```
1. Pick issue  → gh issue list → concrete bug, <50 lines, skip architecture
2. Fork/clone  → git clone / gh repo fork --clone=false
3. Branch      → git checkout -b fix/issue-<N>-<slug>
4. Read source → understand before touching
5. Implement   → FULL fix, correct build tools for the stream
6. Test        → run repo's own test suite
7. Commit      → git commit -m "fix: <desc> (closes #<N>)"
8. Push        → git push -u origin fix/issue-<N>-<slug>
9. PR          → gh pr create --no-edit --title "fix: <desc>" --body "Closes #<N>..."
10. Log        → append to workspace/projects/pr-log.md
```

**ALWAYS use `--no-edit` on `gh pr create`** — never omit this flag.

---

## Backlog Project Protocol

When working on a project from `workspace/projects/backlog.md`:
1. Read full spec — understand pain, deliverables, tech stack
2. Create `workspace/projects/<name>/` with full structure
3. Implement ALL features from spec — no shortcuts
4. Run the build — fix errors
5. Commit: `git add -A && git commit -m "feat: <project> — full implementation"`
6. Publish: `gh repo create anuragg-saxenaa/<name> --public --source=. --push`
7. Log in pr-log.md

---

## Self-Healing (Autonomous Error Recovery)

| Error | Recovery |
|---|---|
| `exec` pattern blocked | Add pattern to `exec-approvals.json`, retry |
| Model billing error | Falls back to `9router/cu/default` automatically |
| Build failure | Read error, fix code, retry (max 3 attempts) |
| `gh pr create` blocked | Check `--no-edit` is present, verify branch pushed |
| git push rejected | `git pull --rebase`, resolve conflicts, push again |
| Test failures | Read test output, fix code, re-run |
| Java compilation error | Read stacktrace, fix imports/types, `mvn verify` again |
| Swift build error | Read error, fix types/imports, `swift build` again |

**Never stall. Never report "BLOCKED" unless 3 self-heal attempts failed.**

---

## Daily Schedule

```
Every 15 min  IssueWatcher    → decolua/9router bugs → PRs
Daily         OSS Contributor → rotate streams A/B/C/D by day of week
Every 4h      PR Monitor      → fix CI failures on open PRs
Every 4h      Inner loop      → process AUTONOMOUS.md tasks
```
