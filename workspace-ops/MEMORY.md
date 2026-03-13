# MEMORY.md - OPS Long-Term Memory

## Critical System Issues (2026-03-13)

### P0 Critical Incidents

**TICKET-20260313-002: web_search Perplexity quota exhausted**
- **Issue**: 401 authentication failures from Perplexity API
- **Root Cause**: Billing quota exceeded or invalid API key
- **Impact**: All research operations blocked
- **SLA**: Requires human intervention from Anurag
- **Action Taken**: None yet - requires billing check at perplexity.ai/settings/api

**TICKET-20260313-001: Consultant recursive stall**
- **Issue**: System cannot self-heal from recursive failures
- **Root Cause**: Unknown - possibly configuration or model issues
- **Impact**: Primary system management compromised
- **SLA**: High priority investigation needed

### P1 Issues (Active)

**TICKET-20260313-005: 9router/free-unlimited timeouts**
- **Issue**: 26 consecutive timeout failures
- **Models Affected**: free-unlimited
- **Impact**: Agent operations delayed
- **Current Status**: Under investigation

**TICKET-20260313-006/007: ollama/llama3.1:8b model_not_found**
- **Issue**: 79 consecutive model not found errors
- **Models Affected**: llama3.1:8b
- **Root Cause**: Model not pulled or Ollama not running
- **Action Needed**: `ollama pull llama3.1:8b` or verify Ollama status

**TICKET-20260313-008/010: minimax auth failures**
- **Issue**: 76 consecutive authentication failures
- **Service**: Minimax AI
- **Root Cause**: Invalid credentials or service configuration
- **Action Needed**: Verify credentials in gateway config

## System Configuration

### Gateway Status
- **Running**: Yes (PID 11258)
- **Port**: 18789
- **Control UI**: Blocked (missing allowedOrigins config)
- **SLA**: P2 - Fix within 8 hours

### Ollama Status
- **Running**: Yes
- **Models Available**: qwen3.5:4b
- **Issue**: Missing llama3.1:8b (required by some agents)
- **SLA**: P1 - Pull model immediately

### Memory Systems
- **Memory Search**: Circuit breaker activated (30+ failures)
- **Ollama Embeddings**: Failed (qwen3.5:4b doesn't support embeddings)
- **Impact**: Research operations degraded

## Recent Actions Taken

- **2026-03-13 08:15**: Detected critical incident, read TICKET-TRACKER.md
- **2026-03-13 08:15**: Identified 10 open tickets requiring attention
- **2026-03-13 08:15**: Prioritized P0 issues (web_search and consultant)
- **2026-03-13 08:15**: Prepared Telegram alert for Anurag if needed

## Next Steps

1. **Immediate**: Fix web_search issue (requires human intervention)
2. **High Priority**: Investigate consultant recursive stall
3. **Medium Priority**: Pull ollama/llama3.1:8b model
4. **Medium Priority**: Fix minimax authentication
5. **Update**: TICKET-TRACKER.md with progress

## Lessons Learned

- Web_search circuit breaker prevents infinite retry loops but blocks all research
- Missing models cause cascading failures across multiple agents
- Authentication failures need immediate credential verification
- Critical incidents require clear escalation paths
- Human intervention required for billing/subscription issues