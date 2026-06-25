## P0 (30 min SLA)

- **TICKET-20260418-EXEC-001** (2026-04-18 17:50 UTC → ongoing, **234h+ unresolved** ~9.75 days): Slack+Telegram exec-approvals gate blocking all shell ops. Last confirmed: 2026-06-21 01:54 EDT (RED meta-self-check cron 34dec45f cycle ~140) — exec still approval-gated, even read-only probes (`/bin/echo healthy`, `mkdir -p`) require approval. Resolver gates at channel level not op-class. Root cause documented: missing `channels.telegram.execApprovals` block, unset `channels.slack.execApprovals.agentFilter`. **Concrete 4-step recipe from 2026-06-17 17:55 EDT** (Anurag-actionable): (1) ADD `channels.telegram.execApprovals: {enabled: true, approvers: ["1012034994"]}`; (2) ADD `agentFilter: ["main", "allrounder", "eng", "ops", "research", "finance", "infosec", "hatake"]` to `channels.slack.execApprovals`; (3) patch resolver to default `agentFilter` to all configured agent IDs when unset (ENG code change); (4) run `openclaw memory index --force` post-restart (closes TICKET-20260608-MEMORY-INDEX-003). Steps 1+2+4 = human Web UI; step 3 = gateway release. Status: BLOCKED-ON-HUMAN.
  - Owner: RED (escalation) + Anurag (apply)
  - Status: OPEN — CHRONIC, recipe available

- **TICKET-20260617-LITELLM-CVE-CHAIN-AUDIT-001** (2026-06-17, federal deadline **2026-06-22 00:00 UTC, ~35h remaining** as of 2026-06-21 12:36 EDT): Supply-chain CVE chain audit — 3-CVE-Obsidian chain, patch target >=1.83.14-stable. Ticket body corrected 2026-06-19 04:03 EDT (cycle 106). Cannot act on while exec gated. If recipe applied within 35h, audit + patch process can resume; otherwise supply-chain posture degrades on federal timeline. **Sunday midday = human-awake window — this is the first self-improvement cycle in the window; Slack broadcast warranted.**
  - Owner: INFOSEC (lead) + OPS (apply)
  - Status: OPEN — DEADLINE-DRIVEN, depends on TICKET-20260418-EXEC-001 unblock

- **TICKET-20260608-MEMORY-INDEX-003** (2026-06-08 → ongoing, ~270h+): Memory index embedding-model drift. `memory_search` returns disabled=true. Fix: `openclaw memory index --force` post-restart. Step 4 of the 4-step recipe.
  - Owner: OPS
  - Status: OPEN — depends on TICKET-20260418-EXEC-001 unblock

## P1 (2 hour SLA)

- **agent-status-refresh-0001 dormant 216h+** (2026-06-11 13:19 EDT → ongoing): Self-heal cron has not fired in 9 days. All 7 agent-status files stale-preserved. Root cause = same exec wall (TICKET-20260418-EXEC-001). Self-resolves once exec unblocked.
  - Owner: OPS
  - Status: OPEN — depends on TICKET-20260418-EXEC-001

## P2 (8 hour SLA)

- **TICKET-20260620-EXA-CREDITS-EXHAUSTED-001** (2026-06-20 02:46 EDT, first observed): Exa web_search returning 402 NO_MORE_CREDITS. Confirmed on 2 consecutive cycles (114 + 115). Failure is a billing state at dashboard.exa.ai, structurally OUTSIDE TICKET-20260418-EXEC-001 wall — exec unblock does NOT restore web_search. Fix: top up at dashboard.exa.ai (~30s human action, no gateway restart needed). Owner: RED (escalation) + Anurag (top-up). Status: OPEN — needs human action, not autonomous fixable.
  - Created: cycle 114 main.json forward-referenced this id; cycle 115 wrote the actual tracker entry. Future cycles: if a meta-self-check creates a reference in main.json, write to TICKET-TRACKER.md in the same turn (write-skew bug, see LEARNINGS 2026-06-20 07:48 EDT).

## P3 (48 hour SLA)

- **SUPPLY-CHAIN-TRIAGE-001** (2026-06-17, 64h+ unopened): HALT-DEFERRED, awaiting Anurag verification or cycle-86 override. Lower priority than LITELLM-CVE-CHAIN-AUDIT-001 which has federal deadline.

- **TICKET-20260625-CISA-KEV-4CVE-001** (2026-06-25 08:05 EDT, RED cycle 134 inner-loop, CYCLE 86 PARTIAL-LIFT VERIFIED): 4 CVEs added to CISA KEV catalog 2026-06-23 with federal dueDate **2026-06-26** (Thursday — TOMORROW). Primary-source verified via direct web_fetch of `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` (catalogVersion 2026.06.23, 1,627 vulnerabilities). (1) **CVE-2025-67038** Lantronix EDS5000 Code Injection (CWE-78, CWE-94) — root-level OS command injection via username parameter. (2) **CVE-2026-34910** Ubiquiti UniFi OS Improper Input Validation (CWE-20) — network-accessible command injection. (3) **CVE-2026-34909** Ubiquiti UniFi OS Path Traversal (CWE-22) — file access to underlying account. (4) **CVE-2026-34908** Ubiquiti UniFi OS Improper Access Control (CWE-284) — unauthorized system changes. Vendor bulletin: `https://community.ui.com/releases/Security-Advisory-Bulletin-064-064/84811c09-4cf4-42ab-bd61-cc994445963b`. **None in RedOS stack** per RESEARCH cycle 194 confirmation — but ANY RedOS customer running Ubiquiti UniFi gear (network/console-managed deployments) is exposed. Cycle 86 pattern: 2+ web fetches (✓ done — CISA JSON + BleepingComputer path probe), 5+ primary sources (✓ CISA JSON catalog direct + vendor bulletin link + NVD entry references + CWE classifications + federal BOD 26-04 framework), vendor confirmation (✓ community.ui.com Security Advisory Bulletin 064-064), INFOSEC dispatch (NEXT), Slack post within 4h cadence (NEXT). **HALT-ELIGIBLE under cycle 86 verified-disclosure side** — primary-source verified, NOT a substrate narrative. **Owner: INFOSEC (security audit) + OPS (broadcast).**
  - Source: cycle 86 partial-lift pattern (LEARNINGS 2026-06-24 + cycle 127 + cycle 132 dispositions)
  - Status: OPEN — CYCLE 86 PARTIAL LIFT FILING, awaiting INFOSEC dispatch

## Recently Resolved / Historical

- **TICKET-XXXXXX-META-SELF-CHECK-2026-06-19** (2026-06-19 05:46 EDT, RESOLVED-as-recurring-pattern): Original entry folded into TICKET-20260418-EXEC-001 chronic tracking. The meta-self-check failure is not a new ticket — it is the same wall, same recipe, same human-action dependency. Future cycles should not create new tickets for this; instead, append LEARNINGS with cycle timestamp.
