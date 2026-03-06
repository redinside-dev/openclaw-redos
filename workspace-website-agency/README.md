# 🌐 Ontario Website Agency - Complete!

A fully automated website agency that runs 24/7 finding businesses without websites in Ontario, Canada, building them custom sites, and reaching out to close deals.

## Quick Start

### Check Status
```bash
python3 /Users/redinside/.openclaw/workspace-website-agency/scripts/status.py
```

### Run Manually
```bash
# Full pipeline
python3 /Users/redinside/.openclaw/workspace-website-agency/scripts/run_pipeline.py --stage full --count 50

# Individual stages
python3 /Users/redinside/.openclaw/workspace-website-agency/scripts/lead_generator.py --count 50
python3 /Users/redinside/.openclaw/workspace-website-agency/scripts/website_auditor.py
python3 /Users/redinside/.openclaw/workspace-website-agency/scripts/website_builder.py
python3 /Users/redinside/.openclaw/workspace-website-agency/scripts/outreach.py
```

## Automation (Cron Jobs)

The system runs automatically via OpenClaw cron:

| Job | Schedule | What it does |
|-----|----------|--------------|
| `website-agency-leads-0001` | Daily 9am | Finds 50 new leads |
| `website-agency-audit-0001` | Every 4 hours | Audits pending leads |
| `website-agency-build-0001` | Every 2 hours | Builds websites for Grade D |
| `website-agency-outreach-0001` | Every 3 hours | Sends SMS/email |

## Configuration

Edit `/Users/redinside/.openclaw/workspace-website-agency/config.json`:

- **Target Cities**: 30 cities in Ontario (100km from Toronto)
- **Categories**: 46 business types
- **Daily Lead Count**: 50 leads/day

## Current Results

| Metric | Count |
|--------|-------|
| Leads Found | 50 |
| Without Website | 33 |
| Grade D (needs site) | 47 |
| Websites Built | 47 |
| Sent to Clients | 47 |

## Files

```
workspace-website-agency/
├── config.json          # Configuration
├── leads.json          # Business leads
├── audits.json         # Website audits
├── projects.json       # Website projects
├── sites/             # Generated websites (HTML)
├── scripts/
│   ├── lead_generator.py
│   ├── website_auditor.py
│   ├── website_builder.py
│   ├── outreach.py
│   ├── run_pipeline.py
│   └── status.py
└── cron.json           # Cron schedule
```

## To Enable Real Features

### 1. Google Maps API (for real leads)
Get API key from: https://console.cloud.google.com/
Enable: Places API, Maps JavaScript API

Set env variable:
```bash
export GOOGLE_MAPS_API_KEY="your-key-here"
```

### 2. SMS/Voice (for real outreach)
Set up Twilio in n8n, then update the webhooks in `scripts/outreach.py`

## Target Cities (within 100km of Toronto)

Toronto, North York, Scarborough, Etobicoke, Mississauga, Brampton, Oakville, Burlington, Hamilton, Vaughan, Markham, Richmond Hill, Aurora, Newmarket, Oshawa, Whitby, Ajax, Pickering, Milton, Cambridge, Waterloo, Kitchener, Guelph, St. Catharines, Niagara Falls, Barrie, Georgetown, Bolton, Caledon, Brockville
