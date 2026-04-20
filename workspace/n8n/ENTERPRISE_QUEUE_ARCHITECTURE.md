# Enterprise Job Queue Architecture

## Overview
Scalable job processing system using n8n to prevent deadlocks and enable infinite scale.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    n8n Orchestrator                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │         Job Queue (n8n Queue)                │    │
│  │  - FIFO: First In, First Out                │    │
│  │  - Retry: Exponential backoff               │    │
│  │  - Dead Letter: Failed jobs for review      │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   ┌─────────┐       ┌─────────┐       ┌─────────┐
   │  Agent │       │  Agent  │       │  Agent  │
   │  Queue │       │  Queue  │       │  Queue  │
   │  (ENG) │       │  (OPS)  │       │ (RESEARCH)│
   └────┬────┘       └────┬────┘       └────┬────┘
        │                 │                 │
        ▼                 ▼                 ▼
   ┌─────────┐       ┌─────────┐       ┌─────────┐
   │ Webhook │       │ Webhook │       │ Webhook │
   │  /job   │       │  /job   │       │  /job   │
   │  /eng   │       │  /ops   │       │  /research│
   └─────────┘       └─────────┘       └─────────┘
```

## n8n Webhook Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /webhook/job/eng` | Submit job to ENG agent |
| `POST /webhook/job/ops` | Submit job to OPS agent |
| `POST /webhook/job/research` | Submit job to RESEARCH agent |
| `POST /webhook/job/main` | Submit job to MAIN (CEO) |
| `GET /webhook/status/{jobId}` | Check job status |
| `GET /webhook/queue/status` | Queue overview |

## Job Schema

```json
{
  "jobId": "uuid",
  "agentId": "eng|ops|research|main|...",
  "task": "description",
  "priority": "high|normal|low",
  "payload": {},
  "status": "queued|processing|completed|failed|dead_letter",
  "retryCount": 0,
  "maxRetries": 3,
  "createdAt": "ISO timestamp",
  "startedAt": "ISO timestamp",
  "completedAt": "ISO timestamp",
  "error": "error message if failed"
}
```

## Features

1. **Per-Agent Queues** - Each agent processes one job at a time
2. **Automatic Retry** - Failed jobs retry with exponential backoff
3. **Dead Letter Queue** - Jobs that fail 3x go to DLQ for review
4. **Status Tracking** - Every job tracked from start to finish
5. **Rate Limiting** - Prevent agent overwhelm
6. **Monitoring Dashboard** - See all queues at a glance

## File Structure

```
workspace/
├── n8n/
│   ├── workflows/
│   │   ├── agent-dispatcher.json    # Main dispatcher
│   │   ├── eng-queue.json         # ENG agent worker
│   │   ├── ops-queue.json         # OPS agent worker
│   │   ├── research-queue.json    # RESEARCH agent worker
│   │   └── main-queue.json      # MAIN agent worker
│   ├── jobs/
│   │   └── job-status.json      # Job status storage
│   └── README.md                 # Documentation
```
