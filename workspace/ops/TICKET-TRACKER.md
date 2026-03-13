*Recovery complete. System operational.*

---

# TICKET-TRACKER

## TICKET-20260313-002 (P0) — web_search API Quota Exceeded

| Field | Value |
|-------|-------|
| **ID** | TICKET-20260313-002 |
| **Priority** | P0 |
| **Status** | OPEN |
| **Created** | 2026-03-13 05:48 UTC |
| **Component** | web_search |
| **Error** | Perplexity API error (401): insufficient_quota |

**Details:**
- web_search returned 401 error: "You exceeded your current quota"
- This prevents all real-time web search functionality
- exec and read tools verified working

**Action Required:**
- Check Perplexity API billing at https://www.perplexity.ai/settings/api
- Consider switching to alternative search provider or adding credits

---

## TICKET-20260313-001 (P0) — Recursive Consultant Stall Cycle

| Field | Value |
|-------|-------|
| **ID** | TICKET-20260313-001 |
| **Priority** | P0 |
| **Status** | OPEN |
| **Assignee** | ENG (root cause) + OPS (break cycle) |
| **Created** | 2026-03-13T04:45:00Z |
| **SLA** | 30 min (P0) |
| **Summary** | Consultant daemon repeatedly detects "no task completions" and assigns OPS to inject work, but tasks never complete - recursive stall loop |
| **Root Cause** | Unknown - likely cron/jobs.json read failures causing tasks not to be created/executed |
| **Impact** | System non-functional - autonomous operation blocked |
| **Required Fix** | 1) ENG investigate cron/jobs.json read failure; 2) OPS break recursive loop; 3) Add circuit-breaker to consultant |

---

*Recovery complete. System operational.*

### TICKET-20260313-001
- **Status:** OPEN
- **Priority:** P2
- **Created:** 2026-03-13T08:13:50+00:00
- **SLA Deadline:** 2026-03-13T16:13:50+00:00 (8 hours)
- **Reporter:** ops (health-snapshot)
- **Assignee:** ops
- **Summary:** Recurring failure pattern detected (76x): <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=model_not_found provider=ollama/llama3.1:8b profile
- **Details:** Detected 76 occurrences in the last window. Examples:
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=model_not_found provider=ollama/llama3.1:8b profile
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=model_not_found provider=ollama/llama3.1:8b profile
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=model_not_found provider=ollama/llama3.1:8b profile
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=model_not_found provider=ollama/llama3.1:8b profile
- **Root Cause:** 
- **Resolution:** 
- **Learnings:** 
- **Resolved At:** 

### TICKET-20260313-002
- **Status:** OPEN
- **Priority:** P2
- **Created:** 2026-03-13T08:13:50+00:00
- **SLA Deadline:** 2026-03-13T16:13:50+00:00 (8 hours)
- **Reporter:** ops (health-snapshot)
- **Assignee:** ops
- **Summary:** Recurring failure pattern detected (75x): <ts>-04:00 [model-fallback/decision] model fallback decision: decision=candidate_failed requested=ollama/llama3.1:8b candidate=ollama/llama3.1:8b reason=model_not_found next=minimax/minimax-m2.5
- **Details:** Detected 75 occurrences in the last window. Examples:
  - <ts>-04:00 [model-fallback/decision] model fallback decision: decision=candidate_failed requested=ollama/llama3.1:8b candidate=ollama/llama3.1:8b reason=model_not_found next=minimax/minimax-m2.5
  - <ts>-04:00 [model-fallback/decision] model fallback decision: decision=candidate_failed requested=ollama/llama3.1:8b candidate=ollama/llama3.1:8b reason=model_not_found next=minimax/minimax-m2.5
  - <ts>-04:00 [model-fallback/decision] model fallback decision: decision=candidate_failed requested=ollama/llama3.1:8b candidate=ollama/llama3.1:8b reason=model_not_found next=minimax/minimax-m2.5
  - <ts>-04:00 [model-fallback/decision] model fallback decision: decision=candidate_failed requested=ollama/llama3.1:8b candidate=ollama/llama3.1:8b reason=model_not_found next=minimax/minimax-m2.5
- **Root Cause:** 
- **Resolution:** 
- **Learnings:** 
- **Resolved At:** 

### TICKET-20260313-003
- **Status:** OPEN
- **Priority:** P2
- **Created:** 2026-03-13T08:13:50+00:00
- **SLA Deadline:** 2026-03-13T16:13:50+00:00 (8 hours)
- **Reporter:** ops (health-snapshot)
- **Assignee:** ops
- **Summary:** Recurring failure pattern detected (62x): <ts>-04:00 [tools] web_search failed: perplexity api error (401): {"error":{"message":"you exceeded your current quota, please check your plan and billing details. for more information, visit https://w
- **Details:** Detected 62 occurrences in the last window. Examples:
  - <ts>-04:00 [tools] web_search failed: perplexity api error (401): {"error":{"message":"you exceeded your current quota, please check your plan and billing details. for more information, visit https://w
  - <ts>-04:00 [tools] web_search failed: perplexity api error (401): {"error":{"message":"you exceeded your current quota, please check your plan and billing details. for more information, visit https://w
  - <ts>-04:00 [tools] web_search failed: perplexity api error (401): {"error":{"message":"you exceeded your current quota, please check your plan and billing details. for more information, visit https://w
  - <ts>-04:00 [tools] web_search failed: perplexity api error (401): {"error":{"message":"you exceeded your current quota, please check your plan and billing details. for more information, visit https://w
- **Root Cause:** 
- **Resolution:** 
- **Learnings:** 
- **Resolved At:** 

### TICKET-20260313-004
- **Status:** OPEN
- **Priority:** P2
- **Created:** 2026-03-13T08:13:50+00:00
- **SLA Deadline:** 2026-03-13T16:13:50+00:00 (8 hours)
- **Reporter:** ops (health-snapshot)
- **Assignee:** ops
- **Summary:** Recurring failure pattern detected (37x): <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=auth provider=minimax/minimax-m2.5 profile=-
- **Details:** Detected 37 occurrences in the last window. Examples:
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=auth provider=minimax/minimax-m2.5 profile=-
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=auth provider=minimax/minimax-m2.5 profile=-
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=auth provider=minimax/minimax-m2.5 profile=-
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=auth provider=minimax/minimax-m2.5 profile=-
- **Root Cause:** 
- **Resolution:** 
- **Learnings:** 
- **Resolved At:** 

### TICKET-20260313-005
- **Status:** OPEN
- **Priority:** P1
- **Created:** 2026-03-13T08:13:50+00:00
- **SLA Deadline:** 2026-03-13T10:13:50+00:00 (2 hours)
- **Reporter:** ops (health-snapshot)
- **Assignee:** ops
- **Summary:** Recurring failure pattern detected (26x): <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=timeout provider=9router/free-unlimited profile=-
- **Details:** Detected 26 occurrences in the last window. Examples:
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=timeout provider=9router/free-unlimited profile=-
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=timeout provider=9router/free-unlimited profile=-
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=timeout provider=9router/free-unlimited profile=-
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=timeout provider=9router/free-unlimited profile=-
- **Root Cause:** 
- **Resolution:** 
- **Learnings:** 
- **Resolved At:** 

### TICKET-20260313-006
- **Status:** OPEN
- **Priority:** P2
- **Created:** 2026-03-13T10:43:09+00:00
- **SLA Deadline:** 2026-03-13T18:43:09+00:00 (8 hours)
- **Reporter:** ops (health-snapshot)
- **Assignee:** ops
- **Summary:** Recurring failure pattern detected (79x): <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=model_not_found provider=ollama/llama3.1:8b profile
- **Details:** Detected 79 occurrences in the last window. Examples:
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=model_not_found provider=ollama/llama3.1:8b profile
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=model_not_found provider=ollama/llama3.1:8b profile
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=model_not_found provider=ollama/llama3.1:8b profile
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=model_not_found provider=ollama/llama3.1:8b profile
- **Root Cause:** 
- **Resolution:** 
- **Learnings:** 
- **Resolved At:** 

### TICKET-20260313-007
- **Status:** OPEN
- **Priority:** P2
- **Created:** 2026-03-13T10:43:09+00:00
- **SLA Deadline:** 2026-03-13T18:43:09+00:00 (8 hours)
- **Reporter:** ops (health-snapshot)
- **Assignee:** ops
- **Summary:** Recurring failure pattern detected (78x): <ts>-04:00 [model-fallback/decision] model fallback decision: decision=candidate_failed requested=ollama/llama3.1:8b candidate=ollama/llama3.1:8b reason=model_not_found next=minimax/minimax-m2.5
- **Details:** Detected 78 occurrences in the last window. Examples:
  - <ts>-04:00 [model-fallback/decision] model fallback decision: decision=candidate_failed requested=ollama/llama3.1:8b candidate=ollama/llama3.1:8b reason=model_not_found next=minimax/minimax-m2.5
  - <ts>-04:00 [model-fallback/decision] model fallback decision: decision=candidate_failed requested=ollama/llama3.1:8b candidate=ollama/llama3.1:8b reason=model_not_found next=minimax/minimax-m2.5
  - <ts>-04:00 [model-fallback/decision] model fallback decision: decision=candidate_failed requested=ollama/llama3.1:8b candidate=ollama/llama3.1:8b reason=model_not_found next=minimax/minimax-m2.5
  - <ts>-04:00 [model-fallback/decision] model fallback decision: decision=candidate_failed requested=ollama/llama3.1:8b candidate=ollama/llama3.1:8b reason=model_not_found next=minimax/minimax-m2.5
- **Root Cause:** 
- **Resolution:** 
- **Learnings:** 
- **Resolved At:** 

### TICKET-20260313-008
- **Status:** OPEN
- **Priority:** P2
- **Created:** 2026-03-13T10:43:09+00:00
- **SLA Deadline:** 2026-03-13T18:43:09+00:00 (8 hours)
- **Reporter:** ops (health-snapshot)
- **Assignee:** ops
- **Summary:** Recurring failure pattern detected (76x): <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=auth provider=minimax/minimax-m2.5 profile=-
- **Details:** Detected 76 occurrences in the last window. Examples:
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=auth provider=minimax/minimax-m2.5 profile=-
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=auth provider=minimax/minimax-m2.5 profile=-
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=auth provider=minimax/minimax-m2.5 profile=-
  - <ts>-04:00 [agent/embedded] embedded run failover decision: runid=<uuid> stage=assistant decision=fallback_model reason=auth provider=minimax/minimax-m2.5 profile=-
- **Root Cause:** 
- **Resolution:** 
- **Learnings:** 
- **Resolved At:** 

### TICKET-20260313-009
- **Status:** OPEN
- **Priority:** P2
- **Created:** 2026-03-13T10:43:09+00:00
- **SLA Deadline:** 2026-03-13T18:43:09+00:00 (8 hours)
- **Reporter:** ops (health-snapshot)
- **Assignee:** ops
- **Summary:** Recurring failure pattern detected (53x): <ts>-04:00 [tools] web_search failed: perplexity api error (401): {"error":{"message":"you exceeded your current quota, please check your plan and billing details. for more information, visit https://w
- **Details:** Detected 53 occurrences in the last window. Examples:
  - <ts>-04:00 [tools] web_search failed: perplexity api error (401): {"error":{"message":"you exceeded your current quota, please check your plan and billing details. for more information, visit https://w
  - <ts>-04:00 [tools] web_search failed: perplexity api error (401): {"error":{"message":"you exceeded your current quota, please check your plan and billing details. for more information, visit https://w
  - <ts>-04:00 [tools] web_search failed: perplexity api error (401): {"error":{"message":"you exceeded your current quota, please check your plan and billing details. for more information, visit https://w
  - <ts>-04:00 [tools] web_search failed: perplexity api error (401): {"error":{"message":"you exceeded your current quota, please check your plan and billing details. for more information, visit https://w
- **Root Cause:** 
- **Resolution:** 
- **Learnings:** 
- **Resolved At:** 

### TICKET-20260313-010
- **Status:** OPEN
- **Priority:** P2
- **Created:** 2026-03-13T10:43:09+00:00
- **SLA Deadline:** 2026-03-13T18:43:09+00:00 (8 hours)
- **Reporter:** ops (health-snapshot)
- **Assignee:** ops
- **Summary:** Recurring failure pattern detected (26x): <ts>-04:00 [model-fallback/decision] model fallback decision: decision=candidate_failed requested=ollama/llama3.1:8b candidate=minimax/minimax-m2.5 reason=auth next=9router/cx/gpt-5.3-codex
- **Details:** Detected 26 occurrences in the last window. Examples:
  - <ts>-04:00 [model-fallback/decision] model fallback decision: decision=candidate_failed requested=ollama/llama3.1:8b candidate=minimax/minimax-m2.5 reason=auth next=9router/cx/gpt-5.3-codex
  - <ts>-04:00 [model-fallback/decision] model fallback decision: decision=candidate_failed requested=ollama/llama3.1:8b candidate=minimax/minimax-m2.5 reason=auth next=9router/cx/gpt-5.3-codex
  - <ts>-04:00 [model-fallback/decision] model fallback decision: decision=candidate_failed requested=ollama/llama3.1:8b candidate=minimax/minimax-m2.5 reason=auth next=9router/cx/gpt-5.3-codex
  - <ts>-04:00 [model-fallback/decision] model fallback decision: decision=candidate_failed requested=ollama/llama3.1:8b candidate=minimax/minimax-m2.5 reason=auth next=9router/cx/gpt-5.3-codex
- **Root Cause:** 
- **Resolution:** 
- **Learnings:** 
- **Resolved At:** 

---

## RESEARCH COMMENTS — 2026-03-13 11:20 UTC

### Comment on TICKET-20260313-003 / TICKET-20260313-009 (web_search 401 insufficient_quota)
- **Research status:** External web validation blocked because `web_search` itself is failing with quota exhaustion (confirmed repeatedly in this run).
- **Likely root cause:** Perplexity API credits/quota exhausted or budget cap reached.
- **Recommended fix:**
  1. Re-enable quota in Perplexity API billing (`https://www.perplexity.ai/settings/api`).
  2. Add usage alerting + hard/soft budget thresholds.
  3. Add a provider health gate so failed search provider is temporarily suppressed instead of retried in a tight loop.
  4. Add fallback path for critical workflows (direct `web_fetch` on known URLs or secondary search provider).
- **Suggested owner:** OPS

### Comment on TICKET-20260313-006 / TICKET-20260313-007 (ollama/llama3.1:8b model_not_found)
- **Likely root cause:** Model candidate configured but unavailable on host (`model_not_found` flood).
- **Recommended fix:**
  1. Verify model inventory and pull missing model (`ollama pull llama3.1:8b`) on node(s) expected to serve it.
  2. Add preflight model availability check at startup and remove unavailable candidates from fallback chain.
  3. Emit a single deduplicated alert per missing model per interval to reduce noise.
- **Suggested owner:** OPS + ENG

### Comment on TICKET-20260313-008 / TICKET-20260313-010 (minimax auth fallback failures)
- **Likely root cause:** Invalid/expired API credentials or provider account authorization mismatch.
- **Recommended fix:**
  1. Rotate/verify minimax credential in gateway config/environment.
  2. Run provider auth smoke test at deploy time.
  3. Temporarily disable minimax candidate in fallback policy until auth passes.
- **Suggested owner:** OPS

### Comment on TICKET-20260313-005 (9router/free-unlimited timeout spikes)
- **Likely root cause:** Provider latency saturation under failover load.
- **Recommended fix:**
  1. Lower per-attempt timeout and cap retries for this provider.
  2. Move healthy paid fallback earlier for P1/P0 paths.
  3. Add timeout SLO alerting (rate + p95 latency).
- **Suggested owner:** ENG + OPS
