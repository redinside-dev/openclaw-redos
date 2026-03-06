# Task Runner Skill

## Purpose
Manage the full lifecycle of projects: create, plan, dispatch, track, verify, deliver.

## Task State Machine

```
INTAKE → PLANNING → QUEUED → IN_PROGRESS → IN_REVIEW → DONE → DELIVERED

  From IN_PROGRESS:  → BLOCKED (waiting for input)
                     → FAILED (retry cascade triggered)

  From IN_REVIEW:    → REVISION (needs fixes, goes back to IN_PROGRESS)

  From FAILED:       → QUEUED (after successful retry)
                     → BLOCKED (escalated to human)

  Terminal states:   DELIVERED, CANCELLED
```

## Commands

### Create Project
When a HATAKE brief arrives:
1. Generate ID: `PROJ-{YYYYMMDD}-{3-digit-sequence}`
2. Run: `bash workspace/skills/ta[REDACTED] {id} "{brief}"`
3. Fill state.json with brief data
4. Create task breakdown (see "Break into Tasks" below)

### Break into Tasks
Read the HATAKE brief and the smart-router's model assignments. For each department needed:

```json
{
  "task_id": "T-{sequence}",
  "title": "Descriptive task title",
  "agent": "eng|research|finance|ops",
  "model": "model-id (from smart-router)",
  "status": "queued",
  "depends_on": ["T-001"],
  "acceptance_criteria": ["Output file exists", "Code parses", "Tests pass"],
  "output_path": "workspace/projects/{project_id}/deliverables/{filename}",
  "timeout_seconds": 300,
  "started": null,
  "completed": null,
  "cost": 0,
  "retries": 0
}
```

**Task ordering rules:**
- RESEARCH tasks run first (gather context for others)
- ENG tasks depend on RESEARCH output (when research is needed)
- OPS validation depends on ENG completion
- RED review/delivery is always last
- Parallelize tasks that don't depend on each other

### Dispatch Task
When all dependencies are met (all depends_on tasks have status == "done"):
1. Run: `bash workspace/skills/ta[REDACTED] {project} {task} {agent} "{message}"`
2. Build the task prompt (see below)
3. Start timeout timer

**Task prompt template:**
```
You have been assigned a task by RED (CEO).

PROJECT: {project_id}
TASK: {task_id} — {title}
PRIORITY: {priority}
DEADLINE: {deadline or "ASAP"}

INSTRUCTIONS:
{detailed task description}

ACCEPTANCE CRITERIA:
{numbered list of criteria}

OUTPUT:
Save your output to: {output_path}

CONTEXT:
{include relevant outputs from completed dependency tasks}

When done, report back with:
- task_id: {task_id}
- status: done
- output_path: {path where you saved output}
- issues: {any problems encountered}
```

### Monitor Progress
While tasks are IN_PROGRESS:
- Check every 60 seconds if agent has produced output
- If timeout exceeded → trigger retry-cascade skill
- If task blocked → update state, notify RED

### Verify Output
When agent reports completion, run these checks:

| Check | For Code | For Reports | For Data |
|-------|----------|-------------|----------|
| File exists at output_path | ✓ | ✓ | ✓ |
| File is non-empty (>0 bytes) | ✓ | ✓ | ✓ |
| Syntax valid | Parse check | — | JSON/CSV valid |
| Minimum substance | >20 lines | >100 words | >5 rows |
| Acceptance criteria met | Check each | Check each | Check each |

- ALL pass → status: "done"
- ANY fail → status: "in_review", RED notified with details

### Deliver Project
When all tasks are "done":
1. Collect all outputs into `workspace/projects/{id}/deliverables/`
2. Generate summary:
   ```
   ✅ Project {id} — {title} — DELIVERED
   
   Tasks completed: {n}
   Total time: {minutes} minutes
   Total cost: ${x.xx}
   
   Deliverables:
   • {file1} — {description}
   • {file2} — {description}
   ```
3. Send to owner via Telegram (with file attachments if small enough)
4. Update state.json: status → "delivered"
5. Log completion to audit.jsonl

## Scripts

### create-project.sh
Creates project directory from template and initializes state.json.
Usage: `bash create-project.sh PROJ-20260211-001 "Build a portfolio website"`

### update-task.sh
Updates a task's status in state.json.
Usage: `bash update-task.sh PROJ-20260211-001 T-001 done`

### dispatch-task.sh
Sends a task to an agent and updates tracking.
Usage: `bash dispatch-task.sh PROJ-20260211-001 T-001 eng "Build the React scaffold..."`
