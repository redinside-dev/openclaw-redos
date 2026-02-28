# Skill: idea-validator

**Pre-build gate for ENG — validate ideas before writing code.**

Inspired by awesome-openclaw-usecases idea-validator pattern. Before ENG starts any
non-trivial implementation, run this gate to avoid building what already exists.

---

## When to run

Run before any task where ENG will:
- Build a new feature or tool
- Create a new integration
- Design a new architecture

Skip for: bug fixes, config changes, one-liners, documentation.

---

## Validation steps (run in order)

### Step 1 — GitHub search
```
web_search: site:github.com "<idea keywords>" openclaw OR "claude code" OR "AI agent"
```
Score +3 if found in >3 repos (saturated market)
Score -1 if found but with open issues (opportunity)

### Step 2 — Existing skills check
```
exec: ls ~/.openclaw/workspace/skills/ | grep -i "<keyword>"
```
Score +5 if skill already exists in workspace — DO NOT rebuild

### Step 3 — TICKET-TRACKER check
```
grep -i "<keywords>" ~/.openclaw/workspace/ops/TICKET-TRACKER.md
```
Score +2 if already tracked as a ticket

### Step 4 — DECISIONS.md check
```
grep -i "<keywords>" ~/.openclaw/workspace/DECISIONS.md
```
Score +2 if a decision was already made about this

### Step 5 — Compute reality_signal (0-100)
```
reality_signal = 100 - (score * 10)
```
- reality_signal > 70 → PROCEED — low saturation, novel
- reality_signal 40-70 → PROCEED WITH DIFFERENTIATION — note what's different
- reality_signal < 40 → SKIP or REPURPOSE — too saturated, find the gap

### Step 6 — Log result
Update `workspace/STATE.yaml` → `pipelines.idea_validator`:
```yaml
last_checked: "<ISO>"
last_idea: "<one-line description>"
reality_signal: <score>
```

Append to `workspace/tasks-log.md`:
```
IDEA-VALIDATE | eng | <ISO> | done|skip | reality_signal=<n> idea="<desc>"
```

---

## Output format

Before starting implementation, ENG MUST post to #redos-mission-control:
```
💻 ENG: Idea validated — reality_signal=<n>
Idea: <description>
Decision: PROCEED | SKIP | REPURPOSE
Reason: <one line>
```
