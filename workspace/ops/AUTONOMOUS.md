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

## P1 — PENDING

### RES-TRENDS-20260310 | research | Run web_search for: 'AI agents trends March 2026', 'agentic AI frameworks 2026'. Check HN, Reddit r/LocalLLaMA. Document in workspace/research/trends/YYYY-MM-DD.md. Then research 1 developer pain point from: LLM cost tracking, agent watchdog, A2A protocol, multi-agent queue, PR auto-reviewer, session memory, model router, cron-as-code, dev onboarding, LLM loop detector. Pick highest HN/Reddit traction. Write SPEC.md to workspace/projects/<slug>/. Mark as READY or PENDING. |

### OPS-HEALTH-20260310 | ops | Run system health check. |

## P2 — PENDING

## P3 — PENDING

## TODO

## COMPLETED

## FAILED

## ARCHIVED