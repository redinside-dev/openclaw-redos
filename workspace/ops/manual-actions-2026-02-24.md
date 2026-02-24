# Manual actions required (RED) — 2026-02-24

These items are blocked on interactive auth/sudo/UI and are the highest-leverage manual steps to unblock autonomy.

## 1) Fix DNS/SSRF false-positive (TICKET-20260223-002)
**Symptom:** `web_fetch` blocks microsoft.com as resolving to private/special-use IP.
**Evidence:** host resolver via Tailscale DNS (nameserver **100.64.0.2** on utun5) returns **198.18.8.77** (198.18/15 special-use).

### Option A (preferred, no sudo): Tailscale Admin Console
1. Open **Tailscale Admin Console → DNS**.
2. Temporarily disable **Override local DNS** (or configure split-DNS so only tailnet domains use MagicDNS).
3. Wait ~30s.
4. Verify on host:
   - `dig @8.8.8.8 www.microsoft.com +short`  (should be a public IP, not 198.18.x.x)
   - `dig www.microsoft.com +short`
5. Closure check:
   - `web_fetch https://www.microsoft.com` succeeds (no SSRF block).

### Option B (sudo on host): flush caches + restart tailscaled
Run in Terminal on the Mac mini:
```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
sudo launchctl kickstart -k system/io.tailscale.tailscaled
sleep 2

dig @8.8.8.8 www.microsoft.com +short
dig @1.1.1.1 www.microsoft.com +short
dig www.microsoft.com +short
```
If `@8.8.8.8` still returns 198.18/15, proceed to Option A (it’s almost certainly DNS policy/override).

**Do NOT** relax SSRF blocks; the guard is correct given current resolution.

---

## 2) Restore Gmail unread digest cron (TICKET-20260224-074)
**Symptom:** `gog` Gmail calls fail with `invalid_grant` (token expired/revoked).

### Fix (interactive OAuth)
1. Run the `gog` re-auth flow for the Gmail account `anorag.saxena@gmail.com`.
2. Then verify:
   - `gog gmail search "in:inbox is:unread" --account anorag.saxena@gmail.com --max 5`

Post-verification: rerun the cron once or wait for next scheduled run.

---

## 3) Perplexity web_search outage (TICKET-20260224-096)
**Symptom:** web_search returns **401** with Cloudflare/openresty HTML.

### What to check
- Confirm Perplexity API key validity/rotation status.
- Confirm the API base URL and endpoint used by the integration.
- If WAF challenge persists, key rotation likely required (or account flagged).

Runbook: `workspace/ops/runbook-perplexity-401-2026-02-24.md`
