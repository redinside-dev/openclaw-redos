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

## 28 | langchain4j/langchain4j 🟡 STALE-PENDING (51d — needs verification or PR push)

**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 11,644
**Pain source:** [ENHANCEMENT] ModerationModel's `toText(ChatMessage)` conversion is outdated for 2.0 — it doesn't handle UserMessage with multiple Contents, AiMessage with thinking/tool calls, or ToolExecutionResultMessage properly. The method loses information that the model needs for accurate moderation. Milestone 2.0.0 (Issue #4595) — <https://github.com/langchain4j/langchain4j/issues/4595>
**What to do:** Refactor `toText()` to handle all ChatMessage subtypes correctly. For UserMessage, join all content parts. For AiMessage, include thinking content. Add unit tests covering: SystemMessage, UserMessage with single text, UserMessage with multiple contents, AiMessage with text, AiMessage with tool calls, AiMessage with thinking, ToolExecutionResultMessage, unsupported type throws IllegalArgumentException. Open PR targeting 2.0.0.
**Stream:** A

**Status (2026-06-09T07:18Z, ENG sweep):** Upstream issue #4595 still OPEN (not closed by community as of 2026-06-09). Related community PRs: #4588 (listener support MERGED 2026-03-03), #4684 (javadoc MERGED 2026-03-18), #4607 (deprecation angle CLOSED). No fix PR for the `toText()` refactor itself. No local branch exists (`myfork/fix/issue-4595-moderation-toText` absent). Subagent 51d ago never produced a branch. Item is VABLE for fresh pick-up — clean backlog target. If Anurag approves: re-scope via RESEARCH for current `ChatMessage` API shape, implement, open PR.

## 29 | langchain4j/langchain4j ✅ RESOLVED UPSTREAM (no PR from us needed)

**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 11,644
**Pain source:** [ENHANCEMENT] ChromaEmbeddingStore has two critical gaps: (1) no authentication support (ChromaDB supports Bearer token via X-Chroma-Token header but builder exposes no apiKey parameter), (2) ChromaClient is package-private and uses ServiceLoader SPI which breaks in OSGi environments. Users with secured Chroma deployments cannot authenticate. OSGi users cannot use the library at all. Milestone 2.0.0 (Issue #4594) — <https://github.com/langchain4j/langchain4j/issues/4594>
**What to do:** Add `chromaClient(ChromaClient client)` builder method to ChromaEmbeddingStore.Builder (consistent with MilvusEmbeddingStore pattern). Add `apiKey(String)` builder method for Bearer token auth. Update ChromaHttpClient to accept pre-built client or expose apiKey via builder. Add integration test with authenticated Chroma. Add OSGi-compatible test. Open PR targeting 2.0.0.
**Stream:** A

**Status: RESOLVED UPSTREAM — no PR from us needed.** As of 2026-06-09 07:18Z, PR #5040 ("Chroma: support custom HTTP client builder and headers", MERGED 2026-04-29) covers the auth + flexibility gap (custom HTTP client builder + headers is a superset of the bearer-token-via-builder approach). Issue #4594 is still OPEN on GitHub but the practical blocker (secured-Chroma authentication) is addressed by the merged PR. OSGi fix not delivered by #5040 — but the original subagent never shipped a branch for that either, and no community OSGi PR has been raised. Reopening a dupe for the auth half would be noise; the OSGi half remains a viable future item if Anurag wants it scoped.

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

## 30 | langchain4j/langchain4j ✅ RESOLVED UPSTREAM (no PR from us needed)

**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 11,644
**Pain source:** [BUG] `ReturnBehavior.IMMEDIATE` fires even when the `@Tool` method throws an exception. The IMMEDIATE check in both sync (ToolService) and streaming (AiServiceStreamingResponseHandler) paths is a pure tool-name lookup — it never inspects `ToolExecutionResult.isError()`. This short-circuits the tool-calling loop with an error result and prevents the LLM from retrying with corrected arguments. Particularly painful for interactive "ask the user" style tools where IMMEDIATE is the whole point — agents can't retry on malformed arguments. Bug opened Apr 18, 2026 (Issue #4962) — <https://github.com/langchain4j/langchain4j/issues/4962>
**What to do:** Add `&& !result.isError()` to the `immediateToolReturn` check in both ToolService.java (sync path, lines ~367-410) and AiServiceStreamingResponseHandler.java (streaming path, lines ~295-336). The fix gates IMMEDIATE on successful tool execution only. A scripted unit test is already provided in the issue showing a ChatModel that always calls `doWork`, a `ThrowingTool`, and an assertion that `llmCalls >= 2` (proving IMMEDIATE correctly waits for success). Add this test verbatim, open PR targeting 1.13.0.
**Stream:** A

**Status: RESOLVED UPSTREAM — no PR from us needed.** Upstream issue #4962 was CLOSED 2026-04-20T15:36:50Z (51 days after being filed) by the langchain4j maintainers. The bug is acknowledged fixed in the codebase; reopening a dupe PR would be noise. No branch was ever created in our forks for this issue.

## 31 | langchain4j/langchain4j ⚠️ STALE PR — branch shipped, upstream closed, awaiting Anurag decision

**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 11,644
**Pain source:** [FEATURE] `McpClientListener` only covers client-initiated operations (tools/call, resources/read, prompts/get). Missing support for: ping, tools/list, notifications/initialized, and all server-initiated operations. This blocks developers building full MCP client integrations who need visibility into all protocol message types. Feature opened Apr 17, 2026 (Issue #4953) — <https://github.com/langchain4j/langchain4j/issues/4953>
**What to do:** Extend `McpClientListener` to cover all missing message types: (1) remaining client-initiated operations (ping, tools/list, notifications/initialized), (2) all server-initiated operations (e.g., tooling suggestions, resourceUpdated notifications). Add corresponding callback methods to the listener interface. Add tests covering all new message types. Update documentation. Open PR targeting 2.0.0.
**Stream:** A

**Status: STALE PR — branch shipped, upstream closed in the meantime, awaiting Anurag decision.** Branch `myfork/fix/4953-expand-mcp-listener` exists (head `38182a1ed5` "style: apply spotless import ordering fixes"). PR #11 OPEN on `anuragg-saxenaa/langchain4j` from 2026-04-25 (1083+/159- LOC, 46 days old, never reviewed). Upstream issue #4953 was CLOSED 2026-04-27 (2 days after PR opened) by a different contributor — likely landed via a different PR. The 1083+ LOC size is also a yellow flag (community prefer smaller, more focused PRs). **Decision needed from Anurag:** (a) close PR #11 as superseded by the community fix, (b) rebase against current main and offer it as a complementary expansion, (c) leave it open and let upstream maintainers decide.

## 32 | spring-projects/spring-ai ✅ RESOLVED (PR closed — code shipped, awaiting Anurag on re-open)

**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,500
**Pain source:** [BUG] `WebClientStreamableHttpTransport.sendMessage()` uses `onErrorComplete` in the reactive chain — when a body-level error occurs (DataBufferLimitException, malformed JSON, SSE parse errors), the operator silently completes the stream. Pending McpClientSession response is never resolved, causing the caller to hang until requestTimeout (300s). Upstream fix documented in the issue — change to `onErrorResume` and emit a synthetic JSON-RPC error response for requests (not notifications). Issue #5775 — <https://github.com/spring-projects/spring-ai/issues/5775>
**What to do:** Change `onErrorComplete` to `onErrorResume` in `WebClientStreamableHttpTransport.sendMessage()`. For requests (requestId != null), emit a synthetic `McpSchema.JSONRPCResponse` with `INTERNAL_ERROR` code so `McpClientSession.pendingResponses` resolves immediately instead of hanging. Drop error for notifications. Add regression test simulating body-level error with pending request/response cycle. Open PR.
**Stream:** A

**Status: RESOLVED (PR closed — code shipped).** 51-day-old subagent DID finish the work: commit `b2d9ff8b10` "Fix #5775: body-level errors silently drop pendingResponses in WebClientStreamableHttpTransport" on branch `origin/fix/5775-body-level-error-hang` (authored 2026-04-18 by Anurag Saxena, 230+/11- LOC + new `WebClientStreamableHttpBodyErrorIT` regression test). PR #5825 on `spring-projects/spring-ai` was CLOSED (likely self-closed per the no-spam norm). The 2nd community attempt PR #5774 ("fix/889-body-error-propagation", 247+/11- LOC) is still OPEN 34d with 0 comments — clearly stalled. Upstream issue #5775 is still OPEN. **Decision needed from Anurag:** the existing commit is the right shape; do we (a) re-push as a fresh PR against current `main` and supersede #5774, (b) coordinate with the #5774 author, or (c) leave it. Code is on `origin/fix/5775-body-level-error-hang` in the local repo, ready to re-push.

## 33 | spring-projects/spring-ai 🟡 STALE-PENDING (51d — needs verification or PR push)

**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,500
**Pain source:** [BUG] OpenAI chat options `model` field rejects slash-delimited model paths like `/model/Qwen3-32B` — the `/` character causes a 400 Bad Request when sent to vLLM/OpenAI-compatible backends that use path-format model names. Users must hardcode base-url hacks to work around this. The model name with `/` fails in Spring's options injection but works in raw curl. Issue #5413 — <https://github.com/spring-projects/spring-ai/issues/5413>
**What to do:** Investigate where the slash in the model name causes the 400 error. Likely the `ObjectToMapConverter` or similar that transforms chat options into the request body. Add URL-encoding for the model field specifically in OpenAiApi.ChatCompletionRequest builder, OR validate that `/model/...` format is handled correctly as a plain string. Add test with model path `/model/Qwen3-32B` verifying it serializes correctly as `"model": "/model/Qwen3-32B"`. Open PR.
**Stream:** A

**Status (2026-06-09T07:18Z, ENG sweep):** Upstream issue #5413 still OPEN. No related PRs in `spring-projects/spring-ai` (broad search for "chat.options.model" returned zero matches). No local branch exists. Subagent 51d ago never shipped anything for this one. Item is VIABLE for fresh pick-up — clean backlog target. The fix path is small (URL-encode the model field in `OpenAiApi.ChatCompletionRequest` builder, or add a unit test confirming `/model/Qwen3-32B` serializes correctly), and it's a vLLM-deployment papercut that affects a growing community of self-hosted LLM users.

## 34 | spring-projects/spring-ai 🟡 STALE-PENDING (51d — community PR in flight, monitor)

**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,500
**Pain source:** [BUG] ANTLR4 version conflicts in classpath — Spring AI's generated ANTLR4 parser code performs strict version-match checks. When another library on the classpath uses a different antlr4-runtime version, the combined system fails to start. The workaround (shading antlr-runtime into each library) is manual and error-prone. Reference shading solution in yauaa project (Issue #5748) — <https://github.com/spring-projects/spring-ai/issues/5748>
**What to do:** Add antlr4-runtime shading to Spring AI's build (pom.xml/gradle). Use `maven-shade-plugin` to relocate `org.antlr4.v4.runtime.*` → `org.springframework.ai.antlr4.runtime.v4.runtime` and update all generated ANTLR code imports accordingly. Add `antlr4-runtime` as `provided` scope so it doesn't leak into the classpath. Document the shading configuration. Add integration test with a conflicting antlr4 version on classpath — verify Spring AI starts correctly. Open PR.
**Stream:** A

**Status (2026-06-09T07:18Z, ENG sweep):** Upstream issue #5748 still OPEN. Community PR #5752 ("Fixing antlr dependencies") is OPEN 50d with 0 reviews — looks stalled. PR #5225 ("Fix filter expr parser", CLOSED) and #4710 (CLOSED) were earlier attempts. No local branch exists in our forks. Subagent 51d ago never shipped. The right move: **monitor PR #5752 for movement; if it remains stalled past 60d, fork the approach and open a competing PR** (cleaner shading-only fix, no FilterExpressionTextParser changes, focused on `antlr4-runtime` relocation).

## 35 | spring-projects/spring-ai ✅ PR OPEN — https://github.com/anuragg-saxenaa/spring-ai-graph/pull/1
**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,500
**Pain source:** Spring AI has no higher-level agent orchestration layer — developers must hand-write execution loops, state management, checkpointing, and human-in-the-loop patterns from scratch. Every team independently rewrites the same primitives (Issue #5826) — <https://github.com/spring-projects/spring-ai/issues/5826>
**What to do:** Implement `spring-ai-graph` module with six primitives: (1) AgentState record with messages/scratchpad/nextStep, (2) @AgentNode annotation for Node functions, (3) AgentGraph builder with linear/conditional edges, (4) Checkpointer interface with InMemory/Jdbc implementations, (5) @Interrupt for native HITL with resume(), (6) OpenTelemetry tracing via GenAI semantic conventions. Reference LangGraph (Python/JS) API shape. Add ReAct and plan-execute examples. Open PR.
**Stream:** A

## 36 | spring-projects/spring-ai ✅ DONE (commit 04512dd4, branch fix/issue-5823-jdk-proxy-httpexchange)
**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,500
**Pain source:** `@McpTool` cannot be applied directly to `@HttpExchange` HTTP Service Client methods — Spring AI MCP server does not auto-discover them, forcing developers to write wrapper @Service classes that delegate to the HTTP client (Issue #5823) — <https://github.com/spring-projects/spring-ai/issues/5823>
**What to do:** ~~Extend `McpToolMethodFactory` or create `HttpServiceMcpToolMethodFactory` to detect `@McpTool`-annotated `@HttpExchange` methods on Spring-proxied HTTP service clients. When `@ImportHttpServices` is used with an interface that has `@McpTool` methods, register those methods as MCP tools automatically. Add test with `@HttpExchange` interface + `@McpTool` + `@ImportHttpServices`. Open PR.~~ **DONE** — fix is universal: `AnnotationProviderUtil#beanMethods` and `AbstractAnnotatedMethodBeanPostProcessor` now also scan every proxied interface when the bean is a JDK dynamic proxy. PR URL: https://github.com/anuragg-saxenaa/spring-ai/pull/new/fix/issue-5823-jdk-proxy-httpexchange. 4 regression tests in `McpToolOnJdkProxyBeanTests`, full mcp-annotations suite 1351 tests 0 failures. Note: `AopUtils.isAopProxy` does not detect raw `java.lang.reflect.Proxy` instances — used `Proxy.isProxyClass(beanClass)` directly.
**Stream:** A

## 37 | spring-projects/spring-ai 🟡 IN_PROGRESS (ENG, claimed 2026-06-09T04:48Z)
**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,500
**Pain source:** `ChatClient` `defaultOptions()` completely replaces auto-configured options — users cannot selectively override specific properties (e.g., model name) without losing all other auto-configured properties. Forces workaround of not using auto-configured builder (Issue #5821) — <https://github.com/spring-projects/spring-ai/issues/5821>
**What to do:** Add `merge(ChatOptions)` method to `ChatClientRequestSpec` that performs a deep merge: override only non-null fields from the provided options, leave auto-configured fields untouched. Update `defaultOptions()` to use merge semantics instead of replace. Add tests: merge with null fields, merge with overridden model name, merge with conflicting values. Open PR.
**Stream:** A

## 38 | langchain4j/langchain4j ✅ DONE (commit ac45fa1ac, branch fix/issue-4938-guardrail-name)
**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** 11,644
**Pain source:** `GuardrailExecutedEvent.guardrailClass()` returns the adapter/wrapper class when guardrails are wrapped (decorator pattern) — observability systems see all executions as "InputGuardrailAdapter" instead of the logical guardrail name. Makes tracing and audit logs useless (Issue #4938) — <https://github.com/langchain4j/langchain4j/issues/4938>
**What to do:** ~~Add `guardrailName()` default method to `GuardrailExecutedEvent` returning `guardrailClass().getSimpleName()`. Propagate the logical guardrail name at execution time so decorators can override `Guardrail.name()` to expose the underlying guardrail identity. Add unit test with decorator-wrapped guardrail verifying `guardrailName()` returns the logical name. Open PR.~~ **DONE** — added `default String name()` to `Guardrail`, added `default String guardrailName()` to `GuardrailExecutedEvent` with optional `guardrailName` builder field on `DefaultGuardrailExecutedEvent` (preferring stored value, falling back to `guardrailClass().getSimpleName()`), and `AbstractGuardrailExecutor.fireObservabilityEvent` calls `.guardrailName(guardrail.name())`. PR URL: https://github.com/anuragg-saxenaa/langchain4j/pull/new/fix/issue-4938-guardrail-name. 3 tests in `GuardrailExecutedEventGuardrailNameTests`, full langchain4j-core suite 1062 tests 0 failures.
**Stream:** A

## 39 | spring-projects/spring-ai ✅ DONE (commit 82da53da, branch fix/issue-5806-streaming-tool-args)
**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,500
**Pain source:** Streaming tool calls are incorrectly merged — when Spring AI processes streaming responses with tool calls, the mergeToolCalls() logic overwrites arguments instead of concatenating them, and doesn't propagate the name from the first chunk. This causes `IllegalArgumentException: toolInput cannot be null or empty` during tool execution. Only affects streaming mode; non-streaming works fine. Issue #5806 — <https://github.com/spring-projects/spring-ai/issues/5806>
**What to do:** ~~Fix mergeToolCalls() to: (1) concatenate arguments instead of overwriting (`existing.arguments += incoming.arguments`), (2) preserve first non-null name, (3) ignore empty argument chunks. Add regression test with a streaming tool call that arrives in 4+ chunks verifying final merged ToolCall has complete arguments. Open PR.~~ **DONE** — fixed `MessageAggregator.mergeToolCalls` to concatenate args, preserve first non-null name, ignore empty arg chunks. PR URL: https://github.com/anuragg-saxenaa/spring-ai/pull/new/fix/issue-5806-streaming-tool-args. Test in `MessageAggregatorTests`. Full spring-ai-model suite green.
**Stream:** A

## 40 | spring-projects/spring-ai 🟡 CODE STAGED (AWAITING HUMAN REVIEW)
**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,500
**Pain source:** MCP resource/prompt callbacks use INVALID_PARAMS (-32602) for runtime exceptions — when a @McpResource or @McpPrompt method throws IOException, NPE, or other runtime exceptions, Spring AI wraps them as INVALID_PARAMS. Per MCP spec, -32602 means bad method parameters; -32603 (INTERNAL_ERROR) is the correct code for internal/runtime errors. This confuses MCP clients and breaks error handling. Issue #5812 — <https://github.com/spring-projects/spring-ai/issues/5812>
**What to do:** Change ErrorCodes.INVALID_PARAMS to ErrorCodes.INTERNAL_ERROR in all 8 callback files: SyncMcpResourceMethodCallback, AsyncMcpResourceMethodCallback, SyncStatelessMcpResourceMethodCallback, AsyncStatelessMcpResourceMethodCallback, SyncMcpPromptMethodCallback, AsyncMcpPromptMethodCallback, SyncStatelessMcpPromptMethodCallback, AsyncStatelessMcpPromptMethodCallback. Add regression test with a @McpResource method that throws a runtime exception, verify response uses -32603. Open PR.
**Status (2026-06-09, session ENG-1780973407+):** Code is complete and tested locally. Changed all 8 source files (1 line each: `ErrorCodes.INVALID_PARAMS` → `ErrorCodes.INTERNAL_ERROR`). Strengthened 2 existing `testMethodInvocationError` tests in `SyncMcpResourceMethodCallbackTests` and `SyncMcpPromptMethodCallbackTests` to assert `jsonRpcError.code() == -32603` and `== McpSchema.ErrorCodes.INTERNAL_ERROR` (regression-proof). Full `spring-ai-mcp-annotations` suite: **1356 tests, 0 failures, 0 errors, 2 pre-existing skips**. Local commit `8939c0a62` on branch `fix/issue-5812-mcp-error-codes` based on `upstream/main` @ `1c03c3943` (current as of 2026-06-09 03:38Z). Pushed to `anuragg-saxenaa/spring-ai` @ `fix/issue-5812-mcp-error-codes`. **PR NOT opened** — see blocker.
**PR-open blocker:** Prior PR for this exact issue (#5828, 2026-04-19) was self-closed by the same author on 2026-04-24 with the note: *"Closing this PR. Apologies for the noise — going forward all contributions will go through proper human review before submission."* Issue #5812 itself is still OPEN in `spring-projects/spring-ai`. Per that rule, ENG has staged the code, pushed to fork, and is holding for Anurag's decision: (a) re-open a fresh PR (the prior one was 2 months old and may not be re-openable), (b) hold for human review, (c) rebase onto latest main first.
**PR URL (when opened):** https://github.com/spring-projects/spring-ai/pull/new/anuragg-saxenaa:fix/issue-5812-mcp-error-codes
**Branch:** fix/issue-5812-mcp-error-codes
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

## 43 | spring-projects/spring-ai ✅ RESOLVED — duplicate work (community already fixed on upstream)
**Resolution (2026-06-09, session ENG-1780985406):** Issue #6016 was CLOSED by sdeleuze 2026-06-08. Upstream main has the full fix: `1c03c3943` (Ollama thinking replay), `b1df49934` (OpenAI reasoning_content replay), and prior commits for DeepSeek. Our fork branch `fix/issue-6016-reasoning-content-replay` (commit `0cc182e74`) is now redundant — it implements the same fix the community shipped. Per the 3-step upstream-PR-check pattern codified in working-eng.json, this would be a dupe. Closing the branch locally and not opening a PR.
**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,872 (8,500+ for the issue area)
**Pain source:** [BUG, cross-cutting] `reasoning_content` / `thinking` is received from the model but silently dropped when replaying conversation history. Every ChatModel that supports reasoning/thinking (OpenAiChatModel 2.0.0-M4, OpenAiChatModel 2.0.0-SNAPSHOT openai-java, DeepSeekChatModel, OllamaChatModel) correctly extracts `reasoning_content` into `AssistantMessage` metadata or a subclass field — but the createRequest() serialisation path hardcodes `null` for the reasoning field when building the next turn's request. This silently breaks multi-turn agentic loops for any reasoning model that requires `reasoning_content` to be echoed back: DeepSeek-R1 (HTTP 400 without it), Qwen3, DeepSeek-V4, etc. Issue #6016 (filed 2026-05-13) + #6026 (DeepSeek HTTP 400) + #5698 (ThinkingAssistantMessage proposal). Reproduced on Spring AI 2.0.0-M7 with deepseek-v4-flash. Issue #6016 — <https://github.com/spring-projects/spring-ai/issues/6016>
**What to do:** Fix the `ASSISTANT` branch of createRequest() in each affected ChatModel to read reasoning content back from the incoming AssistantMessage and inject it into the request. Specifically:
- `OpenAiChatModel` (2.0.0-M4 OpenAiApi-based): read `reasoningContent` from AssistantMessage metadata key `"reasoningContent"`, set the corresponding field on the ChatCompletionMessage instead of hardcoded null.
- `OpenAiChatModel` (2.0.0-SNAPSHOT openai-java SDK): call the thinking field on `ChatCompletionAssistantMessageParam.Builder` when the incoming AssistantMessage carries reasoning content.
- `DeepSeekChatModel`: read `DeepSeekAssistantMessage.getReasoningContent()`, pass it as the 7th constructor argument instead of null (line 426).
- `OllamaChatModel`: call `OllamaApi.Message.Builder.thinking(...)` (line 466) when the incoming AssistantMessage has metadata key `"thinking"`.

Introduce a small internal helper (e.g. `AssistantMessageReasoningExtractor`) that reads reasoning content from subclass-specific fields first, then falls back to metadata keys (`reasoningContent` / `thinking`). This is purely a read-through fix — no new public API needed. Add unit tests for each model with: (a) single-turn baseline, (b) multi-turn replay with reasoning content present, (c) multi-turn replay where reasoning content is null (must remain null). Add an integration test using a mock OpenAI-compatible DeepSeek endpoint that returns 400 when reasoning_content is missing from the second request. Open PR. Stream A.
**Stream:** A

## 44 | spring-projects/spring-ai ✅ RESOLVED — duplicate work (community already fixed on upstream)
**Resolution (2026-06-09, session ENG-1780985406):** Upstream main has commit `a8a529515 Fix OpenAI options merging` which addresses the portable EmbeddingOptions.model/dimensions merge. Our fork branch `fix/issue-6042-embedding-options-merge` (commit `426a9a8d1`) is redundant. Not opening a PR. [BUG] OpenAI embedding model field on the generic `EmbeddingOptions` interface is silently ignored — when callers pass `EmbeddingOptions.builder().model("bge-multilingual-gemma2").build()` to `OpenAiEmbeddingModel.call(...)`, the request still uses the default `text-embedding-ada-002` and the upstream returns 503. Root cause: `OpenAiEmbeddingOptions.Builder.merge(...)` only copies fields when the runtime options are themselves an `OpenAiEmbeddingOptions` instance. When the request uses the portable `EmbeddingOptions.builder()`, common fields (`getModel()`, `getDimensions()`) are never merged into the request options, so the auto-configured default wins. This is the embeddings sibling of the ChatOptions-merging bugs (#5821, #6072). The fix path is identical (merge common fields before provider-specific ones) but lives in a different module, so the bug is currently invisible to anyone using the documented portable API. Issue #6042 (filed 2026-05-15, open, labels: bug / openai / options, assigned to @sdeleuze) — <https://github.com/spring-projects/spring-ai/issues/6042>
**What to do:** Update `OpenAiEmbeddingOptions.Builder.merge(EmbeddingOptions optionsToMerge, OpenAiEmbeddingOptions.Builder builderToMergeInto)` to copy the common `EmbeddingOptions#getModel()` and `getDimensions()` fields into the merged result before applying provider-specific overrides. Preserve existing OpenAI-specific field semantics (including `deploymentName` for Azure and `user` fields). Three unit tests required: (a) merge with portable `EmbeddingOptions` containing only `model` — verify model field is propagated, (b) merge with portable `EmbeddingOptions` containing only `dimensions` — verify dimensions field is propagated, (c) merge with both fields set, with both set on the builder too — verify later values win (no regression). One integration test: `OpenAiEmbeddingModel.call(new EmbeddingRequest(List.of("text"), EmbeddingOptions.builder().model("custom-model").build()))` — verify the outgoing request body has `"model": "custom-model"` not the default. Open PR. Stream A.
**Stream:** A

## 45 | spring-projects/spring-ai 🟢 PR OPEN (ENG, PR #6345)
**Resolution (2026-06-09, session ENG-1780985406):** Wrote fix in `WebClientStreamableHttpTransport` — added `isStatelessOk(ClientResponse)` helper that detects 2xx-without-SSE and routes it to `Flux.empty()` like the 405 path. New `WebClientStreamableHttpGetProbeIT` covers 3 cases (200+application/json, 200+no-Content-Type, 405); first two fail without the fix, all three pass with it. Existing `WebClientStreamableHttpTransportErrorHandlingIT` still passes. Branch `fix/issue-5239-streamable-get-probe` pushed to `redinside-dev/anuragg-saxenaa-spring-ai`. PR opened: https://github.com/spring-projects/spring-ai/pull/6345
**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,872
**Pain source:** [BUG, MCP streamable-http] Spring AI MCP client with `streamable-http` transport always parses the `GET /mcp` initialization response as SSE. When the server responds with normal HTTP 200 JSON (which is valid per the MCP streamable-http spec — server may return 200 OK with a JSON status body for the GET probe, and only return text/event-stream when actually streaming messages), initialization fails with `McpTransportException: Invalid SSE response. Status code: 200 Line: {"info":"return 200 for GET /mcp."}`. Stack trace: `ResponseSubscribers$SseLineSubscriber.hookOnNext(ResponseSubscribers.java:185)`. This makes Spring AI incompatible with valid MCP servers (e.g. ModelScope Model API MCP) that work correctly with other clients (VS Code Cline, Node-based clients). Pinning `mcp-core` to 0.17.1 works around it, but the underlying Spring AI behaviour is still wrong. Issue #5239 (open, status: waiting-for-triage) — <https://github.com/spring-projects/spring-ai/issues/5239>
**What to do:** In `ResponseSubscribers$SseLineSubscriber.hookOnNext` (and the equivalent in the WebFlux variant if the parsing logic was duplicated), change the validation strategy so the initial GET probe tolerates non-SSE 200 responses. Concretely:
- Detect the GET-probe path (or check `Content-Type` response header before assuming text/event-stream).
- Accept `application/json` (or no `text/event-stream` header) on the GET as a valid response — log it and complete the response future with no body. Stream validation should only run on the actual streaming request lifecycle.
- For POST requests that establish a stream, retain the existing strict SSE parsing.

Per the MCP spec, the server MUST return either `Content-Type: text/event-stream` on GET or `405 Method Not Allowed`. The Spring AI client should treat 200-without-SSE as a valid no-stream endpoint and continue. Add a regression test: a `streamable-http` MCP test server that returns `application/json` on GET and `text/event-stream` only on POST. Verify the client initializes successfully. Open PR. Stream A.
**Stream:** A

## 46 | spring-projects/spring-ai ✅ PR OPEN (spring-ai#6355)

**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,872
**Pain source:** [BUG, cross-cutting] With `stream() + ToolCallingAdvisor.streamToolCallResponses(true) + MessageChatMemoryAdvisor` (the default memory-outside-tool advisor order on Spring AI 2.0.0-RC1), a single tool-calling turn writes an `AssistantMessage` to memory that carries BOTH the final text AND the intermediate `tool_calls`. On the next turn's replay, OpenAI-compatible backends (DeepSeek, OpenAI) reject the request with HTTP 400: `An assistant message with 'tool_calls' must be followed by tool messages responding to each 'tool_call_id'.` This silently breaks the most common long-lived agent pattern: stream a tool-using turn, then ask a follow-up on the same conversation id. Reports from jewoodev on `main` (commit `1c03c394`) confirm it's the same bug class as #5167 (whose 1.1.8 backport is #6187) surfacing through the 2.0 `ToolCallingAdvisor` path. The default memory-outside-tool advisor order (`MessageChatMemoryAdvisor` order `HIGHEST_PRECEDENCE + 200` < `ToolCallingAdvisor` order `+300`) means the lower-order memory advisor wraps the tool advisor. When `streamToolCallResponses(true)`, the tool advisor's filter lets the tool-call round pass (`ToolCallingAdvisor.java:279-280`), so the concatenated multi-round flux — first response `concatWith` the recursion that re-streams after tool execution (`:276-278`, `:329-332`) — reaches the outer memory advisor. `MessageChatMemoryAdvisor.adviseStream` folds that whole flux through one `ChatClientMessageAggregator` (`:157-162`) and `after()` persists the result verbatim (`:137-146`). The aggregator is built to collapse ONE model call into a single `AssistantMessage`; it appends each chunk's text and accumulates each chunk's tool calls from both message and response metadata (`MessageAggregator.java:117-119`, `:147-151`, `:174-189`). Behaviour is correct for the single-call contract — the gap is that the memory advisor hands it a multi-round flux with no round boundary. Issue #6340 (filed 2026-06-08 by TonyJeans, open, status: waiting-for-triage, no PR, no milestone, 2 comments including a deep file:line trace by jewoodev) — <https://github.com/spring-projects/spring-ai/issues/6340>. Repro: Spring AI `2.0.0-RC1` + Spring Boot `4.0.3` + Java 25 + DeepSeek `deepseek-v4-flash` via `spring-ai-starter-model-deepseek`. TonyJeans' @Tool is a one-liner `getDateTime()`. Two-round repro in the issue: round 1 streams `"What time is it?"` (model calls tool, returns text), round 2 streams `"Thanks"` → HTTP 400.

**What to do:** Two valid fix shapes (per the issue body, both are acceptable to the reporter — TonyJeans now leans Shape B in their second comment; pick one and ship it):

**Shape A (lower-risk, narrower):** Add round-boundary awareness to `ChatClientMessageAggregator` (or replace its call in `MessageChatMemoryAdvisor.adviseStream` with a `Flux.scenario()`-aware variant). The key invariant: if any chunk in the flux carries `toolCalls`, the aggregator must emit a `MessageAggregator.AggregatedMessage` whose `assistantMessage.getToolCalls()` is non-empty AND emit a separate `ToolResponseMessage` per tool call so the persisted transcript contains a balanced `AssistantMessage(tool_calls=[…]) → ToolResponseMessage(…)` pair. If the model subsequently emits text after the tool round (the common case), the text becomes a SECOND `AssistantMessage(tool_calls=[])` after the `ToolResponseMessage`. Reference line numbers: `MessageAggregator.java:117-119`, `:147-151`, `:174-189`; `MessageChatMemoryAdvisor.java:137-146`, `:157-162`; `ToolCallingAdvisor.java:62-68`, `:276-280`, `:329-332`. The `concatWith` at `ToolCallingAdvisor.java:276-278` is the upstream source of the multi-round flux — a synthetic marker (`onLastToolResponse()`, or a `MessageType.SYNTHETIC_BOUNDARY`) at that point would let the outer memory advisor split the flux into multiple messages before folding.

**Shape B (cleaner, broader):** Per TonyJeans' own counter-proposal in the second comment, never persist tool round-trips at all. Two reasons given: (1) the assistant-`tool_calls` ↔ `tool` pairing is an intra-turn protocol structure already managed by `ToolCallingAdvisor` within a single turn, so it doesn't belong in cross-turn long-term memory; (2) tools have a real lifecycle (disabled / renamed / schema-changed / conditionally registered per request), so replaying a stale `tool_call` against a tool that no longer exists or has changed shape is a hallucination/400 waiting to happen. Concretely: ship a `ToolCallSanitizingChatMemory` decorator (or fold the sanitization into the default `MessageWindowChatMemory` build path) that, on `add(conversationId, messages)` and on `get(conversationId)`: (a) drops every `ToolResponseMessage`; (b) for any `AssistantMessage` carrying `toolCalls`, strips the `toolCalls` and keeps the text (or drops the message entirely if the text is null/empty after stripping). TonyJeans' example code in the comment is a clean starting point — `sanitize()` is ~15 lines, the decorator adds maybe 30 lines including the single-message `add` override that handles the "empty-after-sanitize" case so `delegate.add(conversationId, [])` doesn't blow up on strict repositories.

**Recommended approach: ship Shape B as the default + keep Shape A's round-boundary work as a follow-up.** Reasoning: (a) it is a one-line change for users to opt out (`new ToolCallSanitizingChatMemory(delegate)` in their `ChatMemory` bean), (b) it never breaks a working user (no risk of regressing the in-round tool-calling loop because the sanitization only happens at memory persistence boundary, not at the model-call boundary), (c) it matches the chat-history-as-natural-language contract that 99% of users expect when they wire `MessageChatMemoryAdvisor` to a `ChatClient`, (d) it generalizes beyond streaming to cover ALL tool-round-trip cases (single-shot, streaming, hybrid, future loops), and (e) it kills the related bug class — even if the aggregator is improved later, replaying stale tool_calls against tools that no longer exist is a separate footgun that Shape B also closes. Implement as a new class `org.springframework.ai.chat.memory.ToolCallSanitizingChatMemory` in the `spring-ai-model` module (or a new `spring-ai-chat-memory-sanitizer` module if a new module is preferred for the SPI), and register it as the default in `MessageWindowChatMemory.builder()` ONLY behind a feature flag (e.g. `spring.ai.chat.memory.sanitize-tool-calls=true` application property, default `true` for the 2.0.0-GA but `false` in 2.0.0-RC2/RC1 backport branches) so existing users don't see a behaviour change between RC1 and RC2.

**Acceptance tests (required, run all before opening PR):**
1. **No-network repro** — write a unit test using a mock `ChatModel` (no OpenAI/DeepSeek API key required). The mock should emit: a `ChatResponse` with `toolCalls=[getDateTime]` + finishReason=TOOL_EXECUTION, then a `ChatResponse` with text "It's 10:34 AM" + finishReason=STOP. Wire it into a `ChatClient` with `ToolCallingAdvisor.builder().streamToolCallResponses(true).build()` + `MessageChatMemoryAdvisor.builder(new ToolCallSanitizingChatMemory(MessageWindowChatMemory.builder().chatMemoryRepository(new InMemoryChatMemoryRepository()).build())).build()` + `@Tool`-annotated `Clock.getDateTime()`. Run `prompt().user("What time is it?").stream().chatResponse().blockLast()`. Then read memory: assert exactly `UserMessage("What time is it?")` + `AssistantMessage(text="It's 10:34 AM", toolCalls=[])` are present, with NO `ToolResponseMessage` and NO orphan `tool_calls`. Then run a follow-up `prompt().user("Thanks").stream().chatResponse().blockLast()` and assert no exception.
2. **Multi-round replay** — extend the above: capture the persisted memory snapshot between rounds, deserialize it, and feed it back into a fresh `ChatModel` request (mock or recording). Assert the wire format includes only `user + assistant(text)` and is accepted by an OpenAI-compatible backend (or a schema-validating stub that mimics the 400 check).
3. **Round-trip boundary test for Shape A** (if Shape A is also shipped as a follow-up): assert that the multi-round flux is split into 3 messages (assistant tool_calls + tool_response + assistant text) BEFORE the memory advisor's `after()` runs, by inspecting a `List<Message>` passed to a recording `ChatMemory` mock.
4. **Existing suite** — run `mvn -pl spring-ai-client-chat,spring-ai-model test` and ensure zero regressions on `MessageChatMemoryAdvisorTest`, `MessageWindowChatMemoryTest`, `ToolCallingAdvisorTest`, `OpenAiChatModelStreamingIT`, `DeepSeekChatModelIT`, `AnthropicChatModelIT`.
5. **DeepSeek wire-format integration test** — with `DEEPSEEK_API_KEY` set, run the issue's exact repro (`@EnabledIfEnvironmentVariable`). Expect: round 1 returns text "It's ...", round 2 returns text "You're welcome." (or similar) with NO 400. (Mirror of the issue's reproducer; this is the "release-blocker" test for the GA cut.)

**Out of scope for this PR:** changing the in-round tool-execution loop (Shape A's round-boundary work in `ToolCallingAdvisor` itself), changing the wire format the model sees, deprecating `MessageChatMemoryAdvisor`, touching the 1.1.x branch (separate backport — `#6187` is the backport issue, track separately).

**Open PR (Stream A, Java/Spring).** Branch name convention: `fix/issue-6340-tool-call-sanitizing-memory`. Push to fork `redinside-dev/anuragg-saxenaa-spring-ai` first; open PR against `spring-projects/spring-ai:main` only after CI green locally. Include the no-network repro test as the headline test in the PR description — it's the deterministic proof that should make the maintainers comfortable landing this without a live API key. Reference both #6340 and #5167 in the PR body (the latter for the historical lineage; #6187 for the 1.1.x backport context).
**Stream:** A

## 47 | spring-projects/spring-ai ✅ RESOLVED UPSTREAM (no PR needed)

**Stack:** Java/Spring
**Repo:** spring-projects/spring-ai
**Stars:** 8,872 (RC1 released 2026-06-06 → users only just started hitting this)
**Pain source:** [BUG, regression, RC2 milestone, maintainer-assigned] In Spring AI 2.0.0-RC1, `OpenAiChatModel` rejects the documented `toolChoice("required")` and `toolChoice("none")` string values with `UnsupportedOperationException: SDK version does not support typed 'required' toolChoice` at `OpenAiChatModel.createRequest(...)` line 796, even though the bundled `com.openai:openai-java-core:4.38.0` SDK exposes the exact constants it would need (`ChatCompletionToolChoiceOption$Auto.REQUIRED`, `.NONE`, and the `ofAuto(Auto)` factory). This is a clear regression from 2.0.0-M8, where `OpenAiChatOptions.builder().toolChoice("required")` worked end-to-end. The same code path also rejects `"none"`; only `"auto"`, a named-function choice, or a pre-built `ChatCompletionToolChoiceOption` are accepted. Issue #6332 (filed 2026-06-08 by @andrlange, open, labels: bug / tool calling / openai, assigned to @ilayaperumalg, milestone 2.0.0-RC2 created 2026-06-08, RC2 due 2026-06-09 — i.e. this is a release-blocker for the next RC) — <https://github.com/spring-projects/spring-ai/issues/6332>
**What to do:** ~~Map the `"required"` and `"none"` strings in `OpenAiChatModel.createRequest(...)` to `ChatCompletionToolChoiceOption.ofAuto(ChatCompletionToolChoiceOption.Auto.REQUIRED | Auto.NONE)` — exactly the same path the existing `"auto"` branch uses (per the issue body, `ofAuto(Auto.AUTO)` is already the call site, so this is a 2-line `if/else` change in the string→typed mapping). Behaviour after fix: `OpenAiChatOptions.builder().toolChoice("required")` works again; same for `"none"`; `"auto"` continues to work (no regression); named-function choices and pre-built `ChatCompletionToolChoiceOption` continue to work. Update the typed `instanceof` branch to also handle the "user typed a string by mistake" case (log a `WARN` rather than throw) for resilience. Add unit tests: (a) `toolChoice("required")` produces a request body with `"tool_choice": "required"` (or the SDK's equivalent typed form — match what the bundled openai-java-core 4.38.0 actually serialises), (b) `toolChoice("none")` produces `"tool_choice": "none"`, (c) `toolChoice("auto")` unchanged, (d) `toolChoice(ChatCompletionToolChoiceOption.ofAuto(Auto.REQUIRED))` still works (instanceof branch regression test), (e) `toolChoice(new ChatCompletionToolChoiceOption.Named(...))` still works (named-function branch regression test). Reference points: `OpenAiChatModel.java:796` (the throw site), the `createRequest(...)` method that maps string→`ChatCompletionToolChoiceOption` (the `instanceof` branch already handles the typed case per the workaround in the issue body), `OpenAiChatOptions.builder().toolChoice(String)` setter (no signature change needed). Wire-format test: round-trip the request through an OpenAI-compatible mock server (e.g. MockWebServer / WireMock) and assert the outgoing body contains the expected `tool_choice` field for each input form. Open PR against `spring-projects/spring-ai:main` on branch `fix/issue-6332-openai-toolchoice-required-none`. **Stream A, Java/Spring — Anurag's home turf. This is the highest-leverage Java AI contribution of the week: RC2 milestone, maintainer already engaged, clear fix path, regression test easy to write deterministically without a live API key. Title PR "GH-6332: Map toolChoice(\"required\"|\"none\") to typed ChatCompletionToolChoiceOption" and reference the issue in the body.~~

**Status: RESOLVED UPSTREAM — no PR from us needed.** The upstream-PR-check pattern caught this: as of 2026-06-09 06:43 EDT, commit `c8ea5a00` ("Support 'none' and 'required' tool_choice options in OpenAiChatModel" by guanxu, parent `836d691b`) is **already on upstream main**. PR #6338 (the closed PR by guanxu, branch `opanai-toolChoice`) was squash-merged into main. The fix is in `models/spring-ai-openai/src/main/java/org/springframework/ai/openai/OpenAiChatModel.java` at lines 797-803 and the `parseToolChoice(JsonNode)` static method (lines 834-844); tests `toolChoiceNone` and `toolChoiceRequired` were added to `OpenAiChatModelTests.java` (lines 136-149 and 151-163) asserting the new behavior. Issue #6332 is still open on GitHub (assigned to @ilayaperumalg, milestone 2.0.0-RC2) but the code fix is in. No action needed; reopening a duplicate PR would be noise.
**Stream:** A

## 48 | langchain4j/langchain4j ✅ PR OPEN (draft) — <https://github.com/langchain4j/langchain4j/pull/5398>

**Stack:** Java
**Repo:** langchain4j/langchain4j
**Stars:** ~7,500 (1.15.0 released 2026-06-06 → same RC1-style post-release discovery window as #47)
**Pain source:** [BUG] `DefaultAnthropicClient.createMessage(...)`'s `ServerSentEventListener.onEvent` deserialises the SSE event payload BEFORE inspecting `event.event()`. If any SSE frame carries a `data:` line that is not a JSON object mappable to `AnthropicStreamingData` (e.g. the terminal `data: [DONE]` sentinel emitted by OpenAI-compatible gateways / proxies in front of Claude, like LiteLLM, OpenRouter, custom Anthropic→OpenAI bridges), Jackson throws `com.fasterxml.jackson.databind.exc.MismatchedInputException: Cannot deserialize value of type …AnthropicStreamingData from Array value (token JsonToken.START_ARRAY)` from `Json.fromJson(...)` line 29 / `DefaultAnthropicClient$1.onEvent(...)` line 318. The exception is swallowed by `ServerSentEventListenerUtils.ignoringExceptions(...)`, but it pollutes logs, drops the trailing events after `[DONE]`, and aborts cleanly-formed SSE streams at the proxy boundary. The `OpenAI` SSE parser already drops `[DONE]` unfiltered; `DefaultServerSentEventParser` (the shared parser) does not, so the Anthropic client receives `[DONE]` and crashes. Issue #5384 (filed 2026-06-08 by @sterlp, open, label: bug, no PR, no assignee) — <https://github.com/langchain4j/langchain4j/issues/5384>. Reporter has a full stack trace, an OSGi-style log capture showing the exact 4-event sequence (`message_delta` → `message_stop` → `[DONE]` → swallowed exception), and a clear workaround (`add a non-strict parse path in onEvent`).
**What to do:** Two acceptable fix shapes (issue body leaves both open — pick the more defensive one and ship it):

**Shape A (narrow, in `DefaultAnthropicClient`):** in `onEvent(...)`, check `event.event()` (or `event.data()` content) BEFORE the `fromJson(event.data(), AnthropicStreamingData.class)` call. If the data is the literal `[DONE]` sentinel (or any non-JSON-object payload), skip the parse and short-circuit. Reference point: `DefaultAnthropicClient.java:318`. ~6 lines of code, no public API change.

**Shape B (broader, in `DefaultServerSentEventParser`):** make the shared SSE parser drop `data: [DONE]` frames the same way the OpenAI parser does. Reference point: `DefaultServerSentEventParser.java:28` (`lambda$parse$0`). This is the more correct fix because it stops `[DONE]` from ever reaching any client listener, not just the Anthropic one. ~3 lines of code, no public API change, but slightly wider blast radius — verify the change doesn't break any Anthropic or Bedrock or Vertex AI clients that might genuinely expect `[DONE]` to be forwarded.

**Recommended approach: ship Shape B + add a defensive guard in Shape A as belt-and-suspenders.** Reasoning: (a) `[DONE]` is a literal OpenAI-protocol convention; the MCP spec and Anthropic's native SSE spec do not emit it, but proxies in front of Anthropic do — and `DefaultServerSentEventParser` is the shared seam, (b) the regression risk in Shape B is bounded by checking that no other transport in `langchain4j-core` depends on receiving a `[DONE]` event verbatim (the existing `OpenAI` client's `OpenAiStreamingResponseBuilder` handles it but is upstream of the parser and discards the event, so it's fine), (c) Shape A then becomes a safety net for any non-JSON payload that isn't literally `[DONE]` (e.g. a future SSE extension, a proxy heartbeat), (d) both fixes are deterministic, no live API key needed for tests. Add unit tests: (1) SSE parser drops `data: [DONE]` — feed a 3-event stream `[message_delta, message_stop, [DONE]]` through `DefaultServerSentEventParser` and assert the listener only sees 2 events, (2) Anthropic client survives a `[DONE]`-terminated stream — feed the same 3-event stream into `DefaultAnthropicClient.createMessage(...)` and assert no exception escapes (current behaviour: silent log pollution; desired behaviour: clean exit with the assembled AiMessage), (3) regression — Anthropic client still parses a normal 3-event stream (message_start, content_block_delta, message_stop) without `[DONE]`, (4) regression — OpenAI streaming client still works (re-run its existing test suite). Open PR on branch `fix/issue-5384-anthropic-sse-done-sentinel`. **Stream A, Java — pure-Java fix in a 7.5K-star repo that just shipped its 1.15.0 release, so post-release bug-bash exposure is at peak. Anurag's 20 years of Java is exactly the right hammer.**

**Status: PR-OPEN (draft) — https://github.com/langchain4j/langchain4j/pull/5398.** Branch `fix/issue-5384-anthropic-sse-done-sentinel` on `anuragg-saxenaa/langchain4j`, head `2dd8a93b2` rebased on `upstream/main` (`4fdec4f2b`). 2 files changed, 85(+)/8(-). Decision: **shipped Shape A only, in the client listener** (matching the established convention used by `OpenAiStreamingResponseBuilder#onEvent` and `MistralAiServerSentEventListener#onEvent`). Shape B (parser-level) was intentionally not applied because the brief's premise was slightly off — the OpenAI client does NOT drop `[DONE]` at the parser level; it drops it at the listener level. Changing the shared parser would have wider blast radius and break parity with the OpenAI/Mistral convention. The new `isSkippableSseFrame(eventName, eventData)` guard in `DefaultAnthropicClient$1.onEvent` skips frames where `eventName == null`, `data == null/empty`, `data == "[DONE]"`, or `data` is not a JSON object. Raw `ServerSentEvent` still added to `rawServerSentEvents` for observability parity with the existing behavior. New test `DefaultAnthropicClientTest$StreamingTest#shouldIgnoreDoneSentinelAndUnknownEventFrames` was verified to fail on the unfixed code with the exact `MismatchedInputException: ... from Array value (token JsonToken.START_ARRAY)` from issue #5384, and pass on the fixed code. All 98 unit tests in `langchain4j-anthropic` pass. PR is draft per langchain4j's CONTRIBUTING.md guidance.
**Stream:** A
