# POLICY.md

## Locked baselines (2026-02-08)
- Default interaction channel: Telegram-only.
- Markets: stocks only; ignore crypto entirely.
- If user says "EMR", interpret as Emerson Electric (ticker: EMR).

## Model routing (ZEN)
- Primary: openai-codex/gpt-5.2
- Fallbacks: zai/glm-4.7 → moonshot/kimi-k2.5
- Perplexity web search tool: model id must be "sonar".
- Codex OAuth uses account: io.anuragsaxena@gmail.com.

(“Locked” here means treat as canonical until Anurag updates it.)
