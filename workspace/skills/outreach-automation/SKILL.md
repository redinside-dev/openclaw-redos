# Skill: outreach-automation

**Sends preview links via SMS and schedules AI voice calls to close deals.**

Assigned agent: ZEN (allrounder - outreach coordination)

---

## When to use

- Task: `OUTREACH-001` - Send preview to grade-D leads
- Task: `OUTREACH-002` - Follow-up calls
- Project status: `ready` → need to send to client

---

## How it works

1. Read ready projects from `workspace-website-agency/projects.json`
2. For each project:
   - Send SMS with preview link via n8n
   - Schedule AI voice call for follow-up
3. Update project status to `sent`
4. Track call outcomes

---

## n8n webhooks

| Path | Purpose | Input | Output |
|------|---------|-------|--------|
| `sms-sender` | Send preview link via SMS/Telegram | `{phone: "+1-415-555-0100", message: "..."}` | `{ok: true, sid: "SM..."}` |
| `voice-call-schedule` | Schedule AI voice call | `{phone: "+1-415-555-0100", context: {...}, scheduleAt: "2026-03-06T14:00:00Z"}` | `{ok: true, callId: "call-001"}` |

---

## SMS template

```
Hi [Business Name]! I noticed your website could use an upgrade. I've created a custom preview for you: [previewUrl]

Would you like to learn more? Reply YES or call me at [our-number].
```

---

## Voice call script

The AI voice agent will:
1. Introduce themselves and the website preview
2. Ask if the business owner is interested
3. Handle objections professionally
4. Schedule a follow-up or close the deal
5. Log the outcome

---

## Usage

```bash
# Send preview SMS
curl -s --max-time 30 -X POST http://127.0.0.1:5678/webhook/sms-sender \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1-415-555-0100",
    "message": "Hi Joe! I noticed your website could use an upgrade. Preview: https://preview.example.com/joes-pizza-abc123"
  }'

# Schedule voice call
curl -s --max-time 30 -X POST http://127.0.0.1:5678/webhook/voice-call-schedule \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1-415-555-0100",
    "businessName": "Joe's Pizza",
    "previewUrl": "https://preview.example.com/joes-pizza-abc123",
    "scheduleAt": "2026-03-06T14:00:00Z"
  }'
```

---

## Project status flow

After outreach:
- `sent` - Preview sent, awaiting response
- `called` - Voice call completed
- `converted` - Client agreed, website goes live
- `lost` - Client declined or no response
- `callback` - Client requested follow-up

---

## Output format

Update in `workspace-website-agency/projects.json`:
```json
{
  "projects": [
    {
      "id": "proj-001",
      "leadId": "lead-001",
      "businessName": "Joe's Pizza",
      "previewUrl": "https://preview.example.com/joes-pizza-abc123",
      "status": "sent",
      "sentAt": "2026-03-06T11:30:00Z",
      "calledAt": "2026-03-06T14:00:00Z",
      "callOutcome": null,
      "convertedAt": null,
      "smsSid": "SMabc123",
      "callId": "call-001"
    }
  ]
}
```

---

## Integration

- Input from: `website-builder` skill
- After close: → RED for approval (L4 for payment)

---

## Logging

Log all outreach to `workspace/logs/audit.jsonl`:
```json
{"ts":"2026-03-06T11:30:00Z","agent":"zen","tool":"outreach-automation","action":"sms-sent","projectId":"proj-001"}
{"ts":"2026-03-06T14:00:00Z","agent":"zen","tool":"outreach-automation","action":"call-scheduled","projectId":"proj-001"}
```

---

## Follow-up rules

- If no response in 48h: send second SMS
- If no response in 5 days: schedule voice call
- After call: log outcome and next action
- Max 3 outreach attempts before marking `lost`

---

## Escalation

If client expresses interest but has questions:
- Forward to RED for personal follow-up
- Use L4 approval workflow for pricing discussions
