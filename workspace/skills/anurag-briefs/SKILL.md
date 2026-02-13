---
name: anurag-briefs
description: Create concise Telegram-friendly briefs and summaries. Use when Anurag asks for a topic brief (e.g., 'Brief: <topic>', 'summarize latest news on <topic>', 'trending <topic>') or when given an X/Twitter link to read/summarize/advice (e.g., 'X: <url>' or any https://x.com/... URL). Enforce canonical preferences: Telegram-only delivery, stocks-only (ignore crypto), EMR=Emerson Electric. Web search policy: use Perplexity web search tool first; if it fails, fall back to Exa MCP (mcporter exa.web_search_exa / exa.web_search_advanced_exa) and disclose fallback.
---

# anurag-briefs

## Output formats

### A) Topic brief (Telegram)
Use this template (keep it short):

- **What happened (5–10 bullets)**
- **Implications (3 bullets)**
- **What to watch next (3 bullets)**
- **Links** (3–8 links, no embeds if possible)

If a user asks for "nightly brief", follow the same structure.

### B) X/Twitter link read

1) Fetch via Jina mirror (Option 1):
   - Rewrite `https://x.com/...` → `https://r.jina.ai/https://x.com/...`
2) If content is blocked but there's an image, open `pbs.twimg.com/media/...` and summarize what the image says.
3) If still blocked, ask Anurag to attach the logged-in X tab via Browser Relay.

Output:
- 5–12 bullets: key points
- 2–4 bullets: my take / advice
- Quote 1–3 notable lines if present

## Guardrails
- **Ignore crypto** unless Anurag explicitly overrides.
- **No external messaging** (email/DMs) unless Anurag explicitly asks.
- Always include provider+model footer.

## References
- Briefing style guide: `references/brief-style.md`
