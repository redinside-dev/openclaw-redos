# Project Spec — llm-observability-hub

**Slug:** llm-observability-hub
**Created:** 2026-03-14
**Author:** RESEARCH agent
**Status:** SPEC (→ BUILDING → SHIPPED)

## Problem
LLM agents and multi-step applications are black boxes, leaving developers scrambling with print logs and ad-hoc dashboards to understand why a run failed or why costs exploded.

## Solution
Ship a lightweight Python observability hub that ingests agent traces, highlights anomalies, and links each step back to prompt/cost data so developers can triage issues in under 5 minutes.

## Stack
- Language: Python
- Framework: FastAPI for the API + Celery for background trace enrichment
- Database: SQLite (local) with optional Postgres switch for scale
- Telemetry: OpenTelemetry SDK + lightweight ingestion adapter

## Files
1. `workspace/projects/llm-observability-hub/api/main.py` — FastAPI endpoints for trace ingestion/query.
2. `workspace/projects/llm-observability-hub/core/tracing.py` — Trace parser, anomaly detector, cost summarizer.
3. `workspace/projects/llm-observability-hub/tasks/enricher.py` — Celery worker that enriches raw traces with prompt/context metadata.
4. `workspace/projects/llm-observability-hub/ui/dashboard.py` — CLI/web dashboard generator for quick triage views.
5. `workspace/projects/llm-observability-hub/tests/test_trace_flow.py` — Coverage for trace parsing and anomaly alerts.

## Core logic
```text
1. POST incoming trace → validate schema + store raw event
2. Enqueue Celery job to join prompt/cost context
3. Enrichment job tags anomalies (latency, cost spike, missing tools)
4. Index enriched entry for search + alert rules
5. GET /incidents filters by anomaly tags + sends Slack alert summary
```
