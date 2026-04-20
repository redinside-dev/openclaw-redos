# Skill: lead-gen-maps

**Finds local businesses via Google Maps API, filters for businesses without websites or with poor sites.**

Assigned agent: HATAKE (lead generation)

---

## When to use

- Task: `LEAD-GEN-001` - Find 50 local businesses
- Task: `LEAD-GEN-002` - Enrich with contact info
- Need to populate `workspace-website-agency/leads.json` with potential clients

---

## How it works

1. Query Google Maps Places API via n8n webhook
2. Filter results: businesses without websites OR with poor web presence
3. Save qualified leads to `workspace-website-agency/leads.json`
4. Return count and summary of new leads

---

## n8n webhook

| Path | Purpose | Input | Output |
|------|---------|-------|--------|
| `google-maps-search` | Search businesses by location/category | `{location: "San Francisco, CA", keyword: "restaurant", radius: 5000}` | Array of business objects with name, address, phone, website |

---

## Usage

```bash
# Find restaurants without websites in San Francisco
curl -s --max-time 30 -X POST http://127.0.0.1:5678/webhook/google-maps-search \
  -H "Content-Type: application/json" \
  -d '{
    "location": "San Francisco, CA",
    "keyword": "restaurant",
    "radius": 5000,
    "minRating": 3.5
  }'
```

---

## Lead qualification criteria

A lead is qualified if:
- Has a physical location (verified)
- No website OR website is poor (can be checked by website-auditor skill)
- Has phone number for outreach
- Not already in leads.json

---

## Output format

Save to `workspace-website-agency/leads.json`:
```json
{
  "leads": [
    {
      "id": "lead-001",
      "name": "Business Name",
      "category": "restaurant",
      "address": "123 Main St, San Francisco, CA",
      "phone": "+1-415-555-0100",
      "website": null,
      "rating": 4.2,
      "source": "google-maps",
      "foundAt": "2026-03-06T10:00:00Z",
      "status": "pending-audit"
    }
  ],
  "stats": {
    "total": 1,
    "withWebsite": 0,
    "withoutWebsite": 1,
    "pendingAudit": 1
  }
}
```

---

## Integration

- Output feeds into: `website-auditor` skill (RESEARCH agent)
- Lead status flow: `pending-audit` → `audited` → (grade D) → `building` → `ready` → `outreach` → `converted`/`lost`

---

## Logging

Log all lead generation runs to `workspace/logs/audit.jsonl`:
```json
{"ts":"2026-03-06T10:00:00Z","agent":"hatake","tool":"lead-gen-maps","action":"found","count":15}
```
