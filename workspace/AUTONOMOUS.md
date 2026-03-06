## P0 — PENDING (2026-03-06T14:10Z)

### Security Tasks
- SEC-ROTATE-TELEGRAM-20260306 | infosec+ops | **High**: Plaintext Telegram bot token(s) detected in repo config/backup artifacts (openclaw.json + backups). Action: revoke/rotate token(s); migrate to secrets store; scrub plaintext occurrences (including backups); verify no token remains via secret-scan; document rotation timestamp. |
- SEC-ROTATE-OPENAI-20260306 | infosec+ops | **High**: OpenAI-style `sk-` key detected in agent config files (agents/*/agent/auth-profiles.json, agents/*/agent/models.json). Action: revoke/rotate key(s); move to secrets store/env; scrub plaintext; confirm key not committed to git history. |
- SEC-ROTATE-SLACK-20260306 | infosec+ops | **High**: Plaintext Slack bot token pattern (xoxb-) previously detected in workspace files/tests/backups (per audit_log). Action: rotate/revoke Slack token(s); scrub plaintext occurrences; ensure backups don’t retain secrets; validate Slack integration still works post-rotation. |
- SEC-HYGIENE-SCAN-20260306 | infosec | **High**: Add/enable automated secret scanning (pre-commit + CI) and a hard rule: no secrets in openclaw.json/backups. Add patterns (xoxb-, sk-, Telegram token), plus remediation checklist. |

## P1 — PENDING (2026-03-06T14:10Z)

### Security Tasks
- SEC-ACCESS-LEASTPRIV-20260306 | infosec | **Medium**: Review broad admin grant `workspace/security/*` with `execute`. Tighten scope (remove execute unless justified), shorten TTL, and document rationale. |

## P1 — IN_PROGRESS (2026-03-06T12:43Z)

### Research Tasks
- RES-TRENDS-20260306 | research | Run web_search for: 'AI agents trends March 2026', 'agentic AI frameworks 2026'. Check HN, Reddit r/LocalLLaMA. Document in workspace/research/trends/YYYY-MM-DD.md. Then research 1 developer pain point from: LLM cost tracking, agent watchdog, A2A protocol, multi-agent queue, PR auto-reviewer, session memory, model router, cron-as-code, dev onboarding, LLM loop detector. Pick highest HN/Reddit traction. Write SPEC.md to workspace/projects/<slug>/. Mark as READY or PENDING. |

### Engineering Tasks
- PRJ-ENG-20260306 | eng | Check workspace/projects/backlog.md for any READY project → add: Pick first READY spec. Run: bash scripts/create-project-repo.sh <slug> "<desc>". Implement MVP, add GitHub Actions CI (.github/workflows/), verify CI passes, open PR, log to pr-log.md. |

### Ops Tasks
- OPS-HEALTH-20260307 | ops | Run system health check (cron:health-001) |

## P1 — IN_PROGRESS (2026-03-06T12:43Z)

### Research Tasks
- RES-TRENDS-20260307 | research | Run web_search for: 'AI agents trends March 2026', 'agentic AI frameworks 2026'. Check HN, Reddit r/LocalLLaMA. Document in workspace/research/trends/YYYY-MM-DD.md. Then research 1 developer pain point from: LLM cost tracking, agent watchdog, A2A protocol, multi-agent queue, PR auto-reviewer, session memory, model router, cron-as-code, dev onboarding, LLM loop detector. Pick highest HN/Reddit traction. Write SPEC.md to workspace/projects/<slug>/. Mark as READY or PENDING. |

### Engineering Tasks
- PRJ-ENG-20260307 | eng | Check workspace/projects/backlog.md for any READY project → add: Pick first READY spec. Run: bash scripts/create-project-repo.sh <slug> "<desc>". Implement MVP, add GitHub Actions CI (.github/workflows/), verify CI passes, open PR, log to pr-log.md. |

### Ops Tasks
- OPS-HEALTH-20260307 | ops | Run system health check (cron:health-001) |

## P2 — ACTIVE

## P3 — BACKLOG