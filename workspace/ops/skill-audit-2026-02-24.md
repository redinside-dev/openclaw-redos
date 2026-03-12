# Skill Audit — 2026-02-24

## Snapshot
- Skills present in `workspace/skills/`: **34**
- Skills enabled in `openclaw.json` (`skills.entries.*.enabled=true`): **28**
- Present but **NOT enabled**: **6**

## Present but NOT Enabled (needs decision)
1. `autonomy-scorecard` — recommend **enable** (OPS daily score / reliability KPI).
2. `config-ci-gate` — recommend **enable** (guardrail: run `openclaw doctor` before/after config edits).
3. `enhanced-tools` — recommend **review** (unknown contents; likely quality-of-life wrappers).
4. `self-healing-auto` — recommend **enable** (autonomous Level-1 recovery; complements self-healing-protocol).
5. `tool-call-validator` — recommend **enable** (mandatory per SOUL.md; preflight tool calls; catches schema drift).
6. `tool-governance` — recommend **enable** (governance/lint for tool calls; safety + correctness).

## Enabled (28)
- 9router-setup
- a2a-transparency
- agent-autonomy-kit
- ai-humanizer
- anurag-briefs
- clawdhub
- cloud-code-bridge
- competitive-intelligence
- cost-tracker
- eng-coding
- exa-mcp
- hatake-parser
- holdings-analyzer
- mcp-context7
- mission-control-telegram
- model-usage
- proactive-agent-1-2-4
- prompt-engineering
- reflect-learn
- research
- retry-cascade
- self-healing-protocol
- smart-router
- status-reporter
- summarize
- ta[REDACTED]
- web-search
- x-mirror

## Usage Evidence (high level)
This audit only checks enablement state vs installed skill folders.
A follow-up audit should check **actual usage** (references in cron/jobs.json + agent tool calls + docs) to answer:
- which enabled skills are actively used
- which are enabled but idle

## Next Steps (per CEO directive)
- Enable the 6 missing skills (if approved) and re-run this audit.
- Delegate to each agent to adopt relevant skills.
