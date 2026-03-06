# Skill: website-builder

**Generates custom websites for grade-D businesses and returns a preview URL.**

Assigned agent: ENG (website building)

---

## When to use

- Task: `BUILD-001` - Build website for grade-D lead
- Lead status: `build-candidate`
- Need to generate preview URL and save to `workspace-website-agency/projects.json`

---

## How it works

1. Read grade-D leads from `leads.json` (status: `build-candidate`)
2. Gather business info: name, category, address, phone, services
3. Call n8n webhook to generate website
4. Get preview URL from the build system
5. Save project to `workspace-website-agency/projects.json`
6. Update lead status to `building`

---

## n8n webhook

| Path | Purpose | Input | Output |
|------|---------|-------|--------|
| `website-builder` | Generate website from business info | `{business: {name, category, address, phone, services: []}}` | `{previewUrl: "https://preview.example.com/abc123", status: "ready"}` |

---

## Website generation

The website builder webhook will:
1. Use AI to generate a custom website based on business type
2. Include: hero section, services, about, contact, call-to-action
3. Host on preview URL (Vercel/Netlify/similar)
4. Return the preview URL

---

## Usage

```bash
# Generate website via n8n
curl -s --max-time 120 -X POST http://127.0.0.1:5678/webhook/website-builder \
  -H "Content-Type: application/json" \
  -d '{
    "business": {
      "name": "Joe's Pizza",
      "category": "restaurant",
      "address": "123 Main St, San Francisco, CA",
      "phone": "+1-415-555-0100",
      "services": ["pizza", "pasta", " salads"],
      "description": "Best pizza in SF since 1985"
    }
  }'
```

---

## Output format

Save to `workspace-website-agency/projects.json`:
```json
{
  "projects": [
    {
      "id": "proj-001",
      "leadId": "lead-001",
      "businessName": "Joe's Pizza",
      "previewUrl": "https://preview.example.com/joes-pizza-abc123",
      "status": "ready",
      "createdAt": "2026-03-06T11:00:00Z",
      "sentAt": null,
      "convertedAt": null
    }
  ],
  "stats": {
    "total": 1,
    "building": 0,
    "ready": 1,
    "sent": 0,
    "converted": 0
  }
}
```

---

## Lead status flow

- Before build: lead status = `build-candidate`
- During build: lead status = `building`
- After build: lead status = `ready` (project status = `ready`)
- After outreach: project status = `sent`
- On close: project status = `converted` or `lost`

---

## Integration

- Input from: `website-auditor` skill (grade D leads)
- Output to: `outreach-automation` skill (send preview link)

---

## Logging

Log all builds to `workspace/logs/audit.jsonl`:
```json
{"ts":"2026-03-06T11:00:00Z","agent":"eng","tool":"website-builder","leadId":"lead-001","previewUrl":"https://preview.example.com/..."}
```

---

## Manual override

If n8n webhook fails, ENG agent can:
1. Manually create a simple HTML site
2. Use a website builder tool (Carrd, Wix, etc.)
3. Host and provide the preview URL manually

Record all manual builds the same way in `projects.json`.
