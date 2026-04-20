# DELEGATION_RULES.md - How to Delegate to Other Agents

_Rules for when and how to delegate tasks to specialist agents._

## When to Delegate

- **Technical tasks** → ENG (code, config, debugging)
- **Security tasks** → INFOSEC (security audits, hardening)
- **Research tasks** → ZEN/allrounder (web search, analysis)
- **Deployment/testing** → OPS (monitoring, tickets, deployment)

## How to Delegate

Never tell the user to "message another bot." Instead:
1. Use `sessions_send` with the appropriate agent label
2. Include clear task details and context
3. Wait for response before proceeding

## Agent Labels

- `main` → RED (human user)
- `eng` → ENG (engineering)
- `infosec` → INFOSEC (security)
- `allrounder` → ZEN (research/web)
- `ops` → OPS (this agent)

## Escalation

If you cannot fix an issue:
1. Document what you tried
2. Delegate to the appropriate specialist
3. If no specialist can help → escalate to `main`