# Skill: research-pipeline

**Automated Research→ENG delivery pipeline.**

RESEARCH autonomously delivers findings to ENG without RED orchestrating.
Inspired by awesome-openclaw multi-stage pipeline pattern.

---

## Pipeline stages

```
RESEARCH inner loop
  → Produces: research brief (workspace/tmp/research-brief-latest.md)
  → Updates: STATE.yaml pipelines.research_to_eng
  → Notifies: ENG via sessions_send
      ↓
ENG inner loop
  → Reads: workspace/tmp/research-brief-latest.md
  → Runs: idea-validator skill on top finding
  → Implements: top quick win (if reality_signal > 60)
  → Reports: to #redos-mission-control + updates STATE.yaml
```

---

## RESEARCH responsibilities

After every research session that produces a finding:

1. Write brief to `workspace/tmp/research-brief-latest.md`:
```markdown
# Research Brief — <topic> — <ISO date>
**Produced by:** RESEARCH
**For:** ENG

## Top finding
<one paragraph>

## Quick win opportunity
<specific implementable idea, ENG can build in <2h>

## Sources
- <url1>
- <url2>
```

2. Update `workspace/STATE.yaml`:
```yaml
pipelines:
  research_to_eng:
    status: "waiting_for_eng"
    last_research_topic: "<topic>"
    last_research_ts: "<ISO>"
```

3. Send to ENG:
```
sessions_send(
  sessionKey="agent:eng:main",
  message="[TASK-ID: TASK-YYYYMMDD-NNN] RESEARCH BRIEF READY — new brief at workspace/tmp/research-brief-latest.md. Please read and implement the quick win if reality_signal > 60.",
  timeoutSeconds=60
)
```

4. Post to #redos-mission-control:
```
🔬 RESEARCH: Brief delivered to ENG — topic: <topic>
Quick win: <one line>
ENG: please check workspace/tmp/research-brief-latest.md
```

---

## ENG responsibilities

When ENG inner loop sees STATE.yaml `research_to_eng.status: "waiting_for_eng"`:

1. Read `workspace/tmp/research-brief-latest.md`
2. Run idea-validator on the quick win idea
3. If reality_signal > 60: implement the quick win
4. Update STATE.yaml `research_to_eng.status: "done"` or `"eng_declined"`
5. Post result to #redos-mission-control
6. Log to tasks-log.md

---

## Frequency

RESEARCH delivers a brief at minimum:
- Every Monday (weekly digest)
- Any time RESEARCH discovers a high-value finding (reality_signal > 80 for a competitor pattern)
