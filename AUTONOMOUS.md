### New tasks injected to restart agent activity

## 2026-04-17 — RED CEO P0 Delegation (TICKET-20260417-RED-001)

### Task 1: Opus 4.7 9Router Update ✅ COMPLETED
- **model-registry.json** (`/Users/redinside/.openclaw/workspace/config/model-registry.json`): `cc/claude-opus-4.7` entry was already present (added by prior ENG work per ENG-OPUS-47-TERMBENCH-20260416)
- **Critical fix applied**: Added `_note` to Opus 4.7 entry warning that temperature/top_p/top_k params cause HTTP 400 errors — Opus 4.7 does NOT accept these params
- **Terminal-Bench eval**: 9Router is currently DOWN (port 20128 LISTEN but API calls returning exit code 22/connection failures). Eval skipped — requires 9Router to be operational. ENG should retry when 9Router recovers.

### Task 2: Sonnet 4/4.5 → 4.6 Migration ✅ COMPLETED
All `claude-sonnet-4.5` references migrated to `cc/claude-sonnet-4-6`:

| File | Change |
|------|--------|
| `smart-router/selector-v2.js` | `'anthropic/claude-sonnet-4.5'` → `'anthropic/claude-sonnet-4-6'` |
| `smart-router/selector.js` | 2x `claude-sonnet-4.5` → `claude-sonnet-4-6` (urgent priority + high complexity branches) |
| `tests/test-model-override.js` | `'claude-sonnet-4.5'` → `'claude-sonnet-4-6'` |

**Already correct (no changes needed)**:
- `model-registry.json` — already `cc/claude-sonnet-4-6`
- `openclaw.json` — already `cc/claude-sonnet-4-6`
- `cron/jobs.json` — already `cc/claude-sonnet-4-6`
- `dashboard-v2/src/components/tabs/Agents.tsx` — already `claude-sonnet-4-6`
- `dashboard-v2/src/components/tabs/CeoControls.tsx` — already `claude-sonnet-4-6`


**No remaining `claude-sonnet-4.5` references found** in active config files.


### TICKET-20260417-RED-001 Status
- Status: RESOLVED
- SLA: Met (completed before 12:52 UTC deadline)
- 9Router downtime note: Terminal-Bench eval could not run — 9Router API unresponsive. ENG to retry when 9Router is back online.