# Task Validation System

## Problem
Agents mark their own tasks complete without review. Need human (or agent) validation.

## Solution: Dual Validation

### 1. Self-Validation (Agent marks complete)
When an agent finishes, they must:
1. Write output to workspace/validation/<ta[REDACTED]
2. Mark task as COMPLETED in AUTONOMOUS.md

### 2. Peer Review (Another Agent validates)
Every COMPLETED task gets validated by a peer agent:
- RESEARCH tasks → validated by OPS
- ENG tasks → validated by RESEARCH
- OPS tasks → validated by ENG

### 3. CEO Final Sign-off (For critical tasks)
For P0/P1 tasks, CEO (you) get Telegram notification to approve/deny.

---

## Validation Criteria

### Website Project
- [ ] SPEC.md exists with all sections
- [ ] GitHub repo created
- [ ] README.md with installation
- [ ] Code compiles/runs locally
- [ ] Deployed to Vercel (staging)

### GitHub PR
- [ ] Issue exists and assigned
- [ ] PR opened with proper description
- [ ] Tests passing (if applicable)
- [ ] CI passes

---

## Implementation

Add to Task Injector:
```
5. If any task marked COMPLETED → trigger peer validation:
   - RESEARCH complete → ask OPS to validate
   - ENG complete → ask RESEARCH to validate
   - OPS complete → ask ENG to validate
6. If peer validates → mark VALIDATED in AUTONOMOUS.md
7. If peer rejects → move back to PENDING with feedback
```

## Current Status

**No validation currently in place.** Agents mark themselves complete.

Want me to implement the validation system?
