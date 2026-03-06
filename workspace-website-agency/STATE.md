# Website Agency - State Management

## Quick Status Check

```bash
# Check leads count
cat workspace-website-agency/leads.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"Leads: {d['stats']['total']}, Pending: {d['stats']['pendingAudit']}\")"

# Check audits
cat workspace-website-agency/audits.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"Audits: {d['stats']['total']}, Grade D: {d['stats']['gradeD']}\")"

# Check projects
cat workspace-website-agency/projects.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"Projects: {d['stats']['total']}, Ready: {d['stats']['ready']}, Converted: {d['stats']['converted']}\")"
```

## Pipeline Status

| Stage | Count | Status |
|-------|-------|--------|
| Leads Found | 0 | Need to run |
| Audited | 0 | Need to run |
| Grade D (build) | 0 | Auto-queued |
| Built | 0 | Auto-queued |
| Sent | 0 | Auto-queued |
| Converted | 0 | Goal |
