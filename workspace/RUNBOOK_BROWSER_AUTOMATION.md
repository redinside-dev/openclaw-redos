# Browser Automation Runbook (OpenClaw)

Purpose: keep browser-based automations (YouTube, Gmail web, random sites) reliable and predictable.

This runbook is intentionally **operational**: when something fails, do the next step. It also documents the **security boundary** between personal Chrome and the isolated OpenClaw browser.

## 0) Know which browser you’re controlling

### A) Personal Chrome (Browser Relay)
- Requires the OpenClaw Browser Relay extension to be **attached per-tab**.
- If the tab is not attached, CDP actions will fail with errors like `Not allowed`.

**Fix:** in Chrome on the target tab, click the OpenClaw Browser Relay toolbar icon so the badge is ON.

### B) Isolated OpenClaw browser (profile="openclaw")
- Separate Chrome profile + user data dir.
- Best for automation because it doesn’t depend on your personal tabs.
- Some sites may show anti-bot pages.

## 1) Symptoms → likely cause

### Symptom: “Can’t reach the OpenClaw browser control service (timed out)”
Likely causes:
- Browser control service is wedged/unresponsive.
- Browser process is running but control channel is stuck.

### Symptom: “Protocol error … Not allowed”
Likely cause:
- You’re trying to control a **personal Chrome** tab without attaching Browser Relay on that tab.

### Symptom: Page loads but clicks don’t work (YouTube, etc.)
Likely cause:
- Control service timeout.
- Page is heavy and the action timed out.

## 2) Recovery ladder (do in order)

### Step 1 — Retry once
- Re-run the same action once.

### Step 2 — Restart the isolated browser profile
- Stop + start the OpenClaw browser profile `openclaw`.

### Step 3 — Restart OpenClaw gateway (requires explicit user approval)
- This is disruptive.
- Use only if Step 2 doesn’t restore control.

### Step 4 — Switch strategy (API > browser)
- Prefer API-based methods for critical flows:
  - Gmail: use `gog` CLI (already working)
  - GitHub: use `gh` CLI (already working)
- Use browser automation for non-critical browsing.

## 3) YouTube specific

### Best manual fallback
If the agent can’t click reliably:
- Click any result manually.
- Use keyboard shortcuts:
  - `K` play/pause
  - `M` mute/unmute
  - Up/Down arrows for volume

### Automation expectation
YouTube is a heavy UI; occasional timeouts are normal. The runbook above is the standard fallback.

## 4) Operational principles (to keep it safe)
- Never auto-restart the gateway from cron.
- Never use browser automation for money-moving actions.
- Prefer “read-only → notify” automations.

## 5) When to alert
The System Health Watch cron should alert if:
- `openclaw status` is unhealthy/unreachable
- browser profile is not running / not CDP-ready
- key cron jobs look stale/missed
