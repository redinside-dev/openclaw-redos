# Website Agency - n8n Workflows

## Quick Import Instructions

1. Go to n8n dashboard: http://127.0.0.1:5678
2. Click "Import from File" (top right menu)
3. Select the JSON file from `workspace-website-agency/workflows/`
4. Activate the workflow

---

## Required Webhooks

| Path | JSON File | Status |
|------|-----------|--------|
| `google-maps-search` | `google-maps-search.json` | TODO |
| `website-audit` | `website-audit.json` | TODO |
| `website-builder` | `website-builder.json` | TODO |
| `sms-sender` | `sms-sender.json` | TODO |
| `voice-call-schedule` | `voice-call-schedule.json` | TODO |

---

## Credentials Needed

Before activating, create these credentials in n8n:

1. **Google Maps API Key** - Named: `Google Maps API`
   - Get from: https://console.cloud.google.com/google/maps-apis/
   - Enable: Places API

2. **Twilio** (for SMS) - Named: `Twilio API`
   - Account SID, Auth Token, Phone Number

3. **Vercel/Netlify** (for website hosting) - Named: `Vercel API`
   - For automatic website deployment

4. **OpenAI** (for AI voice calls) - Named: `OpenAI API`
   - For AI voice agent calls

---

## Workflow Details

### google-maps-search
- Input: `{location, keyword, radius}`
- Uses Google Places API
- Returns array of businesses

### website-audit
- Input: `{url}`
- Uses Lighthouse/scraping
- Returns grade A-D with scores

### website-builder
- Input: `{business: {name, category, address, phone, services}}`
- Generates static site
- Returns preview URL

### sms-sender
- Input: `{phone, message}`
- Sends via Twilio/Telegram
- Returns message SID

### voice-call-schedule
- Input: `{phone, businessName, previewUrl, scheduleAt}`
- Schedules AI voice call
- Returns call ID
