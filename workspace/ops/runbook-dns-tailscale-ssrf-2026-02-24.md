# Runbook — Fix SSRF/DNS false-positive caused by Tailscale DNS override (microsoft.com → 198.18.8.77)

**Incident:** `web_fetch`/url-fetch SSRF guard blocks `https://www.microsoft.com/...` because host DNS resolves it to **198.18.8.77** (198.18.0.0/15 = special-use benchmarking range). SSRF guard is behaving correctly; the environment resolver is wrong.

**Primary suspected cause:** Tailscale DNS override (nameserver **100.64.0.2** via `utun*`) / MagicDNS / split-DNS / exit-node DNS config causing public domains to resolve to special-use IPs.

## 0) Safety rules
- **Do not relax SSRF controls.** Fix DNS.
- Capture evidence before/after so we can close **TICKET-20260223-002** cleanly.

## 1) Verify (no sudo)
Run these and record outputs:

```bash
scutil --dns | egrep -n "nameserver\[[0-9]+\]|search domain\[[0-9]+\]|if_index|interface" | head -120

dig @1.1.1.1 www.microsoft.com A +short

dig @8.8.8.8 www.microsoft.com A +short

dig www.microsoft.com A +short
```

**Expected healthy:**
- `@1.1.1.1` returns a public Akamai IP (not 198.18/15)
- `@8.8.8.8` returns public IPs as well
- local `dig` returns public IPs

**If local returns 198.18.* or times out while `@1.1.1.1` is fine:** resolver path is hijacked/overridden.

## 2) Quick fix path A (recommended if you can access Tailscale Admin Console)
In **Tailscale Admin Console → DNS**:
- Temporarily **disable “Override local DNS”** (a.k.a. “Use Tailscale DNS settings”).
- Or ensure split-DNS is configured so only tailnet domains use Tailscale DNS; public domains should use normal resolvers.

Then re-run the **Verify** commands in section 1.

## 3) Quick fix path B (host-side; requires sudo)
Run:

```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
sudo launchctl kickstart -k system/io.tailscale.tailscaled
sleep 2

dig @8.8.8.8 www.microsoft.com +short

dig @1.1.1.1 www.microsoft.com +short

dig www.microsoft.com +short
```

If local resolution is still bad after restart, proceed to Path A (admin DNS override) or Path C.

## 4) Fix path C (Tailscale CLI toggle; may require sudo)
Goal: stop Tailscale from acting as system DNS resolver for public domains.

Try (choose one that matches your setup):

```bash
# Option 1: disconnect/reconnect without accepting DNS
sudo tailscale down
sudo tailscale up --accept-dns=false

# Option 2: if you rely on tailnet DNS, keep accept-dns but remove exit-node / DNS routes
# (requires knowing if an exit node is enabled)
```

Re-run **Verify**.

## 5) Close criteria (for TICKET-20260223-002)
Ticket can be marked RESOLVED when:
1) `dig www.microsoft.com +short` returns only public IPs (no 198.18/15)
2) `web_fetch https://www.microsoft.com` succeeds (no SSRF block)
3) We document which fix path worked (A/B/C) + any persistent config changes

## 6) Notes / Why this matters
- 198.18.0.0/15 is special-use (benchmark/testing). Treating it as “private/internal/special-use” is correct.
- If a resolver returns 198.18.* for public sites, **either DNS override/sinkhole** is active, or a policy product is intercepting.
