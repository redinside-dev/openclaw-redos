| 2026-04-18 | local: agent-config-governor | NEW | https://github.com/anuragg-saxenaa/agent-config-governor | Team config governance CLI for AI coding agents — init/pull/push/drift/validate/audit, Zod schema, YAML store, JSONL audit trail, GitHub Actions CI
| 2026-04-18 | contrib: decolua/9router#668 | https://github.com/decolua/9router/pull/669 | fix: update default models for codex/nvidia-nim/gemini-cli per issue #668 |
| 2026-04-18 | contrib: decolua/9router#496 | https://github.com/decolua/9router/pull/671 | fix: always fetch remote /models for compatible providers without static models (closes #496)
| 2026-04-18 | spring-ai | ChatClient toolCalls empty fix (backlog #21) | PR#5818 | https://github.com/spring-projects/spring-ai/pull/5818 | Fix: propagate toolCallbacks in DefaultChatClientUtils.toChatClientRequest()
| 2026-04-18 | contrib: decolua/9router#578 | https://github.com/decolua/9router/pull/674 | fix: resolve ollama-local baseUrl from providerSpecificData.baseUrl for remote Ollama hosts (closes #578)
| 2026-04-18 | contrib: decolua/9router#557 | https://github.com/decolua/9router/pull/676 | fix: strip stream_options for non-streaming Qwen requests
| 2026-04-18 | contrib: decolua/9router#593 | https://github.com/decolua/9router/pull/677 | fix: allow per-connection refresh lead time override via providerSpecificData.refreshLeadMs (closes #593)
| 2026-04-18 | contrib: decolua/9router#554 | https://github.com/decolua/9router/pull/678 | fix: show language dropdown for local-device TTS to pick voice language (closes #554)
| 2026-04-18 | contrib: quarkusio/quarkus#53645 | https://github.com/quarkusio/quarkus/pull/53687 | fix: undertow compression uses addHeadersEndHandler instead of addEndHandler
| 2026-04-18 | contrib: decolua/9router#681 | https://github.com/decolua/9router/pull/682 | fix: add Ollama Cloud to usage/quota tracking
| 2026-04-18 | contrib: decolua/9router#572 | https://github.com/decolua/9router/pull/683 | fix: update Qwen OAuth URLs from chat.qwen.ai to qwen.ai (closes #572)
| 2026-04-18 | contrib: decolua/9router#545 | https://github.com/decolua/9router/pull/684 | fix: strip thinking/response_format/store params in Kiro executor to fix Claude Code 400 error (closes #545)
| 2026-04-18 | contrib: decolua/9router#533 | https://github.com/decolua/9router/pull/686 | strip enumDescriptions from Cursor tool schemas
| 2026-04-18 | decolua/9router: no fixable issue this run | — | All ~55 open issues covered by 39 existing open PRs; remaining issues are questions, vague reports, or require external changes| 2026-04-18 | contrib: decolua/9router#574 | https://github.com/decolua/9router/pull/687 | fix: update Qwen OAuth URLs from chat.qwen.ai to qwen.ai |
| 2026-04-19 | contrib: decolua/9router#none | — | No fixable issues: 670=user local auth misconfig, 561=model behavior (not 9router bug), 626=feature request, 607=question, 574/572/578/662 already have PRs |
| 2026-04-18 | contrib: decolua/9router#557 | https://github.com/decolua/9router/pull/688 | strip stream_options for non-streaming Qwen requests to avoid 400 error |
| 2026-04-19 | contrib: decolua/9router#598 | https://github.com/decolua/9router/pull/689 | fix: make version update banner in sidebar clickable to copy install command (closes #598)
| 2026-04-19 | contrib: decolua/9router#593 | https://github.com/decolua/9router/pull/690 | fix: allow per-connection refresh lead time override via providerSpecificData.refreshLeadMs (closes #593)
| 2026-04-18 | contrib: decolua/9router#643 | https://github.com/decolua/9router/pull/692 | fix: force Agent mode in Cursor protobuf when User-Agent contains Claude Code (closes #643) |
| 2026-04-19 | contrib: decolua/9router#694 | https://github.com/decolua/9router/pull/695 | fix: detect server OS instead of browser OS for MITM sudo modal — fixes WSL2+Windows browser false-positive (closes #694) |

| 2026-04-19 | contrib: decolua/9router#696 | https://github.com/decolua/9router/pull/698 | fix: add execCommand fallback for clipboard when navigator.clipboard is unavailable (closes #696) |
| 2026-04-19 | contrib: decolua/9router#696 | https://github.com/decolua/9router/pull/699 | fix: add clipboard fallback for navigator.clipboard unavailable contexts |
| 2026-04-19 | langchain4j | guardrailName() for GuardrailExecutedEvent (#4938) | PR#3 | https://github.com/anuragg-saxenaa/anuragg-saxenaa-langchain4j/pull/3 | Add guardrailName() + Guardrail.name() for decorator-aware observability |
| 2026-04-19 | contrib: decolua/9router#696 | https://github.com/decolua/9router/pull/700 | fix: add navigator.clipboard fallback for SSR/non-HTTPS environments |

## spring-ai-graph MVP — 2026-04-19
- **Issue:** spring-projects/spring-ai#5826
- **Repo:** https://github.com/anuragg-saxenaa/spring-ai-graph
- **PR:** https://github.com/anuragg-saxenaa/spring-ai-graph/pull/1
- **Branch:** mvp-pr (main has the code)
- **Status:** PR OPEN
- **What:** Agent orchestration module — AgentState, @AgentNode, AgentGraph builder, Checkpointer, InterruptHandler
- **Files:** 12 files, 849 lines
- **Spec:** MVP only, 0 external deps, JdbcCheckpointer and @Interrupt integration are next steps
| 2026-04-19 | contrib: decolua/9router#696 | https://github.com/decolua/9router/pull/701 | fix: add navigator.clipboard fallback for SSR/non-HTTPS environments |

## 2026-04-19 Run - 2 PRs

### PR #703 (fix/issue-585-preserve-usage-data-on-update)
- **Issue**: #585 — Usage data resets to 0 after updates
- **Root cause**: `npm install -g 9router@latest` replaces bundled `app/` which ships with empty LowDB; `~/.9router/usage.json` survives but the app reinitializes with default state on first run after install
- **Fix**: Added `usage.json.bak` backup — restore on init if main DB missing, backup on every write
- **Lines**: +58 in `src/lib/usageDb.js`
- **URL**: https://github.com/decolua/9router/pull/703

### PR #702 (fix/issue-681-ollama-cloud-stats-2)
- **Issue**: #681 — Ollama Cloud usage stats mixed with local Ollama
- **Root cause**: Both cloud and local share `provider='ollama'` key
- **Fix**: Use `provider='ollama-cloud'` when `connection.apiHost` is not a local address
- **Lines**: ~+40 across `src/app/api/v1/chat/completions/route.js`, `src/shared/utils/cost.js`, `src/app/api/models/route.js`, `src/lib/usageDb.js`
- **URL**: https://github.com/decolua/9router/pull/702

### Issues investigated but NOT fixed
- **#597**: Blocked — upstream WAF on `rwbwbll.9router.com` rejects SDK headers; not a code fix in this repo
- **#598**: Already addressed by multiple merged PRs
- **#593**: Already addressed by merged PR #690
- **#694**: Already addressed by open PR #695

| 2026-04-19 | contrib: decolua/9router#597 | https://github.com/decolua/9router/pull/704 | fix: strip OpenAI SDK metadata headers to allow SDK requests |
