# Skill: website-auditor

**Analyzes business websites and grades them A/B/C/D based on speed, mobile-friendliness, SEO, design, and content quality.**

Assigned agent: RESEARCH (site auditing)

---

## When to use

- Task: `AUDIT-001` - Audit discovered leads
- Priority: Grade D leads → immediate build queue
- Need to populate `workspace-website-agency/audits.json`

---

## How it works

1. Read leads from `workspace-website-agency/leads.json` (status: pending-audit)
2. For each lead:
   - Visit their website (or confirm no website exists)
   - Analyze: speed, mobile, SEO, design, content
   - Assign grade A/B/C/D
3. Save audits to `workspace-website-agency/audits.json`
4. Update lead status in `leads.json`

---

## Grading criteria

| Grade | Criteria |
|-------|----------|
| **A** | Fast (<2s), mobile-friendly, good SEO, modern design, quality content |
| **B** | Decent performance but minor issues in 1-2 areas |
| **C** | Noticeable problems: slow (>4s), poor mobile, weak SEO, outdated design |
| **D** | No website OR critical issues: very slow (>6s), broken mobile, no SEO, poor content, needs rebuild |

---

## Website analysis factors

1. **Speed**: Page load time via Lighthouse/PageSpeed
2. **Mobile**: Mobile-friendly test (Google Mobile-Friendly Test)
3. **SEO**: Meta tags, headings, keywords, schema markup
4. **Design**: Modern vs outdated, visual hierarchy, UX
5. **Content**: Quality, freshness, relevance to business

---

## n8n integration

| Path | Purpose | Input | Output |
|------|---------|-------|--------|
| `website-audit` | Automated site analysis via Lighthouse | `{url: "https://example.com"}` | Audit object with scores |

---

## Usage

```bash
# Manual audit via n8n
curl -s --max-time 60 -X POST http://127.0.0.1:5678/webhook/website-audit \
  -H "Content-Type: application/json" \
  -d '{"url":"https://business-site.com"}'
```

Or use the skill directly on a lead:
- Agent reads the website
- Applies grading criteria
- Records the grade

---

## Output format

Save to `workspace-website-agency/audits.json`:
```json
{
  "audits": [
    {
      "id": "audit-001",
      "leadId": "lead-001",
      "url": "https://business.com",
      "grade": "D",
      "scores": {
        "speed": 2,
        "mobile": 1,
        "seo": 1,
        "design": 2,
        "content": 2
      },
      "issues": [
        "Page load >6s",
        "No mobile optimization",
        "No SEO meta tags",
        "Outdated design",
        "No content"
      ],
      "recommendation": "Full rebuild recommended",
      "auditedAt": "2026-03-06T10:30:00Z"
    }
  ],
  "stats": {
    "total": 1,
    "gradeA": 0,
    "gradeB": 0,
    "gradeC": 0,
    "gradeD": 1
  }
}
```

---

## Lead status flow

After audit, update lead in `leads.json`:
- Grade A/B → status: `maintain` (no action needed)
- Grade C → status: `offer-upgrade` (offer optimization)
- Grade D → status: `build-candidate` (add to website-builder queue)

---

## Integration

- Input from: `lead-gen-maps` skill
- Output to: `website-builder` skill (for grade D)
- Grade C leads: → `outreach-automation` for upgrade offer

---

## Logging

Log all audits to `workspace/logs/audit.jsonl`:
```json
{"ts":"2026-03-06T10:30:00Z","agent":"research","tool":"website-auditor","leadId":"lead-001","grade":"D"}
```
