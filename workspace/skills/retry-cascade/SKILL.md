# Retry Cascade Skill

## Purpose
Automatically recover from task failures through a 4-level retry strategy before escalating to the human owner.

## Trigger
A task failure is detected when:
- Model API returns an error (timeout, rate limit, 500)
- Agent output fails verification (empty, corrupt, wrong format)
- Task exceeds its timeout_seconds without producing output
- Agent explicitly reports failure

## Cascade Levels

### Level 1: Same Model Retry
**Wait:** 15 seconds
**Why:** Transient errors (rate limit cooldown, network blip, random bad output)
**Action:**
1. Wait 15 seconds
2. Re-send exact same prompt to exact same model
3. Log: `{action: "retry", level: 1, model: "{same}", reason: "{error}"}`
4. Success → continue pipeline
5. Fail → Level 2

### Level 2: Fallback Model Swap
**Wait:** 0 seconds (immediate)
**Why:** Primary model may be down, overloaded, or unsuitable for this specific task
**Action:**
1. Get fallback_chain from the routing decision log
2. Use fallback_chain[0] (first fallback)
3. Re-send same prompt to fallback model
4. Log: `{action: "retry", level: 2, from: "{primary}", to: "{fallback}"}`
5. Success → continue pipeline (note: may affect cost if fallback is payg)
6. Fail → Level 3

### Level 3: Tier Escalation
**Wait:** 0 seconds (immediate)
**Why:** Task may genuinely need a smarter model than originally assigned
**Action:**
1. Determine escalation target based on task type:
   - needs_code → escalate to claude-code/sonnet-4.5 (Tier 5)
   - needs_reasoning → escalate to openai-codex/gpt-5.2 (Tier 4)
   - needs_web → try a different Perplexity tier
   - general → go one tier up from current
2. **Budget check first:** if escalation target is payg AND daily budget > 80%, skip to Level 4
3. If escalation target is subscription → always proceed (no extra cost)
4. Re-send same prompt to escalated model
5. Log: `{action: "retry", level: 3, escalated_to: "{tier}", model: "{model}"}`
6. Success → continue (update cost tracking)
7. Fail → Level 4

### Level 4: Prompt Rewrite by RED
**Wait:** 0 seconds
**Why:** The prompt itself may be ambiguous, too complex, or malformed
**Action:**
1. Send failure context to RED (CEO agent):
   ```
   Task {task_id} has failed 3 times. Please rewrite the prompt.
   
   Original prompt: {prompt}
   Error from attempt 1: {error_1}
   Error from attempt 2: {error_2}
   Error from attempt 3: {error_3}
   Models tried: {list}
   
   Please:
   - Simplify the request
   - Break into smaller sub-tasks if needed
   - Add clarifying context
   - Return the rewritten prompt
   ```
2. RED rewrites the prompt (uses its own Codex model — subscription, no cost)
3. Re-dispatch rewritten prompt to best available model
4. Log: `{action: "retry", level: 4, rewritten: true}`
5. Success → continue pipeline
6. Fail → Level 5 (human)

### Level 5: Human Escalation (FINAL)
**Action:**
1. Send Telegram message to owner:
   ```
   ⚠️ Task {task_id} failed after 4 retry attempts.
   
   Project: {project_id} — {project_title}
   Task: {task_title}
   Models tried: {model_1}, {model_2}, {model_3}
   Errors: {summary of errors}
   
   Reply with:
   • New instructions to retry
   • "skip" to skip this task and continue
   • "cancel" to cancel the entire project
   ```
2. Set task status → "blocked"
3. Set project blocker in state.json
4. Continue executing other non-dependent tasks in the project
5. Wait for human response

## Cost Protection During Retries
- Level 1 (same model): zero extra cost
- Level 2 (fallback): check if fallback is payg → add to cost tracking
- Level 3 (tier escalation): if target is subscription → free. If payg → check budget
- Level 4 (RED rewrite): uses RED's Codex subscription → free
- NEVER bust the daily budget on retries — if budget > 90%, skip payg retries

## Logging
Every retry attempt → workspace/logs/audit.jsonl:
```json
{
  "ts": "ISO-8601",
  "action": "retry",
  "level": 2,
  "task_id": "T-003",
  "project_id": "PROJ-20260211-001",
  "original_model": "zai/glm-4.7",
  "retry_model": "moonshot/kimi-k2.5",
  "error": "Timeout: no output after 300 seconds",
  "result": "success|fail"
}
```
