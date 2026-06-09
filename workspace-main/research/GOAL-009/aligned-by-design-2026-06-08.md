# RedOS — "Aligned by Design" Reference

**Purpose:** Single-page artifact that backs the "aligned by design" claim in the GOAL-009 public positioning brief. If a HN/Reddit commenter asks "where's the proof RedOS is on the same runtime as Scout?" — this is the file we point them to.
**Date:** 2026-06-08
**Status:** DRAFT v1 (Phase-5 kickstart, RESEARCH)

---

## TL;DR

RedOS runs on the same **open-source OpenClaw** runtime that Microsoft just selected as the base for **Scout** at Build 2026. We don't compete with the runtime; we sit **above** it as a vendor-neutral, M365-agnostic, multi-cloud control plane. The differentiator is not what runs your agent — it's what **governs** it.

---

## The runtime landscape (June 2026)

Microsoft Build 2026 made one architectural decision unambiguous: **the agent runtime is becoming a commodity.**

| Layer | What it is | Who owns it | License |
|---|---|---|---|
| **Runtime** | OpenClaw + MCP servers | OpenClaw Foundation (community) + Microsoft, Nvidia, OpenAI, Nous, Manus all contribute | MIT |
| **Sandbox** | Microsoft Execution Containers (MXC) — kernel-level Windows isolation | Microsoft (contributing upstream) | MIT |
| **Identity** | Per-agent Entra IDs, agent-to-agent credential chain | Microsoft (Entra) or vendor-neutral (SPIFFE/SPIRE) | Closed / Open |
| **Policy / Audit** | Policy-conformance engine + audit trail | Microsoft (Agent 365) or RedOS (vendor-neutral) | Closed / Open |
| **Context** | Work IQ (M365), Work IQ equivalents | Microsoft (M365), Salesforce, custom | Closed / Open |
| **Device console** | Agent 365 (discovers OpenClaw + Copilot CLI + Claude Code) | Microsoft | Closed |

**The economic shift:** Google released AOSP as a free common base for mobile; the money moved to Play services, managed identity, device management, and silicon. **OpenClaw is on the same path for agents.** Scout proves enterprise will accept OpenClaw underneath. The control plane is the business.

**The New Stack (Janakiram MSV, Jun 7):** "a runtime can make an agent capable, but only identity, policy, auditability and isolation make it acceptable, and those are Microsoft businesses." — [source](https://thenewstack.io)

---

## What "aligned by design" means in practice

A RedOS agent and a Scout agent run on the **same executor** (OpenClaw). The difference is what surrounds it.

| Capability | Scout (Microsoft) | RedOS |
|---|---|---|
| Runtime | OpenClaw (upstream) | OpenClaw (upstream) |
| Sandbox | MXC (kernel-level Windows) | Same MXC on Windows; Firecracker/gVisor/Hyperlight on Linux/macOS |
| Identity | Entra per-agent ID | SPIFFE/SPIRE per-agent ID + optional Entra bridge |
| Policy | Microsoft-internal + Agent 365 | Vendor-neutral policy engine; audit logs in customer's SIEM |
| Audit | Agent 365 console | RedOS dashboard, exportable to OTel/SIEM |
| Context | Work IQ (M365-native) | M365 + Google Workspace + Salesforce + custom sources |
| **Default execution mode** | **Always-on, autonomous** | **Pause-and-ask** (HiTL) — agent proposes, human approves |
| Vendor lock-in | High (Entra + M365) | Low (SPIFFE + portable contexts) |
| Multi-cloud | No (Azure-first) | Yes (AWS/GCP/Azure/on-prem) |
| Offline operation | Limited | First-class (local-first) |
| Per-token billing | Likely (per Microsoft 365 Copilot pricing pattern, TBD) | No (one-time infra + your compute) |

---

## Why "pause-and-ask" is the wedge

**xAI Grok Build** (May 25, 2026) shipped **Plan Mode** as a named feature: the agent outlines proposed changes and **waits for human sign-off before executing**. First mainstream competitor to explicitly name the approval-before-exec pattern.

**CSA Lethal Trifecta** (Q2 2026 AIRQ): 98% of 100 production agents carry (private data + untrusted content + outbound action) simultaneously. Only 11% pass baseline security. The "act without you" model is now a top-of-mind enterprise risk.

**Microsoft AI Red Team v2.0** (Jun 4) added "Agentic Supply Chain Compromise" + "MCP / Plugin Abuse" + "Session Context Contamination" as named failure categories. Implication: agents that don't pause and surface intent to humans are a top-of-mind enterprise risk.

**Conclusion:** the control plane is the business, but the *default* of that control plane matters. Scout's default is "act, governed by Entra." RedOS's default is "act only after human sign-off." Both are valid bets; ours addresses the 89% of agents that don't pass baseline security.

---

## Concrete proof points (for HN/Reddit comments)

1. **OpenClaw codebase:** `github.com/openclaw/openclaw` (MIT). Our gateway runs the same code. Anyone can `git clone` and verify.
2. **MCP server support:** RedOS uses the same MCP servers as Scout, Cursor, Claude Code, and every other OpenClaw-aligned runtime. No proprietary connector layer.
3. **Tool-call format:** we speak the OpenAI function-calling + Anthropic tool-use + MCP JSON-RPC standards. A tool designed for one runs on the others.
4. **OSS evidence of the same-runtime thesis:** Scout was just announced on OpenClaw at Build 2026 — no one is claiming RedOS and Scout share proprietary runtime code, because they don't need to. They share the same MIT-licensed upstream.
5. **RedOS HiTL is a control-plane addition, not a runtime fork.** It lives in the policy/approval layer above the executor.

---

## What this artifact is NOT

- Not a substitute for the positioning brief (`competitive-2026-04-16.md`).
- Not a public-facing document yet. This is a **reference** for whoever writes the actual HN/Reddit post.
- Not a critique of Scout. The runtime-share is a *good* thing — it validates the architecture.
- Not a marketing claim that RedOS = Scout. RedOS and Scout differ on **identity, policy, and default execution mode** (table above).

---

## Linked resources

- `workspace/research/competitive-2026-04-16.md` — full positioning brief + Versions A/B/C
- `memory/knowledge-research.md` — Microsoft Build 2026 / Scout section
- `memory/knowledge-research.md` — xAI Grok Build Plan Mode entry
- `memory/knowledge-research.md` — Microsoft v2.0 taxonomy
- `memory/knowledge-research.md` — CSA Lethal Trifecta entry
- `memory/knowledge-research.md` — DeepSWE benchmark
- [The New Stack: OpenClaw as Android-equivalent for agents](https://thenewstack.io) — Janakiram MSV, Jun 7
- [Microsoft Build 2026 trust stack](https://devblogs.microsoft.com/foundry/build-2026-open-trust-stack-ai-agents/) — Jun 3
