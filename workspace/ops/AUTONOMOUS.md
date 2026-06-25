# AUTONOMOUS.md - Autonomous Operations

This file contains tasks that can be executed autonomously by agents without human approval.

## Available Tasks

### Task Categories

#### 1. System Maintenance
- **cron**: Run scheduled tasks and SLA enforcement
- **healthcheck**: System health and security audits
- **logs**: Log rotation and cleanup

#### 2. Development
- **build**: Compile and build projects
- **test**: Run test suites
- **deploy**: Deploy to staging/production

#### 3. Data Processing
- **ingest**: Process incoming data feeds
- **transform**: Data transformation and ETL
- **export**: Generate reports and exports

#### 4. Communication
- **notify**: Send notifications and alerts
- **monitor**: Monitor system status
- **respond**: Handle routine inquiries

## Status Tracking

Tasks are tracked using status labels:
- **PENDING**: Ready to be executed
- **TODO**: Currently being executed
- **COMPLETED**: Successfully finished
- **FAILED**: Execution failed

## SLA Rules

- Tasks must be completed within defined timeframes
- Violations are logged to `workspace/logs/sla-violations.log`
- Critical tasks have higher priority

## Example Task Structure

```markdown
### Task Name
**ID:** unique-id
**Category:** system-maintenance
**SLA:** 10 minutes
**Status:** PENDING
**Description:** Brief description of what the task does
**Last Run:** 2025-01-01 12:00:00
**Next Run:** 2025-01-01 12:10:00
```

## ARCHIVED

### RES-TRENDS-20260310 | research | — Stale task from 2026-03-10 (15+ days old, never executed). Archived 2026-03-25.
### OPS-HEALTH-20260310 | ops | — Stale task from 2026-03-10 (15+ days old, never executed). Archived 2026-03-25.
### OPS-HEALTH-20260409-001 | ops | ✅ CLOSED 2026-04-17 — System healthy. Gateway✅ LaunchAgent✅ cron✅. Critical: MiniMax key returning 401; fallback to 9router/always-on-premium functional. New ticket OPS-MINIMAX-AUTH-20260417-001 created.
### OPS-AGENT-AUDIT-20260409-001 | ops | ✅ CLOSED 2026-04-17 — All agents reachable (sessions_list confirmed). Cron list shows all agents active. No stuck agents.
### OPS-LOGS-REVIEW-20260409-001 | ops | ✅ CLOSED 2026-04-17 — Log review done inline. Findings: (1) MiniMax 401 auth failures since 23:15 today, (2) Slack WebSocket pong timeout 5000ms, (3) announce delivery failure. Merged into new P1 ticket.

## P3 — PENDING

_(none)_

## P1 — PENDING

## TODO

### OPS-MINIMAX-AUTH-20260417-001 | P1 | ops | MiniMax API Key Auth Failure
**ID:** OPS-MINIMAX-AUTH-20260417-001
**Category:** system-maintenance
**SLA:** 2 hours (BREACHED — 60+ days overdue)
**Status:** TODO
**Description:** minimax/MiniMax-M2.7 returning HTTP 401 (invalid api key) since 2026-04-17 23:15. System falls back to 9router/always-on-premium (functional). MiniMax key needs renewal or config check. Affects all agents using default model.
**Created:** 2026-04-17T23:17 UTC
**Claimed By:** ops (2026-06-17T10:36Z)
**Claimed Reason:** heartbeat-task-router-0001 cron detected 60-day-old PENDING; escalating to RED — credential renewal is a human action, not agent-dispatchable.
**Next Action:** sessions_send RED with credential-renewal ask.

## COMPLETED

## FAILED

## ARCHIVED

## TODO

## COMPLETED

## FAILED

## ARCHIVED
