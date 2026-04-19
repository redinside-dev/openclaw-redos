## 6 | spring-projects/spring-ai ✅ PR OPEN — <https://github.com/anuragg-saxenaa/spring-ai-query-fix/pull/3>
**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 7900
**Pain source:** CompressionQueryTransformer incorrectly adds the current user query to both the history section AND the follow-up query section, making transformed queries nonsensical (Issue #5470) — <https://github.com/spring-projects/spring-ai/issues/5470>
**What to do:** ~~Fix CompressionQueryTransformer so it does not duplicate the current user query in the history section. Include the unit test from the issue (CompressionQueryTransformerTests.java). If history is empty, return the query as-is without transformation.~~ **DONE** — PR #3 in fork opened. Fix: early return when history is empty; unit test added.
**Stream:** A

## 8 | langchain4j/langchain4j ✅ DONE (community PR #4890 merged 2026-04-10)
**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 7700
**Pain source:** OpenAiStreamingResponseBuilder drops additional tool calls from same streaming delta, causing AiMessage/tool-execution mismatch (Issue #4889) — <https://github.com/langchain4j/langchain4j/issues/4889>
**What to do:** ~~Fix OpenAiStreamingResponseBuilder.append() to iterate all delta.toolCalls(), add regression test, open PR~~ **RESOLVED** — PR #4890 merged by community (Vasilije Jukic, commit `8d1d15d74`). Fix iterates all `delta.toolCalls()`, regression test added.
**Stream:** A

## 9 | langchain4j/langchain4j ✅ DONE (upstream PR #4783 merged)
**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 7700
**Pain source:** [BUG] `langchain4j-google-ai-gemini` serializes `tools` as JSON object instead of array, violating Gemini's documented API contract (Issue #4773) — <https://github.com/langchain4j/langchain4j/issues/4773>
**What to do:** ~~Fix the Gemini request serializer to wrap single tools in a JSON array.~~ **RESOLVED** — upstream PR #4783 merged. `GeminiGenerateContentRequest.tools` is `List<GeminiTool>`, serializer wraps in `singletonList()`, regression tests added in PR #4935. JSON output is correctly `"tools":[{...}]`.
**Stream:** A

## 10 | spring-projects/spring-ai ✅ DONE (duplicate of #6)
**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 7900
**Pain source:** Same as backlog #6 — CompressionQueryTransformer query duplication (Issue #5470) — <https://github.com/spring-projects/spring-ai/issues/5470>
**What to do:** ~~Duplicate of #6 — resolved when #6 was fixed.~~ **RESOLVED** — same fix covers both entries.
**Stream:** A

## 11 | spring-projects/spring-ai ✅ PR OPEN — <https://github.com/anuragg-saxenaa/spring-ai-query-fix/pull/4>
**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 7900
**Pain source:** GoogleGenAiChatModel fails to detect tool calls when a Gemini response mixes text/thought parts with functionCall parts — the allMatch check in responseCandidateToGeneration silently drops the tool call (Issue #5466) — <https://github.com/spring-projects/spring-ai/issues/5466>
**What to do:** ~~Fix the allMatch logic in responseCandidateToGeneration. Instead of requiring ALL parts to be functionCall, iterate parts and extract any functionCall found. Update GoogleGenAiChatModel to emit both text content and toolCalls in AssistantMessage.~~ **DONE** — PR #4 in fork opened. Added hasTextContent check, extract text alongside tool calls.
**Stream:** A

## 12 | spring-projects/spring-ai ✅ PR OPEN — <https://github.com/spring-projects/spring-ai/pull/5816>
**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 7900
**Pain source:** Spring AI has no native semantic text chunking — only TokenTextSplitter which breaks semantic boundaries at fixed token counts, degrading RAG retrieval quality. Users must reach for external tools (Docling) or write custom solutions. Feature request (Issue #5464) — <https://github.com/spring-projects/spring-ai/issues/5464>
**What to do:** ~~Implement SemanticTextSplitter extending the existing TextSplitter base class. Use EmbeddingModel to compute sentence embeddings, calculate cosine similarity between consecutive embeddings, and split where similarity drops below a configurable threshold. Parameters: similarityThreshold (default 0.5), maxChunkSize (default 1000). No new external dependencies — reuse Spring AI's own EmbeddingModel interface. Add unit tests covering: normal case, single sentence, empty list, threshold boundaries.~~ **DONE** — PR #5816 open. SemanticTextSplitter + 14 unit tests committed. Fork branch: anuragg-saxenaa:feature/semantic-text-splitter.
**Stream:** A

## 13 | langchain4j/langchain4j ✅ PR OPEN — <https://github.com/anuragg-saxenaa/anuragg-saxenaa-langchain4j/pull/1>
**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 7700
**Pain source:** [BUG] ChatCompletionRequest sends legacy flat `reasoning_effort` field; OpenAI updated API spec to nested `"reasoning": { "effort": "..." }` object — causes `invalid_request_error` for reasoning models like gpt-5.4-mini (Issue #4898) — <https://github.com/langchain4j/langchain4j/issues/4898>
**What to do:** ~~Update ChatCompletionRequest to serialize as nested object.~~ **DONE** — PR #1 in fork. `String reasoningEffort` → `Reasoning` nested class. `{"reasoning":{"effort":"low"}}` JSON output. `.reasoningEffort("low")` backward compat preserved. 3 unit tests passing.
**Stream:** A

## 14 | langchain4j/langchain4j ✅ RESOLVED — upstream PR #4583 merged 2026-02-14
**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 11,000
**Pain source:** [BUG] NPE in OpenAiStreamingResponseBuilder when Gemini streaming tool calls return null toolCall.index() — ConcurrentHashMap.computeIfAbsent crashes with NullPointerException (Issue #4573) — <https://github.com/langchain4j/langchain4j/issues/4573>
**What to do:** ~~Fix OpenAiStreamingResponseBuilder.append() to handle null toolCall.index(). When index is null (Gemini streaming responses), fall back to sequential 0-based index. Add null-safe logic, unit test with null index, open PR.~~ **RESOLVED** — upstream PR #4583 merged (mohankumar27). `fallbackToolCallIndex` AtomicInteger handles null index. Test class added.
**Stream:** A

## 15 | langchain4j/langchain4j ✅ DONE
**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 11,000
**Pain source:** [ENHANCEMENT] Annotations (@Tool, @P, @ToolMemoryId) are in langchain4j-core but should be in the main langchain4j module for cleaner architecture and consistency (Issue #4577) — <https://github.com/langchain4j/langchain4j/issues/4577>
**What to do:** Relocate @Tool, @P, @ToolMemoryId and related annotations from langchain4j-core to langchain4j module. Move ToolSpecification and ToolExecutionRequest into dev.langchain4j.model.chat.request/response packages. Update imports across codebase, add deprecation warnings, update tests.
**Stream:** A

## 16 | langchain4j/langchain4j ✅ DONE
**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 11,000
**Pain source:** [BUG] Intempestive JsonEOFException in Structured Outputs — PojoOutputParser fails ~30% of the time with com.fasterxml.jackson.core.io.JsonEOFException on well-formed JSON responses (Issue #4585) — <https://github.com/langchain4j/langchain4j/issues/4585>
**What to do:** Fix ParsingUtils/PojoOutputParser to handle incomplete JSON. Root cause likely streaming response truncation. Add retry logic or buffer flush. Add regression test that simulates partial JSON. Open PR.
**Stream:** A

## 17 | langchain4j/langchain4j ✅ DONE
**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 11,000
**Pain source:** [FEATURE] Migrate from Vertex AI SDK to Google Gen AI SDK before June 2026 deprecation — Vertex AI SDK goes offline June 24, 2026. LangChain4j's `langchain4j-vertex-ai-gemini` will break. New Google Gen AI SDK has features Vertex lacks (thinking budget for Gemini 2.5). Issue #4383 + Discussion #3383 — <https://github.com/langchain4j/langchain4j/issues/4383>
**What to do:** Create new `langchain4j-google-genai` module based on Google Gen AI SDK. Implement GeminiModel interface (same as current VertexAI Gemimi). Maintain backward compatibility with existing `langchain4j-vertex-ai-gemini` builder API. Add thinking budget support. Deprecate `langchain4j-vertex-ai-gemini` with migration guide. Add integration tests, update docs.
**Stream:** A

## 18 | langchain4j/langchain4j ✅ IN_PROGRESS (ENG subagent)
**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 11,000
**Pain source:** [BUG] NPE when calling Agent with Listener: LangChain4jManaged.current() returns null in tool execution callbacks — AgentInvocationHandler.invoke() (direct call path) never sets the ThreadLocal context, unlike AgentInvoker.internalInvoke() (sub-agent path). Both paths register callbacks that call LangChain4jManaged.current().get(AgenticScope.class) without null checks (Issue #4942) — <https://github.com/langchain4j/langchain4j/issues/4942>
**What to do:** ~~Fix AgentInvocationHandler.invoke() to set LangChain4jManaged ThreadLocal context around direct agent calls. Add null-safe fallback in AgentBuilder tool callbacks. Add regression test with AgentListener + tools called directly (not via Planner/Coordinator). Open PR.~~ **DONE** — fix and regression test committed.

## 19 | langchain4j/langchain4j ✅ IN_PROGRESS (ENG subagent)
**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 11,000
**Pain source:** [BUG] OpenAiChatModel ignores tool_calls when an OpenAI-compatible provider returns text in choices[0] and tool_calls in choices[1] — OpenAiUtils.aiMessageFrom(...) only parses choices.get(0). Breaks tool execution for providers (including gpt-5.4) that split text/tool calls across multiple choices (Issue #4931) — <https://github.com/langchain4j/langchain4j/issues/4931>
**What to do:** ~~Fix OpenAiUtils.aiMessageFrom(...) to iterate all choices, extract tool_calls from any choice that has them (not just choices[0]). Merge or prefer the choice with tool_calls. Add regression test with multi-choice response (text in [0], tool_calls in [1]). Open PR.~~ **DONE** — fix and regression test committed.

## 20 | langchain4j/langchain4j ✅ DONE
**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 11,000
**Pain source:** [FEATURE] Add Gemini Interactions API support to langchain4j-google-ai-gemini — Google's new Interactions API provides server-side conversation state, richer streaming, and tool orchestration that the current generateContent/streamGenerateContent surface doesn't expose. Feature request (Issue #4936) — <https://github.com/langchain4j/langchain4j/issues/4936>
**What to do:** Add experimental GeminiInteractionsChatModel + GeminiInteractionsStreamingChatModel implementing GeminiModel interface. Support previousInteractionId as per-request parameter. Expose interactionId in response metadata. Support tool calling across turns. No new external deps — reuse existing langchain4j-google-ai-gemini HTTP client. Add integration tests, update module docs.
**Stream:** A

## 28 | langchain4j/langchain4j ✅ PENDING (ENG subagent spawned 2026-04-19T01:32 UTC)

**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 11,644
**Pain source:** [ENHANCEMENT] ModerationModel's `toText(ChatMessage)` conversion is outdated for 2.0 — it doesn't handle UserMessage with multiple Contents, AiMessage with thinking/tool calls, or ToolExecutionResultMessage properly. The method loses information that the model needs for accurate moderation. Milestone 2.0.0 (Issue #4595) — <https://github.com/langchain4j/langchain4j/issues/4595>
**What to do:** Refactor `toText()` to handle all ChatMessage subtypes correctly. For UserMessage, join all content parts. For AiMessage, include thinking content. Add unit tests covering: SystemMessage, UserMessage with single text, UserMessage with multiple contents, AiMessage with text, AiMessage with tool calls, AiMessage with thinking, ToolExecutionResultMessage, unsupported type throws IllegalArgumentException. Open PR targeting 2.0.0.
**Stream:** A

## 29 | langchain4j/langchain4j ✅ PENDING (ENG subagent spawned 2026-04-19T01:32 UTC)

**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 11,644
**Pain source:** [ENHANCEMENT] ChromaEmbeddingStore has two critical gaps: (1) no authentication support (ChromaDB supports Bearer token via X-Chroma-Token header but builder exposes no apiKey parameter), (2) ChromaClient is package-private and uses ServiceLoader SPI which breaks in OSGi environments. Users with secured Chroma deployments cannot authenticate. OSGi users cannot use the library at all. Milestone 2.0.0 (Issue #4594) — <https://github.com/langchain4j/langchain4j/issues/4594>
**What to do:** Add `chromaClient(ChromaClient client)` builder method to ChromaEmbeddingStore.Builder (consistent with MilvusEmbeddingStore pattern). Add `apiKey(String)` builder method for Bearer token auth. Update ChromaHttpClient to accept pre-built client or expose apiKey via builder. Add integration test with authenticated Chroma. Add OSGi-compatible test. Open PR targeting 2.0.0.
**Stream:** A

## 27 | spring-projects/spring-ai ✅ PR OPEN — https://github.com/anuragg-saxenaa/spring-ai-query-fix/pull/5
| Name | Repo | Status | Notes |
|------|------|--------|-------|
| context-window-optimizer | https://github.com/anuragg-saxenaa/context-window-optimizer | DONE | PyPI installable, CLI, pytest suite, CI — enhanced 2026-04-16 |
| ai-code-assistant | https://github.com/anuragg-saxenaa/ai-code-assistant | DONE | Claude Code wrapper with project context injection, config layers |
| agent-config-governor | https://github.com/anuragg-saxenaa/agent-config-governor | DONE | Team config governance for AI coding agents — init/pull/push/drift/validate/audit commands, Zod schema, YAML store, JSONL audit, GitHub Actions CI
| agent-eval-harness | https://github.com/anuragg-saxenaa/agent-eval-harness | DONE | YAML-defined LLM agent eval framework, PR #1 open |

## 21 | spring-projects/spring-ai ✅ PR OPEN — https://github.com/spring-projects/spring-ai/pull/5818
**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8516
**Pain source:** [BUG] ChatClient toolCalls always empty — When Spring AI ChatClient calls a model that invokes tools, the `toolCalls` field of all elements in the returned `Flux<ChatResponse>` is empty. Users cannot retrieve tool call info from ChatResponse. Workaround: use Spring AI Alibaba's ReactAgent.streamMessages instead (Issue #5792) — <https://github.com/spring-projects/spring-ai/issues/5792>
**What to do:** Investigate why toolCalls are empty in ChatResponse when model returns tool calls. Likely missing propagation in ChatModel implementation or response parsing. Add integration test with a model that returns tool calls, verify toolCalls field is populated. Open PR with fix.
**Stream:** A

## 22 | langchain4j/langchain4j ✅ PR OPEN — <fill in PR URL>
**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 11644
**Pain source:** [BUG] `MissingArgumentException` is never thrown when a required agent argument is missing — `DefaultPromptTemplateFactory.ensureAllVariablesProvided()` throws `IllegalArgumentException`, not `MissingArgumentException`. Exception also buried under 3 layers of reflection wrappers. Error handler's `instanceof MissingArgumentException` check never matches. Users cannot detect and recover from missing args (Issue #4946) — <https://github.com/langchain4j/langchain4j/issues/4946>
**What to do:** Option A: Change DefaultPromptTemplateFactory to throw MissingArgumentException when variables are missing. Option B: AgentInvoker unwraps reflection wrappers and detects root cause. Add regression test with agent + missing variable + error handler. Verify instanceof check works. Open PR.
**Stream:** A

## 30 | langchain4j/langchain4j ✅ PENDING (ENG subagent spawned 2026-04-19T01:32 UTC)

**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 11,644
**Pain source:** [BUG] `ReturnBehavior.IMMEDIATE` fires even when the `@Tool` method throws an exception. The IMMEDIATE check in both sync (ToolService) and streaming (AiServiceStreamingResponseHandler) paths is a pure tool-name lookup — it never inspects `ToolExecutionResult.isError()`. This short-circuits the tool-calling loop with an error result and prevents the LLM from retrying with corrected arguments. Particularly painful for interactive "ask the user" style tools where IMMEDIATE is the whole point — agents can't retry on malformed arguments. Bug opened Apr 18, 2026 (Issue #4962) — <https://github.com/langchain4j/langchain4j/issues/4962>
**What to do:** Add `&& !result.isError()` to the `immediateToolReturn` check in both ToolService.java (sync path, lines ~367-410) and AiServiceStreamingResponseHandler.java (streaming path, lines ~295-336). The fix gates IMMEDIATE on successful tool execution only. A scripted unit test is already provided in the issue showing a ChatModel that always calls `doWork`, a `ThrowingTool`, and an assertion that `llmCalls >= 2` (proving IMMEDIATE correctly waits for success). Add this test verbatim, open PR targeting 1.13.0.
**Stream:** A

## 31 | langchain4j/langchain4j ✅ PENDING (ENG subagent spawned 2026-04-19T01:32 UTC)

**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 11,644
**Pain source:** [FEATURE] `McpClientListener` only covers client-initiated operations (tools/call, resources/read, prompts/get). Missing support for: ping, tools/list, notifications/initialized, and all server-initiated operations. This blocks developers building full MCP client integrations who need visibility into all protocol message types. Feature opened Apr 17, 2026 (Issue #4953) — <https://github.com/langchain4j/langchain4j/issues/4953>
**What to do:** Extend `McpClientListener` to cover all missing message types: (1) remaining client-initiated operations (ping, tools/list, notifications/initialized), (2) all server-initiated operations (e.g., tooling suggestions, resourceUpdated notifications). Add corresponding callback methods to the listener interface. Add tests covering all new message types. Update documentation. Open PR targeting 2.0.0.
**Stream:** A

## 32 | spring-projects/spring-ai ✅ PENDING (ENG subagent spawned 2026-04-19T01:32 UTC)

**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,500
**Pain source:** [BUG] `WebClientStreamableHttpTransport.sendMessage()` uses `onErrorComplete` in the reactive chain — when a body-level error occurs (DataBufferLimitException, malformed JSON, SSE parse errors), the operator silently completes the stream. Pending McpClientSession response is never resolved, causing the caller to hang until requestTimeout (300s). Upstream fix documented in the issue — change to `onErrorResume` and emit a synthetic JSON-RPC error response for requests (not notifications). Issue #5775 — <https://github.com/spring-projects/spring-ai/issues/5775>
**What to do:** Change `onErrorComplete` to `onErrorResume` in `WebClientStreamableHttpTransport.sendMessage()`. For requests (requestId != null), emit a synthetic `McpSchema.JSONRPCResponse` with `INTERNAL_ERROR` code so `McpClientSession.pendingResponses` resolves immediately instead of hanging. Drop error for notifications. Add regression test simulating body-level error with pending request/response cycle. Open PR.
**Stream:** A

## 33 | spring-projects/spring-ai ✅ PENDING (ENG subagent spawned 2026-04-19T01:32 UTC)

**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,500
**Pain source:** [BUG] OpenAI chat options `model` field rejects slash-delimited model paths like `/model/Qwen3-32B` — the `/` character causes a 400 Bad Request when sent to vLLM/OpenAI-compatible backends that use path-format model names. Users must hardcode base-url hacks to work around this. The model name with `/` fails in Spring's options injection but works in raw curl. Issue #5413 — <https://github.com/spring-projects/spring-ai/issues/5413>
**What to do:** Investigate where the slash in the model name causes the 400 error. Likely the `ObjectToMapConverter` or similar that transforms chat options into the request body. Add URL-encoding for the model field specifically in OpenAiApi.ChatCompletionRequest builder, OR validate that `/model/...` format is handled correctly as a plain string. Add test with model path `/model/Qwen3-32B` verifying it serializes correctly as `"model": "/model/Qwen3-32B"`. Open PR.
**Stream:** A

## 34 | spring-projects/spring-ai ✅ PENDING (ENG subagent spawned 2026-04-19T01:32 UTC)

**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,500
**Pain source:** [BUG] ANTLR4 version conflicts in classpath — Spring AI's generated ANTLR4 parser code performs strict version-match checks. When another library on the classpath uses a different antlr4-runtime version, the combined system fails to start. The workaround (shading antlr-runtime into each library) is manual and error-prone. Reference shading solution in yauaa project (Issue #5748) — <https://github.com/spring-projects/spring-ai/issues/5748>
**What to do:** Add antlr4-runtime shading to Spring AI's build (pom.xml/gradle). Use `maven-shade-plugin` to relocate `org.antlr4.v4.runtime.*` → `org.springframework.ai.antlr4.runtime.v4.runtime` and update all generated ANTLR code imports accordingly. Add `antlr4-runtime` as `provided` scope so it doesn't leak into the classpath. Document the shading configuration. Add integration test with a conflicting antlr4 version on classpath — verify Spring AI starts correctly. Open PR.
**Stream:** A

## 35 | spring-projects/spring-ai ✅ PR OPEN — https://github.com/anuragg-saxenaa/spring-ai-graph/pull/1
**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,500
**Pain source:** Spring AI has no higher-level agent orchestration layer — developers must hand-write execution loops, state management, checkpointing, and human-in-the-loop patterns from scratch. Every team independently rewrites the same primitives (Issue #5826) — <https://github.com/spring-projects/spring-ai/issues/5826>
**What to do:** Implement `spring-ai-graph` module with six primitives: (1) AgentState record with messages/scratchpad/nextStep, (2) @AgentNode annotation for Node functions, (3) AgentGraph builder with linear/conditional edges, (4) Checkpointer interface with InMemory/Jdbc implementations, (5) @Interrupt for native HITL with resume(), (6) OpenTelemetry tracing via GenAI semantic conventions. Reference LangGraph (Python/JS) API shape. Add ReAct and plan-execute examples. Open PR.
**Stream:** A

## 36 | spring-projects/spring-ai ⭐ READY
**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,500
**Pain source:** `@McpTool` cannot be applied directly to `@HttpExchange` HTTP Service Client methods — Spring AI MCP server does not auto-discover them, forcing developers to write wrapper @Service classes that delegate to the HTTP client (Issue #5823) — <https://github.com/spring-projects/spring-ai/issues/5823>
**What to do:** Extend `McpToolMethodFactory` or create `HttpServiceMcpToolMethodFactory` to detect `@McpTool`-annotated `@HttpExchange` methods on Spring-proxied HTTP service clients. When `@ImportHttpServices` is used with an interface that has `@McpTool` methods, register those methods as MCP tools automatically. Add test with `@HttpExchange` interface + `@McpTool` + `@ImportHttpServices`. Open PR.
**Stream:** A

## 37 | spring-projects/spring-ai ⭐ READY
**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,500
**Pain source:** `ChatClient` `defaultOptions()` completely replaces auto-configured options — users cannot selectively override specific properties (e.g., model name) without losing all other auto-configured properties. Forces workaround of not using auto-configured builder (Issue #5821) — <https://github.com/spring-projects/spring-ai/issues/5821>
**What to do:** Add `merge(ChatOptions)` method to `ChatClientRequestSpec` that performs a deep merge: override only non-null fields from the provided options, leave auto-configured fields untouched. Update `defaultOptions()` to use merge semantics instead of replace. Add tests: merge with null fields, merge with overridden model name, merge with conflicting values. Open PR.
**Stream:** A

## 38 | langchain4j/langchain4j ⭐ READY
**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 11,644
**Pain source:** `GuardrailExecutedEvent.guardrailClass()` returns the adapter/wrapper class when guardrails are wrapped (decorator pattern) — observability systems see all executions as "InputGuardrailAdapter" instead of the logical guardrail name. Makes tracing and audit logs useless (Issue #4938) — <https://github.com/langchain4j/langchain4j/issues/4938>
**What to do:** Add `guardrailName()` default method to `GuardrailExecutedEvent` returning `guardrailClass().getSimpleName()`. Propagate the logical guardrail name at execution time so decorators can override `Guardrail.name()` to expose the underlying guardrail identity. Add unit test with decorator-wrapped guardrail verifying `guardrailName()` returns the logical name. Open PR.
**Stream:** A

## 39 | spring-projects/spring-ai ⭐ READY
**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,500
**Pain source:** Streaming tool calls are incorrectly merged — when Spring AI processes streaming responses with tool calls, the mergeToolCalls() logic overwrites arguments instead of concatenating them, and doesn't propagate the name from the first chunk. This causes `IllegalArgumentException: toolInput cannot be null or empty` during tool execution. Only affects streaming mode; non-streaming works fine. Issue #5806 — <https://github.com/spring-projects/spring-ai/issues/5806>
**What to do:** Fix mergeToolCalls() to: (1) concatenate arguments instead of overwriting (`existing.arguments += incoming.arguments`), (2) preserve first non-null name, (3) ignore empty argument chunks. Add regression test with a streaming tool call that arrives in 4+ chunks verifying final merged ToolCall has complete arguments. Open PR.
**Stream:** A

## 40 | spring-projects/spring-ai ⭐ READY
**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,500
**Pain source:** MCP resource/prompt callbacks use INVALID_PARAMS (-32602) for runtime exceptions — when a @McpResource or @McpPrompt method throws IOException, NPE, or other runtime exceptions, Spring AI wraps them as INVALID_PARAMS. Per MCP spec, -32602 means bad method parameters; -32603 (INTERNAL_ERROR) is the correct code for internal/runtime errors. This confuses MCP clients and breaks error handling. Issue #5812 — <https://github.com/spring-projects/spring-ai/issues/5812>
**What to do:** Change ErrorCodes.INVALID_PARAMS to ErrorCodes.INTERNAL_ERROR in all 8 callback files: SyncMcpResourceMethodCallback, AsyncMcpResourceMethodCallback, SyncStatelessMcpResourceMethodCallback, AsyncStatelessMcpResourceMethodCallback, SyncMcpPromptMethodCallback, AsyncMcpPromptMethodCallback, SyncStatelessMcpPromptMethodCallback, AsyncStatelessMcpPromptMethodCallback. Add regression test with a @McpResource method that throws a runtime exception, verify response uses -32603. Open PR.
**Stream:** A

## 23 | spring-projects/spring-ai ✅ DONE


**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,200
**Pain source:** [ENHANCEMENT] DefaultToolCallingManager executes tool calls sequentially — when LLM returns multiple independent tool calls (parallelToolCalls=true), they execute one-by-one causing 3x latency. A 3-tool call scenario takes ~8s sequentially vs ~3s if run concurrently. Enterprise orchestration agents are blocked on this (Issue #5195) — <https://github.com/spring-projects/spring-ai/issues/5195>
**What to do:** Add `parallelToolExecution=true` option to DefaultToolCallingManager. Execute independent tool calls concurrently using CompletableFuture/allOf. Maintain backward compatibility (default stays sequential). Add integration test with 3 independent tool calls measuring total execution time < 2x max individual call. Open PR.
**Stream:** A

## 24 | spring-projects/spring-ai ✅ DONE

**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,200
**Pain source:** [BUG] OpenAI requests fail after exactly 5 minutes — SocketException "Unexpected end of file from server" at 5min mark regardless of timeout configuration. User increased read timeout to 10min, ChannelOption.CONNECT_TIMEOUT to 30s, ReadTimeoutHandler to 600s — all ignored. Proxy-based setup. Error occurs at network layer before Spring handles it (Issue #5594) — <https://github.com/spring-projects/spring-ai/issues/5594>
**What to do:** Investigate why 5-minute cutoff is enforced despite timeout config. Likely a Netty/connection pool default that's not being overridden. Check HttpClient connection lifecycle, idleTimeout, pooled connection lifetime. Add explicit `connectionTimeout` and `maxLifetime` to HttpClient builder. Add test or documentation showing correct config. Open PR with fix.
**Stream:** A

## 25 | spring-projects/spring-ai ✅ DONE

**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,200
**Pain source:** [FEATURE] Spring AI has no service discovery integration for MCP/A2A — Enterprise users with Spring Cloud microservices (Eureka/Nacos/K8s) need hardcoded URLs for MCP clients and A2A agents. Cannot hot-plug MCP servers or use load balancing for AI-to-AI communication. This blocks enterprise adoption of AI-native patterns (Issue #5453) — <https://github.com/spring-projects/spring-ai/issues/5453>
**What to do:** Implement McpClientFactory that uses Spring Cloud DiscoveryClient to find MCP servers by metadata (type=mcp-server). Add AgentService that resolves agent names via service registry and calls them via A2A protocol with LoadBalancer/CircuitBreaker support. Create sample app using Eureka. Update docs. Open PR.
**Stream:** A

## 26 | spring-projects/spring-ai ✅ DONE

**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,200
**Pain source:** [BUG] OpenAiApi.ChatCompletion class is too restrictive for OpenAI-compatible providers — Perplexity AI and xAI/Grok return provider-specific fields (citations, web search results) at response top level that get silently dropped. ChatResponse loses these fields entirely. Users cannot access provider-specific metadata (Issue #5253) — <https://github.com/spring-projects/spring-ai/issues/5253>
**What to do:** Extend ChatCompletion.ChatCompletionFinish to include a Map<String, Object> extraAttributes field that captures provider-specific top-level fields. Add ChatResponse.ChatResponseMetadata support for these extras. Preserve backward compatibility. Add Perplexity integration test verifying citations are present in response metadata. Open PR.
**Stream:** A
