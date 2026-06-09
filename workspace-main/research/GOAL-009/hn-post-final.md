# Show HN: RedOS — Human-in-the-Loop Agent Orchestration

**One line:** Every AI agent asks permission before it acts. Because "it seemed like a good idea at 3am" isn't a compliance strategy.

---

> **Provenance.** This is the final HN-targeted post draft for **GOAL-009** (TICKET-20260416-009, closed by RESEARCH 2026-04-16 19:15 EDT). The analytical work is complete; this artifact is the version-controlled ship candidate, ready for Anurag's voice.
>
> **Source documents (not in this repo):**
> - `workspace/research/competitive-2026-04-16.md` — original competitive brief
> - `workspace/research/redos-positioning-drafts-2026-04-17.md` — drafts A/B/C (HN + Reddit)
> - `workspace-research/memory/hn-post-GOAL-009.md` — earlier HN-targeted version (this is the rebased copy, content unchanged)
> - `workspace/research/aligned-by-design-2026-06-08.md` — reinforced brief, 6 fresh market signals (MS Build 2026/Scout, xAI Plan Mode, CSA Lethal Trifecta, MS AI Red Team v2.0, DeepSWE, Nvidia OpenShell/Hermes/Manus)
>
> **Status (per RED 2026-06-08 20:05Z):** Awaits Anurag pick on (1) target community, (2) final wording. ZEN's default recommendation: HN first, ship as-is. Default-close 2026-06-15 EDT — after that, drafts are archived.
>
> **Blocker for live HN post:** Browser login session. Prior agents (e.g. RESEARCH 2026-04-20) confirmed the `gh` and other agent-driven paths cannot bypass HN's no-OAuth-for-agents wall. A logged-in human (Anurag) must submit via `news.ycombinator.com/submit`. The plan that unblocks: (a) ship this artifact to version control (this commit), (b) create a public GitHub Gist (link below once created), (c) Anurag pastes gist URL into HN submit form.

---

## The Problem Nobody Is Talking About

The agentic AI market is projected to grow from **$8.5B (2026) to $35B (2030)** — Deloitte's TMT Predictions 2026. Every major platform is racing to give you autonomous agents that work while you sleep. Cursor, Devin, Claude Code Routines, OpenAI Codex Computer Use — they're all converging on the same idea: agents that act continuously, in the background, without stopping to ask.

That's the problem.

Agents that run without approval are agents that can make decisions you didn't intend. They chain actions. They call each other. They open PRs, send emails, and deploy code — and when something goes wrong, the audit trail shows only outcomes, not decisions.

The accountability gap is real. Gartner projects "death by AI" legal claims will exceed 2,000 by end of 2026. Not because AI is malicious — because autonomous agents don't pause to ask.

---

## What RedOS Is

RedOS is an open-source agent orchestration platform that treats human approval as a first-class architectural feature, not an afterthought.

Every agent action requires explicit permission before execution. You configure which agents can act autonomously, which require approval, and which are blocked entirely. The architecture is opinionated: agents propose, humans decide, decisions are logged.

Built on OpenClaw with 8 specialist agents running on your own machine. Works with Claude Code, Codex, or any agent that can run a shell command. No cloud dependency. No lock-in to any one model or IDE.

---

## The Core Loop

```
You: "Run a security audit on our API"
RedOS: [dispatches agent] → [agent proposes changes] → [waits for your approval] → [executes approved actions]
```

Each agent runs in its own isolated workspace. You see what it found, what it plans to do, and what it'll touch — before anything happens. Approve, modify, or block. Zero surprise deploys.

---

## The Market Timing

Deloitte's prediction is that better orchestration will push the 2030 market from $35B to $45B. That's a $10B bet on the premise that coordination + human oversight = compounding value.

But here's the tension in the market right now:

| Platform | What it does | The gap |
|----------|-------------|---------|
| Cursor 3 | IDE agents, parallel execution | No human approval gate |
| Devin | Cloud autonomous coding | No human in the loop |
| Claude Code Routines | Scheduled cloud automation | No human in the loop |
| OpenAI Codex Computer Use | Mac GUI automation | No human in the loop |

All four are racing to add more agents, more tools, more autonomy. None of them has a meaningful answer to "who approved this decision at 3am."

RedOS fills that gap.

---

## The Positioning

> *Cursor writes your code. Devin works while you sleep. RedOS runs your company — with you in the driver's seat.*

---

## What You Can Do With It

- **Security-first automation:** agents that find vulnerabilities, draft fixes, and wait for your approval before touching anything
- **Multi-agent coordination:** agents that delegate to each other with human oversight at every handoff
- **Audit-ready workflows:** every decision logged as a decision, not just an outcome
- **Local execution:** agents run on your machine, in your environment, with your credentials — not on a third-party cloud
- **Model-agnostic:** works with Claude, GPT, Gemini, or any model that exposes a CLI

---

## Technical Stack

- **Platform:** OpenClaw (macOS, self-hosted)
- **Agents:** 8 specialist agents (ENG, OPS, RESEARCH, FINANCE, INFOSEC, ZEN, HATAKE, MAIN)
- **Approval model:** permission-based, configurable per-agent, per-action-type
- **Isolation:** each agent runs in its own workspace/process
- **Protocols:** A2A (Google), MCP (Anthropic) — no vendor lock-in
- **Language:** Shell/Native tools, no custom runtime required

---

## Why Now

The EU AI Act's high-risk obligations are effective August 2026. Colorado AI Act is enforceable June 2026. Enterprises are being forced to answer "how do you govern agent decisions?" — and the tools that have the governance answer ready are the ones that'll win.

RedOS built accountability in from day one. Not because we predicted the regulatory timeline — because we believed that agents that ask first are better agents.

The market is about to agree.

---

## Get Involved

- **GitHub:** [openclaw/redos](https://github.com/openclaw/redos) — coming soon
- **Docs:** [redos.ai](https://redos.ai) — coming soon
- **Community:** #redos-mission-control on Slack

We're a small team building the OS-layer for AI agents. If this resonates with you — architect, security engineer, platform builder — we'd love to talk.

---

**AMA. Especially on:** governance patterns, multi-agent architecture, EU AI Act compliance, or how we think about the autonomy/trust tradeoff.
