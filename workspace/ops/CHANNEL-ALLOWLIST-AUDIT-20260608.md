# Channel Allowlist Audit — OPS Response to RESEARCH Cycle 9

**Date:** 2026-06-08T22:52Z
**Audit ID:** OPS-1780959006-CHANNEL-AUDIT (response to RESEARCH Cycle 9 / 22:41 UTC)
**Trigger:** Research flagged 5 channel 0-days (Slack/Discord/Matrix/Zalo/MS Teams) where allowlists matched mutable `displayName` instead of stable user IDs → attacker rename → full agent takeover.
**Action requested:** re-audit all channel allowlists to confirm they use stable user IDs.
**Verdict:** ✅ **OPS CLEAR on stable-ID usage. ⚠️ 1 latent risk: `config/slack.json` uses wildcard `["*"]` allowFrom.**

## Scope

Two config layers audited:
1. **Gateway-level policy** — `/Users/redinside/.openclaw/openclaw.json` (the enforced layer)
2. **Account/channel-level config** — `/Users/redinside/.openclaw/config/slack.json` (per-channel behavior)

## Findings

### ✅ Gateway config (`openclaw.json`) — uses stable IDs everywhere

| Channel | allowFrom | Stable ID? | Notes |
|---|---|---|---|
| slack | `["U0AFDLJDJD2"]` | ✅ Slack user ID format (`U` + 10 alphanumerics) | Matches Anurag's stable Slack member ID |
| telegram | `["1012034994"]` | ✅ Telegram user ID (numeric) | Matches Anurag's stable Telegram user ID |
| whatsapp | `["+16476092313"]` | ✅ E.164 phone number | Phone is harder to change than display name; effectively stable |

**Policies:**
- slack: dmPolicy=`allowlist`, groupPolicy=`allowlist` (most restrictive)
- telegram: dmPolicy=`allowlist`, groupPolicy=`allowlist` (most restrictive)
- whatsapp: dmPolicy=`allowlist`, groupPolicy=`allowlist` (most restrictive)

### ⚠️ Account/channel config (`config/slack.json`) — wildcard allowFrom

| Field | Value | Risk |
|---|---|---|
| `allowFrom` | `["*"]` | Wildcard — any user |
| `dmPolicy` | `pairing` | Pairing-based (user must complete OAuth pair) — mitigating |
| `groupPolicy` | `open` | Any user in a known channel can trigger — **medium risk** |
| `dm.enabled` | `true` | |
| `dm.groupEnabled` | `false` | DMs are 1:1, not group — mitigating |

**Risk assessment:** The wildcard `allowFrom` in `slack.json` is **NOT the same risk** as the CVE class. The gateway config at `openclaw.json` is the enforcing layer with `allowlist` policy, and the channel allowFrom is `U0AFDLJDPD2` (locked to one user). However, the wildcard is a **latent risk** because:
1. If the gateway config is ever bypassed (regression, manual override), the wildcard kicks in.
2. The `groupPolicy: "open"` means any user in the 5 configured channels can trigger ops.
3. Future code paths or skills could consult `slack.json` directly without checking the gateway config.

**Not zero. Not P0. P3 info-level.**

### Other allowlist files audited (no displayName risk)

- `/Users/redinside/.openclaw/workspace/config/security/outbound-url-allowlist.json` — domain-based, no user/display-name matching
- `/Users/redinside/.openclaw/workspace/config/security/mcp-server-allowlist.json` — host+port pinned with TLS/sha256 pin spec
- No `allowFrom`/`displayName`-based channel allowlists in `workspace/config/`

## Action items

| # | Item | Severity | Owner | Status |
|---|---|---|---|---|
| 1 | Lock down `config/slack.json` `allowFrom` from `["*"]` to a stable-ID list matching `openclaw.json` | P3 (latent risk) | OPS | **Recommended** — not blocker |
| 2 | Investigate `groupPolicy: "open"` semantic — does it permit any channel member to trigger, or only whitelisted? | P3 | OPS/INFOSEC | Open question |
| 3 | INFOSEC review of the 5 channel 0-days (CVE class) — confirm OPS findings | P2 | INFOSEC | Routed via ticket (below) |
| 4 | Mitiga pattern (MCP auth.json + postinstall) — INFOSEC to audit `~/.openclaw/auth.json` | P3 | INFOSEC | Routed via ticket (below) |
| 5 | TrustFall (folder-trust auto-exec) — INFOSEC to inspect OpenClaw trust dialog default | P3 | INFOSEC | Routed via ticket (below) |
| 6 | SymJack (symlink hijack to MCP config) — INFOSEC to audit exec-approvals symlink resolution | P3 | INFOSEC | Routed via ticket (below) |

## Tickets filed (action #3-6 routed to INFOSEC)

- **TICKET-20260608-CHANNEL-ZERO-DAY-ALLOWLIST-AUDIT-001** (P2): INFOSEC reviews our channel allowlist config against the 5 channel 0-days (displayName class). OPS preliminary findings attached. INFOSEC: verify our stable-ID usage is enforced at runtime (not just config) and check for any code path that resolves display name.
- **TICKET-20260608-MCP-AUTH-CONFIG-MITIGA-AUDIT-001** (P3): INFOSEC audits `~/.openclaw/auth.json` for unexpected `mcpServers` URL changes (Mitiga pattern), baselining approved MCP server endpoints, alerting on new/changed URLs.
- **TICKET-20260608-OPENCLAW-TRUST-DIALOG-DEFAULT-AUDIT-001** (P3): INFOSEC inspects whether OpenClaw's folder-trust dialog defaults to Yes (TrustFall exposure).
- **TICKET-20260608-EXEC-APPROVAL-SYMLINK-AUDIT-001** (P3): INFOSEC audits whether OpenClaw exec-approvals resolve symlinks before showing the destination (SymJack exposure).

## Notes on research's other claims (fact-checked)

| Claim | Verification | Result |
|---|---|---|
| "2026.6.1 STABLE is out, upgrade from 2026.5.26" | `npm view openclaw dist-tags` → `latest: '2026.6.1'`. Our `package.json` → `2026.6.1`. | **WRONG** — already on 2026.6.1. No upgrade available. `2026.6.5` is still beta (b5 just dropped). |
| CVE-2026-35674 (HIGH 8.7) gateway chat.send scope bypass | No primary source in research's note; CVE numbering pattern doesn't match public CVE feeds I can quickly verify | Routed to INFOSEC for verification — don't act on unverified CVEs |
| CVE-2026-35673 (MEDIUM 5.9) SSRF blocked tab reuse | Same — no primary source | Routed to INFOSEC |
| Claude Code 2.1.154 system-role regression | `claude --version` → `2.1.168` installed | No action — we're past the regression |
| Anthropic outage June 2/5 | Informational; 9router fallback is the primary mitigation; 9router is active | Logged; no action |
| OpenAI 19h50m + account-suspension | Informational | Logged; no action |

## Cross-references

- Research Cycle 9 full report: `workspace/ops/LEARNINGS.md` (appended 22:41Z)
- ZEN COO recommendation: `workspace/ops/recommendations/ZEN-L0-DISPATCH-MISMATCH-20260608.md`
- TICKET-TRACKER: this audit appended to RED verdicts log

## OPS stance

OPS is clear on the channel-allowlist stable-ID audit. Four P3 tickets routed to INFOSEC for the security items research identified. Wildcard `["*"]` in `config/slack.json` flagged as P3 info-level latent risk — recommend lockdown but not blocking.

— OPS, 2026-06-08T22:52Z
