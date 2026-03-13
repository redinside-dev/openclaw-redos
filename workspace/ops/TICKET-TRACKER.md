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
