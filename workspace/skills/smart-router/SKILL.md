# Smart Router Skill

## Purpose
Select the optimal model for each task based on requirements, available resources, cost, and quality. Runs AFTER HATAKE parses, BEFORE dispatching to agents.

## Input
- HATAKE brief (JSON)
- Active routing profile (from workspace/config/routing-profiles.json)
- Model registry (from workspace/config/model-registry.json)
- Budget state (from workspace/logs/cost-events.jsonl — today's spend)
- Ollama status (from workspace/tmp/ollama-status.json)

## Output
Execution plan with model assignment per task. Append routing decision to workspace/logs/routing-decisions.jsonl.

## Routing Algorithm

### Step 1: Map Requirements → Capabilities

| Brief Field | Required Model Capabilities | Minimum Tier |
|---|---|---|
| needs_code + complexity >= complex | code, multi_file, agentic | 5 (Claude Code) |
| needs_code + complexity < complex | code | 2+ |
| needs_web + needs_realtime_data | web_search, realtime | 3 (Perplexity) |
| needs_web only | web_search | 3 (Perplexity) |
| needs_realtime_data + reasoning needed | realtime, reasoning | 3 (Pplx Reasoning) |
| complexity = complex/epic, no code | reasoning, planning | 4 (Codex) |
| complexity = simple, no special needs | general | 1 (Ollama) |
| estimated_context > 131072 | long_context | 2 (Moonshot) |

### Step 2: Filter Compatible Models

From model-registry.json, keep only models where:
```
model.capabilities ⊇ required_capabilities
AND model.contextWindow >= brief.estimated_context_tokens
AND model.status == "available"
AND model.currentConcurrent < model.maxConcurrent
```

Apply mode restrictions:
- If profile == "local_only": provider must be "ollama"
- If daily_spend > budget × 0.9: exclude payg models (subscription only)
- If Ollama status == "down": exclude all ollama/* models

### Step 3: Score Remaining Candidates

```
quality_match = 1.0 - abs(model.quality - required_quality) / 10
speed_match   = brief.priority == "urgent" ? model.speed / 10 : 0.7
cost_value    = model.perCallCost == 0 ? 1.0 : (1.0 - model.cost / 5.0)

score = (quality_match × profile.weights.quality)
      + (speed_match   × profile.weights.speed)
      + (cost_value    × profile.weights.cost)
```

### Step 4: Select Primary + Fallback Chain

```
primary    = highest scoring candidate
fallback_1 = second highest (same or adjacent tier)
fallback_2 = best available in next tier up
fallback_3 = Tier 5 (claude-code) for code tasks
             Tier 4 (codex) for reasoning tasks
             Tier 3 (pplx) for search tasks
```

### Step 5: Log Decision

Append to workspace/logs/routing-decisions.jsonl:
```json
{
  "ts": "2026-02-11T14:30:00Z",
  "brief_id": "BRIEF-20260211-143000",
  "task_id": "T-001",
  "agent": "eng",
  "selected_model": "claude-code/sonnet-4.5",
  "score": 0.89,
  "profile": "balanced",
  "alternatives": [
    {"model": "openai-codex/gpt-5.2", "score": 0.82},
    {"model": "moonshot/kimi-k2.5", "score": 0.71}
  ],
  "fallback_chain": ["openai-codex/gpt-5.2", "moonshot/kimi-k2.5"],
  "reason": "needs_code=true, complexity=complex → Tier 5 Claude Code. Free (Pro sub).",
  "estimated_cost": 0.00,
  "ollama_status": "up",
  "daily_spend_so_far": 0.42
}
```

## Priority Rules (override scoring when applicable)

1. **ALL complex coding → Claude Code CLI (Tier 5).** No exceptions. It's free and the best coder.
2. **ALL real-time data → Perplexity (Tier 3).** Never use stale training data for current info.
3. **Architecture/planning → Codex gpt-5.2 (Tier 4).** 400K context, best for reasoning.
4. **Simple parse/format → Ollama (Tier 1) or Z.AI Flash (Tier 2).** Don't waste premium models.
5. **Ollama down → Z.AI flashx immediate fallback.** Don't queue, don't wait.
6. **Budget > 90% → subscription models only.** Never bust the budget with payg.
7. **sonar-reasoning is limited — use ONLY for tasks that need both web data AND chain-of-thought analysis.** Quick lookups → sonar. Research → sonar-pro.

## Codex Session Management
- Pro #1 → assigned to RED (CEO). Always available for RED.
- Pro #2 → assigned to ZEN (CSO). Always available for ZEN.
- Plus → shared pool. Available for ENG planning, OPS escalation.
- If all 3 busy → QUEUE the task. Don't fallback to expensive API.

## Multi-Model Chaining
For complex multi-department tasks, assign different models per step:
```
Example: "Research competitors then build a comparison dashboard"
  Step 1: RESEARCH → perplexity/sonar-pro (gather data)
  Step 2: RED      → openai-codex/gpt-5.2 (plan dashboard)
  Step 3: ENG      → claude-code/sonnet-4.5 (build dashboard)
  Step 4: OPS      → zai/glm-4.7 (validate)
```
