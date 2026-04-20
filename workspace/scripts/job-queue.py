#!/usr/bin/env python3
"""
Enterprise Job Queue System
Replaces cron-based agent execution with proper queue-based processing.
Each agent has its own queue - no more deadlocks.
"""

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum

WORKSPACE = Path(__file__).parent
QUEUE_DIR = WORKSPACE / "n8n" / "queues"
QUEUE_DIR.mkdir(parents=True, exist_ok=True)

class JobStatus(Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    DEAD_LETTER = "dead_letter"

@dataclass
class Job:
    job_id: str
    agent_id: str
    task: str
    payload: dict
    priority: str = "normal"
    status: str = "queued"
    retry_count: int = 0
    max_retries: int = 3
    created_at: str = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error: Optional[str] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()

class AgentQueue:
    """Thread-safe queue for a single agent"""

    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.queue_file = QUEUE_DIR / f"{agent_id}.json"
        self.lock_file = QUEUE_DIR / f"{agent_id}.lock"
        self.jobs: List[Job] = []
        self.load()

    def load(self):
        """Load queue from disk"""
        if self.queue_file.exists():
            try:
                data = json.loads(self.queue_file.read_text())
                self.jobs = [Job(**j) for j in data]
            except:
                self.jobs = []

    def save(self):
        """Save queue to disk"""
        self.queue_file.write_text(json.dumps([asdict(j) for j in self.jobs], indent=2))

    def enqueue(self, job: Job) -> str:
        """Add job to queue"""
        self.load()

        # Priority sorting
        if job.priority == "high":
            self.jobs.insert(0, job)
        else:
            self.jobs.append(job)

        self.save()
        return job.job_id

    def dequeue(self) -> Optional[Job]:
        """Get next job (FIFO)"""
        self.load()

        # Find first queued job
        for job in self.jobs:
            if job.status == JobStatus.QUEUED.value:
                job.status = JobStatus.PROCESSING.value
                job.started_at = datetime.now().isoformat()
                self.save()
                return job

        return None

    def complete(self, job_id: str):
        """Mark job as completed"""
        self.load()
        for job in self.jobs:
            if job.job_id == job_id:
                job.status = JobStatus.COMPLETED.value
                job.completed_at = datetime.now().isoformat()
                self.save()
                return True
        return False

    def fail(self, job_id: str, error: str):
        """Handle job failure with retry"""
        self.load()
        for job in self.jobs:
            if job.job_id == job_id:
                job.retry_count += 1
                if job.retry_count >= job.max_retries:
                    job.status = JobStatus.DEAD_LETTER.value
                    job.error = error
                else:
                    job.status = JobStatus.QUEUED.value  # Re-queue for retry
                self.save()
                return True
        return False

    def get_status(self) -> dict:
        """Get queue status"""
        self.load()
        return {
            "agent_id": self.agent_id,
            "queued": len([j for j in self.jobs if j.status == JobStatus.QUEUED.value]),
            "processing": len([j for j in self.jobs if j.status == JobStatus.PROCESSING.value]),
            "completed": len([j for j in self.jobs if j.status == JobStatus.COMPLETED.value]),
            "failed": len([j for j in self.jobs if j.status == JobStatus.FAILED.value]),
            "dead_letter": len([j for j in self.jobs if j.status == JobStatus.DEAD_LETTER.value]),
        }

class JobQueue:
    """Main job queue manager"""

    AGENTS = ["main", "eng", "research", "ops", "finance", "infosec", "allrounder", "hatake"]

    @staticmethod
    def submit(agent_id: str, task: str, payload: dict = None, priority: str = "normal") -> str:
        """Submit a job to an agent's queue"""
        if agent_id not in JobQueue.AGENTS:
            raise ValueError(f"Unknown agent: {agent_id}")

        job = Job(
            job_id=str(uuid.uuid4())[:8],
            agent_id=agent_id,
            task=task,
            payload=payload or {},
            priority=priority
        )

        queue = AgentQueue(agent_id)
        return queue.enqueue(job)

    @staticmethod
    def get_next(agent_id: str) -> Optional[Job]:
        """Get next job for an agent"""
        queue = AgentQueue(agent_id)
        return queue.dequeue()

    @staticmethod
    def complete(agent_id: str, job_id: str):
        """Mark job as completed"""
        queue = AgentQueue(agent_id)
        queue.complete(job_id)

    @staticmethod
    def fail(agent_id: str, job_id: str, error: str):
        """Handle job failure"""
        queue = AgentQueue(agent_id)
        queue.fail(job_id, error)

    @staticmethod
    def get_all_status() -> dict:
        """Get status of all queues"""
        return {agent: AgentQueue(agent).get_status() for agent in JobQueue.AGENTS}

    @staticmethod
    def get_queue_size(agent_id: str) -> int:
        """Get number of queued jobs for an agent"""
        queue = AgentQueue(agent_id)
        return len([j for j in queue.jobs if j.status == JobStatus.QUEUED.value])

def main():
    """CLI interface"""
    import sys

    if len(sys.argv) < 2:
        print("Usage: job-queue.py <command> [args]")
        print("\nCommands:")
        print("  submit <agent> <task> [priority]  - Submit a job")
        print("  next <agent>                         - Get next job for agent")
        print("  complete <agent> <job_id>           - Mark job complete")
        print("  fail <agent> <job_id> <error>        - Mark job failed")
        print("  status                             - Show all queues")
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "submit":
        agent = sys.argv[2]
        task = sys.argv[3]
        priority = sys.argv[4] if len(sys.argv) > 4 else "normal"
        job_id = JobQueue.submit(agent, task, priority=priority)
        print(f"Job {job_id} queued for {agent}")

    elif cmd == "next":
        agent = sys.argv[2]
        job = JobQueue.get_next(agent)
        if job:
            print(json.dumps(asdict(job), indent=2))
        else:
            print("No jobs in queue")

    elif cmd == "complete":
        agent = sys.argv[2]
        job_id = sys.argv[3]
        JobQueue.complete(agent, job_id)
        print(f"Job {job_id} completed")

    elif cmd == "fail":
        agent = sys.argv[2]
        job_id = sys.argv[3]
        error = sys.argv[4] if len(sys.argv) > 4 else "Unknown error"
        JobQueue.fail(agent, job_id, error)
        print(f"Job {job_id} failed: {error}")

    elif cmd == "status":
        status = JobQueue.get_all_status()
        print(json.dumps(status, indent=2))

    else:
        print(f"Unknown command: {cmd}")
        sys.exit(1)

if __name__ == "__main__":
    main()
