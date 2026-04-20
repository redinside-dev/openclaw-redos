# Owner-by-Owner Recovery Checklist (RESEARCH)

## OPS (System Recovery)
**Immediate (0-10 min):**
- [ ] Activate consultant circuit-breaker (stop recursive reinjection)
- [ ] Check and escalate web_search quota restoration
- [ ] Fix agent-id registry + dmPolicy schema validation
- [ ] Tune timeout/retry policy for A2A + cron overlap

**Short-term (10-30 min):**
- [ ] Memory pressure cleanup + process pruning
- [ ] Verify cron jobs after quota fix
- [ ] Monitor A2A success rate recovery

**Owner:** OPS

---

## ENG (Provider/Config Recovery)
**Immediate (0-10 min):**
- [ ] Investigate 9router timeout patterns
- [ ] Verify ollama model availability + fallbacks
- [ ] Fix minimax auth failures
- [ ] Validate provider config consistency

**Short-term (10-30 min):**
- [ ] Test A2A endpoint reliability
- [ ] Confirm model fallback chains
- [ ] Update provider health dashboards

**Owner:** ENG

---

## RED (Executive Oversight)
**Immediate (0-10 min):**
- [ ] Approve quota escalation if needed
- [ ] Review consultant loop impact
- [ ] Authorize memory cleanup if required

**Short-term (10-30 min):**
- [ ] Confirm recovery timeline
- [ ] Validate critical path restoration
- [ ] Sign off on post-recovery status

**Owner:** RED

---

## Shared Recovery Metrics
- **Consultant loop stopped:** Yes/No
- **Quota restored:** Yes/No
- **A2A success rate:** 0% → 95% target
- **Cron success rate:** 70% → 95% target
- **Memory usage:** 94% → <80% target

---

## Handoff Timestamp
**Compiled:** 2026-03-13 11:46 ET
**Next update:** 15 min after first owner action
**Status channel:** ops/RECOVERY-STATUS.md