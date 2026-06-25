## 71 | quarkus-langchain4j MongoDB document store ⭐ READY
**Stack:** Java/Quarkus
**Repo:** ⚠️ **BACKLOG BUG — actual repo is `quarkiverse/quarkus-langchain4j` (NOT `quarkiverse/quarkus-langchain4j` — that org has no such repo, 404 confirmed 2026-06-23 via web_fetch)**
**Stars:** 304
**Pain source:** Missing integration with MongoDB as a document store option in the persistence layer
**What to do:** Implement MongoDB document store support for standard document storage interface compatibility with Redis/Chroma/Add in-memory document store implementation for development/Integrate with EasyRAG for hybrid search capabilities
**What to do:** Enhance Developer DX - Add native compilation support and create detailed documentation for local development workflows
**Stream:** A
**Status (2026-06-23 cycle 169):** NEEDS RE-VALIDATION — spec was written against wrong org. The actual repo is `quarkiverse/quarkus-langchain4j`. Need to re-research MongoDB integration in the real repo before scoping a PR. Low priority until research refreshed.

## 72 | spring-ai OpenAI streaming ChunkMerger NPE ⭐ READY
**Stack:** Java/Spring AI
**Repo:** spring-projects/spring-ai
**Stars:** 8,970
**Pain source:** https://github.com/spring-projects/spring-ai/issues/6441 — Issue opened 2026-06-17T02:14Z by user `1233567890`. `OpenAiChatModel$ChunkMerger.lambda$mergeDeltas$4` at line 1065 throws `java.lang.IndexOutOfBoundsException: Index 0 out of bounds for length 0` during OpenAI streaming aggregation. The error is logged by `MessageAggregator` then dropped silently via `Operator called default onErrorDropped` — meaning the user's stream appears to hang or return nothing on affected providers (DeepSeek via OpenAI-compat, Gemini via OpenAI-compat, GitHub Copilot, Ollama/OpenAI-compat, etc.). Stack trace pinpoints the bug to the `mergeDeltas` reducer when a chunk's `toolCalls` collection arrives empty but downstream code still attempts to access `get(0)`. This is the same family of bugs as #5987 (collectList blocking streaming), #5806 (streaming tool-call merging — already on our backlog), and the now-merged #97925c6 (`bbungjin` — Prevent infinite tool-call loops with null/empty arguments) — but #6441 is the empty-array indexing case those PRs did not catch. Affects EVERY Spring AI 2.0.0 user calling OpenAI streaming against OpenAI-compatible providers; waiting-for-triage, no PR yet.

**What to do:** Fix issue #6441: harden `OpenAiChatModel$ChunkMerger.mergeDeltas` to:
1. Skip empty `toolCalls` chunks (delta with `toolCalls` present but empty list) without trying to access index 0
2. Route the skip through `MessageAggregator` as a soft-warning (`logger.debug(...)`) instead of throwing, so `onErrorDropped` never fires for known-benign empty chunks
3. Add a unit test `OpenAiChatModelTests#mergeDeltas_emptyToolCallsChunk_doesNotThrow` that asserts the new behavior using a synthetic `ChatCompletionChunk` whose `choices[0].delta.toolCalls` is `[]`
4. Add a regression test for the mixed case: `[empty, real, empty]` chunk sequence produces a single merged `AssistantMessage` with one `ToolCall`, not an NPE
5. Cross-reference #5987, #5806, #6441 in the test javadoc so the next maintainer sees the full streaming-merging bug surface

**Acceptance tests:**
- `mvn -pl models/spring-ai-openai test -Dtest='OpenAiChatModelTests#mergeDeltas_emptyToolCallsChunk_doesNotThrow'` passes
- No `IndexOutOfBoundsException` in logs during mixed `[empty, real, empty]` regression test
- Backward compatible: existing `OpenAiChatModelTests` pass without modification

**Branch:** `fix/issue-6441-openai-streaming-empty-toolcalls-merge`
**Stream:** A

## 73 | spring-ai ToolExecutionListener callback API after streamToolCallResponses removal ⭐ READY
**Stack:** Java/Spring AI
**Repo:** spring-projects/spring-ai
**Stars:** 8,970
**Pain source:** https://github.com/spring-projects/spring-ai/issues/6435 — Issue opened 2026-06-16T14:20:08Z by user `TonyJeans`. In Spring AI 2.0 GA, there is **no lightweight way to observe individual tool executions** from the application layer during streaming chat. RC1 had `streamToolCallResponses(true)` on `ToolCallingAdvisor`, which allowed tool-call frames to pass through the downstream `Flux`. GA **removed this option entirely** (per upgrade notes) and hard-coded a filter in `ToolCallingAdvisor.streamWithToolCallResponses()`. The removal was correct — tool-call frames in the main Flux could corrupt conversation history when `MessageChatMemoryAdvisor` recorded unpaired tool-call messages (the bug tracked in #6340 / #5167). However, **no alternative was provided** for users who need to observe tool calls in real time (e.g. sending `tool_call` / `tool_result` SSE events to a chat UI). The only workaround today is to replace the entire `ToolCallingManager`, which is heavyweight and brittle. This blocks every Spring AI 2.0.0 user shipping a tool-using agent UI. The issue author has already spec'd the exact interface they want (`ToolExecutionListener` with `onToolExecutionStart`/`onToolExecutionSuccess`/`onToolExecutionError`), so the design surface is pre-validated. No PR exists yet, waiting-for-triage label, ~3 days old.

**What to do:** Implement issue #6435: add a lightweight `ToolExecutionListener` SPI that fires around each tool execution in both the streaming and non-streaming paths, then wire it into `DefaultToolCallingManager` (and optionally auto-register via Spring beans for `ChatClient`):

1. **Add the new interface** `org.springframework.ai.model.tool.ToolExecutionListener` in `spring-ai-model` with three default methods (matching the issue author's proposal):
   - `onToolExecutionStart(String toolCallId, String toolName, String toolArguments)`
   - `onToolExecutionSuccess(String toolCallId, String toolName, @Nullable String toolResult)`
   - `onToolExecutionError(String toolCallId, String toolName, Throwable error)`
2. **Composite helper**: add `ToolExecutionListener.composite(List<ToolExecutionListener>)` (or similar) that fans an event out to N listeners and swallows per-listener exceptions with `logger.warn("Listener {} threw, continuing", e)` so one bad listener can't kill the loop.
3. **Wire into `DefaultToolCallingManager`** (the `call(...)` path): before invoking the `ToolCallback`, fire `onToolExecutionStart`; after success, `onToolExecutionSuccess`; on exception, `onToolExecutionError` with the throwable wrapped as `ToolExecutionException` so the existing `ToolExecutionExceptionProcessor` flow still runs. Listener invocation must be wrapped in try/catch so listeners can never break tool execution itself.
4. **Wire into the streaming path** (the key motivator for #6435): wrap each `ToolCallback.call()` invocation inside the `ToolCallingManager.executeToolCalls(...)` method (used by `ToolCallAdvisor`) with the same three callbacks. Verify with a synthetic `Flux<ChatResponse>` that contains a tool call that the listener fires once per tool execution per turn.
5. **Builder wiring**: add `DefaultToolCallingManager.Builder.toolExecutionListeners(List<ToolExecutionListener>)` and `Builder.toolExecutionListener(ToolExecutionListener)` (singular for fluency). Preserve backward compat — `null` or empty list works as today.
6. **Spring auto-discovery**: in `ToolCallingAutoConfiguration` (or wherever `DefaultToolCallingManager` is wired), inject `ObjectProvider<List<ToolExecutionListener>>` so any `@Component` implementing `ToolExecutionListener` is auto-registered. No `@ConditionalOnMissingBean` gymnastics — additive only.
7. **Tests** in `spring-ai-model/src/test/java/org/springframework/ai/model/tool/`:
   - `ToolExecutionListenerTests#firesForSuccessfulToolCall` — register a recording listener, invoke a tool via `DefaultToolCallingManager.call(...)`, assert `start`+`success` fires with correct `toolCallId`/`toolName`/`toolResult`
   - `ToolExecutionListenerTests#firesForFailedToolCall` — throw inside a `ToolCallback`, assert `start`+`error` fires with the exception (assert `ToolExecutionException` propagation still works)
   - `ToolExecutionListenerTests#compositeListener_invokesAll` — register two listeners + one that throws, assert the other two still fire and the thrower's exception is swallowed with `logger.warn`
   - `ToolExecutionListenerTests#streamingPathFiresOncePerExecution` — drive `ToolCallAdvisor` with a `Flux<ChatResponse>` containing a tool call, assert listener fires exactly once
   - `ToolExecutionListenerTests#autoDiscoveryViaSpringContext` — minimal `@SpringBootTest` with a `@Component` listener, assert it's picked up by `DefaultToolCallingManager.builder().build()` after auto-config runs
8. **Documentation**: add a section to `spring-ai-docs/src/main/antora/modules/ROOT/pages/api/tools.adoc` titled "Observing Tool Execution" with a 20-line example showing a listener that emits `tool_call` / `tool_result` SSE events. Cross-reference #6435 and #6340 in the prose.
9. **CHANGELOG** entry under "Improvements" referencing #6435.

**Acceptance tests:**
- `mvn -pl spring-ai-model test -Dtest='ToolExecutionListenerTests'` passes with all 5 new tests green
- `mvn -pl spring-ai-spring-boot-autoconfigure test -Dtest='*ToolCallingAutoConfigurationTests'` passes
- Existing `DefaultToolCallingManagerTest` and `ToolCallingAdvisorTests` pass without modification (additive API only)
- Manual smoke: a sample listener that prints to stdout shows up exactly once per tool execution when running `spring-ai-chat-client-examples/chat-memory`

**Branch:** `feature/issue-6435-tool-execution-listener`
**Stream:** A

## 74 | spring-ai MilvusVectorStore metadata field name ignored in filter expressions ⭐ READY
**Stack:** Java/Spring AI
**Repo:** spring-projects/spring-ai
**Stars:** 8,970
**Pain source:** https://github.com/spring-projects/spring-ai/issues/6469 — Issue opened 2026-06-19T17:46:45Z by contributor `ultramancode`. `MilvusVectorStore` exposes a `metadataFieldName(...)` builder + `spring.ai.vectorstore.milvus.metadata-field-name` property so callers can use a non-default Milvus metadata field (e.g. `meta`). But the filter expression generator in `MilvusVectorStore.doSimilaritySearch(SearchRequest)` (or wherever the `Filter.ExpressionConverter` for Milvus lives) hard-codes the field name `metadata[...]` instead of reading `this.metadataFieldName` / the configured property. Real-world impact: any Spring AI 2.0.0 user with a Milvus collection whose metadata field is `meta` (or anything else non-default) gets `failed to create query plan: cannot parse expression: metadata["age"] > 30, error: field metadata not exist: invalid parameter` from Milvus on EVERY filtered similarity search. The 3 existing comments confirm this is reproducible end-to-end against a real Milvus container, not a unit-test artifact. No PR open, status `waiting-for-triage`, ~1 day old.

**What to do:** Fix issue #6469: thread `metadataFieldName` from `MilvusVectorStore` config through to the Milvus filter expression builder so the configured name is used in generated `SearchParam` expressions.

1. **Locate the filter generator**: in `spring-ai-vector-store/src/main/java/org/springframework/ai/vectorstore/milvus/MilvusVectorStore.java`, find the path that converts `SearchRequest.filterExpression()` to the Milvus `Filter` / `SearchParam.searchQuery()` expression. Likely `MilvusFilterExpressionConverter` or inline logic in `doSimilaritySearch(...)`.
2. **Read the configured field name**: the `MilvusVectorStore` already exposes `getMetadataFieldName()` (or a private field — promote to package-private getter if private) and stores it from `metadataFieldName(...)` builder + `spring.ai.vectorstore.milvus.metadata-field-name` property.
3. **Substitute in the generated expression**: change the converter so that for a filter like `age > 30`, it emits `metadata["age"] > 30` (current bug) → `<configuredName>["age"] > 30` (expected). Handle the nested JSON key access pattern used by Milvus: `<fieldName>["<key>"]`.
4. **Default behavior preserved**: when `metadataFieldName` is unset / `null` (default), the generator must continue to emit `metadata["age"]` so existing users are unaffected.
5. **Tests** in `spring-ai-vector-store/src/test/java/org/springframework/ai/vectorstore/milvus/`:
   - `MilvusFilterExpressionConverterTests#customMetadataFieldName_isUsed` — set field name `meta`, build `age > 30`, assert output equals `meta["age"] > 30`
   - `MilvusFilterExpressionConverterTests#defaultMetadataFieldName_stillMetadata` — no setter, build `age > 30`, assert output equals `metadata["age"] > 30` (regression)
   - `MilvusFilterExpressionConverterTests#nestedExpressionWithCustomField` — `country == 'US' AND age > 30`, field name `meta`, assert output uses `meta["country"] == 'US' AND meta["age"] > 30`
   - `MilvusVectorStoreBuilderTests#metadataFieldName_propagatedFromProperty` — `spring.ai.vectorstore.milvus.metadata-field-name=meta` property → `MilvusVectorStore.getMetadataFieldName() == "meta"`
6. **Documentation**: add a 5-line paragraph to `spring-ai-docs/src/main/antora/modules/ROOT/pages/api/vectordbs/milvus.adoc` under the "Configuration" section noting the `metadata-field-name` property and that it controls BOTH schema field name AND filter expressions (no separate knob). Cross-reference #6469 in the prose.
7. **CHANGELOG** entry under "Bug Fixes" referencing #6469.

**Acceptance tests:**
- `mvn -pl spring-ai-vector-store test -Dtest='MilvusFilterExpressionConverterTests,MilvusVectorStoreBuilderTests'` passes with all new tests green
- Existing `MilvusVectorStoreTests` pass without modification (regression)
- Manual smoke: spin up a Milvus container, configure `metadata-field-name=meta`, run a filtered similarity search with `age > 30`, confirm no `field metadata not exist` error in logs

**Branch:** `fix/issue-6469-milvus-metadata-field-name-in-filter`
**Stream:** A

## 75 | langchain4j McpClientAgentInvoker silently nulls required typed MCP inputs ⭐ READY
**Stack:** Java/langchain4j
**Repo:** langchain4j/langchain4j
**Stars:** 8,200
**Pain source:** https://github.com/langchain4j/langchain4j/issues/5476 — Issue opened 2026-06-17T23:38:06Z by contributor `thswlsqls`. In `langchain4j-agentic-mcp`, the typed MCP agent path (`McpAgent.builder(client, SomeAgent.class)`) when invoked inside a workflow silently passes `null` for a missing required input into the MCP tool call. Every sibling invoker — `UntypedAgentInvoker.toInvocationArguments()` and `AgentUtil.agentInvocationArguments()` — throws `MissingArgumentException` instead. Root cause: `McpClientAgentInvoker.agentInvocationArguments(AgenticScope)` reads each input via `agenticScope.readState(argName)` and forwards the value to the tool call WITHOUT a null check. The override declares `throws MissingArgumentException` (per `AgentInvoker.toInvocationArguments(AgenticScope)` contract), but the MCP implementation never honors the contract. Real-world impact: a missing required input produces a `language=null` (or similar) MCP tool call instead of failing fast at the workflow boundary. The tool can then either NPE deep inside the server-side handler or — worse — silently execute against the wrong input, returning a wrong answer that downstream agents consume. No PR open, `bug` + `MCP` + `Agentic` labels, 1 comment, ~3 days old.

**What to do:** Fix issue #5476: make `McpClientAgentInvoker.agentInvocationArguments(AgenticScope)` honor the `MissingArgumentException` contract that every other invoker already implements.

1. **Locate the invoker**: in `langchain4j-agentic-mcp/src/main/java/dev/langchain4j/agentic/mcp/McpClientAgentInvoker.java`, find `agentInvocationArguments(AgenticScope)` (it overrides `AgentInvoker.toInvocationArguments(AgenticScope)` and inherits its `throws MissingArgumentException` declaration).
2. **Add the null check**: after each `agenticScope.readState(argName)`, if the value is `null` AND the corresponding `AgentParameter` is marked required (i.e. `@P(required=true)` or the equivalent metadata the typed path exposes), throw `new MissingArgumentException("Missing required input '" + argName + "' for agent '" + agentType.getName() + "'")`. Mirror the exact error message format used by `UntypedAgentInvoker.toInvocationArguments()` so callers can match on the message string.
3. **Preserve the untyped-path exception**: the issue notes "Scope is the typed path only. The untyped path derives input keys from the full JSON-Schema `properties()`, which includes optional MCP params, so it must not be changed here." — make sure the fix is scoped to the TYPED path only. Do not touch `UntypedAgentInvoker` or `AgentUtil.agentInvocationArguments()`.
4. **Required-vs-optional detection**: the typed path knows which inputs are required from the agent interface signature (`SomeAgent.language()` is required because `language` has no default and is not marked `@V("defaultValue")`). Reuse the same detection logic that `AgentInvoker.toInvocationArguments()` (parent) uses for the typed path — do not duplicate the introspection.
5. **Tests** in `langchain4j-agentic-mcp/src/test/java/dev/langchain4j/agentic/mcp/`:
   - `McpClientAgentInvokerTests#missingRequiredInput_throwsMissingArgumentException` — build a typed MCP agent with required `language` input, invoke workflow without `language` in scope, assert `MissingArgumentException` thrown with message containing `"language"`
   - `McpClientAgentInvokerTests#providedInput_doesNotThrow` — same setup but with `language` in scope, assert no exception and the tool is called with correct `language` value
   - `McpClientAgentInvokerTests#optionalInputMissing_doesNotThrow` — typed MCP agent with `language` defaulted via `@V("en")`, omit from scope, assert no exception (regression for default-value handling)
   - `McpClientAgentInvokerTests#untypedPathUnaffected` — untyped MCP agent with same missing-input scenario, assert behavior unchanged from current (silent null pass) — REGRESSION TEST so we don't accidentally change the untyped path
6. **Documentation**: add a 10-line section to `langchain4j-agentic-mcp/README.md` (or the docs module if no README) titled "Required Input Validation in Typed MCP Agents" with a 5-line code example showing both success and failure paths. Cross-reference #5476 in the prose.
7. **CHANGELOG** entry under "Bug Fixes" referencing #5476.

**Acceptance tests:**
- `mvn -pl langchain4j-agentic-mcp test -Dtest='McpClientAgentInvokerTests'` passes with all new tests green
- Existing `AgenticServicesSequenceIT` and `AgenticWorkflowIT` pass without modification (the typed MCP path now throws, but valid inputs are unaffected)
- Manual smoke: `DebateExampleIT` (which uses typed agents in a sequence) runs to completion when all inputs are provided; throws `MissingArgumentException` with helpful message when any required input is omitted

**Branch:** `fix/issue-5476-mcp-client-agent-invoker-required-input-check`
**Stream:** A
**Status (2026-06-23 cycle 169):** ⚠️ **OBSOLETE — issue already resolved upstream by PR #5477 (authored by `thswlsqls`, the original issue reporter). PR merged 2026-06-22T07:09:14Z (1 day before this assessment). Upstream main branch `McpClientAgentInvoker.java` already throws `MissingArgumentException(argName)` inline on null. Opening a new PR from our fork would be rejected as duplicate. Local fork (`/Users/redinside/.openclaw/workspace-eng/langchain4j/langchain4j-agentic-mcp/src/main/java/dev/langchain4j/agentic/mcp/McpClientAgentInvoker.java`) has a STAGED DIFFERENT-FORM fix (delegates to `AgentUtil.agentInvocationArguments(agenticScope, AgentUtil.argumentsFromMethod(method))`) from a prior cycle, but the issue is solved — no need to ship it. Local staged changes should be reviewed for cleanup. Confirmed via web_fetch: upstream main already has the fix.