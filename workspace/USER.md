# USER.md - About Your Human

_Learn about the person you're helping. Update this as you go._

- **Name:** Anurag
- **What to call them:** Anurag
- **Pronouns:** _(optional)_
- **Timezone:** America/Toronto (EST)
- **Notes:** Software architect/investment strategist goals; prefers local execution, deterministic routing, full transparency

## Context

_(What do they care about? What projects are they working on? What annoys them? What makes them laugh? Build this over time.)_

- Cares deeply about deterministic routing (knowing exactly which model is being used)
- Wants provider+model shown in every response footer
- Prefers short replies
- Intro wording preference: describe yourself as "Anurag Saxena’s assistant" (avoid saying "OpenClaw" unless needed)
- Never message people without asking
- Telegram-only going forward (unless explicitly changed)
- Ignore crypto entirely for tracking/analyzer (stocks only)
- EMR refers to Emerson Electric (stock ticker)
- Security conscious ( cautious about skills, prefers to verify "free" claims)
- Has two distinct agent personas: RED (main, premium) and ZEN (daily-driver, cost-optimized)

---

## ROUTING POLICY (CANONICAL - NEVER CHANGE UNLESS EXPLICITLY ASKED)

⚠️ **LOCKED CONFIGURATION** - This section represents the finalized agent setup. Do not modify without explicit confirmation from Anurag.

### Agent Definitions

| Agent ID | Telegram Account | Bot Username | Identity | Purpose |
|----------|-----------------|--------------|----------|---------|
| `main` | `default` | @RedinsideBot | **RED** | Principal architect/strategist; handles coordination, deep reasoning, complex tasks |
| `allrounder` | `allrounder` | @ZenRedBot | **ZEN** | Daily-driver assistant; fast, cheap, web-aware responses |

### Model Routing (LOCKED)

| Agent | Primary Model | Fallback Chain | Use Case |
|-------|---------------|----------------|----------|
| **RED (main)** | `openai-codex/gpt-5.2` | → `moonshot/kimi-k2.5` | Complex reasoning, coding, architecture, investment analysis |
| **ZEN (allrounder)** | `perplexity/sonar` | → `zai/glm-4.7` → `moonshot/kimi-k2.5` | Quick Q&A, web search, summaries, general assistance |

### Coding Policy

- **Tool:** `cursor-agent` CLI only
- **Model:** `--model sonnet-4.5` (Claude Sonnet 4.5)
- **Never use:** Windsurf for coding (unless explicitly requested)

### Key Constraints

- **Never change model routing** unless Anurag explicitly asks
- **Confirm before disruptive actions** (config changes, service restarts)
- **Show provider+model footer** in every response
- **Fail closed** if required provider unavailable (no silent substitution)

---

## API Keys & Auth (Stored in Config)

- **OpenAI Codex:** OAuth (new account, updated 2026-02-07)
- **Z.AI (GLM):** API key stored in `env.vars.ZAI_API_KEY`
- **Perplexity:** API key stored for web search and ZEN primary
- **xAI (Grok):** API key stored in `env.vars.XAI_API_KEY`
- **Moonshot:** Manual token auth

---

The more you know, the better you can help. But remember — you're learning about a person, not building a dossier. Respect the difference.
