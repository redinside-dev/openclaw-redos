# context-window-optimizer — SPEC.md

## Overview
A Python library that automatically manages conversation context to stay within token limits. Summarizes old messages, preserves critical facts, and reduces cost without losing important context.

## Problem
Long agent conversations hit token limits:
- Context grows unbounded → 429 errors or truncation
- Naive truncation loses important early context
- Manual pruning is tedious and error-prone
- Cost spikes from bloated context on every call

## Solution
A drop-in Python library that wraps your message list and applies smart compression.

## Features
- **Auto-summarize** — condenses old messages into a summary when approaching limit
- **Fact preservation** — extracts and maintains key facts from pruned messages
- **Configurable threshold** — trigger compression at X% of context limit
- **Model-aware** — knows token limits for gpt-4o, claude-3-5-sonnet, etc.
- **tiktoken integration** — accurate token counting
- **Drop-in API** — `messages = optimizer.compress(messages, model="gpt-4o")`

## Tech Stack
- Python 3.11+
- tiktoken (token counting)
- OpenAI API (summarization)
- MIT license

## API
```python
from context_optimizer import ContextOptimizer

optimizer = ContextOptimizer(model="gpt-4o", threshold=0.8)
compressed = optimizer.compress(messages)
# compressed has same format, fits in context window
```

## MVP Scope
1. Token counting for major models
2. Sliding window + summarization strategy
3. Fact extraction (names, decisions, key info)
4. CLI tool: `ctx-compress --input messages.json --model gpt-4o`
5. Pip installable package

## Ready: Yes
