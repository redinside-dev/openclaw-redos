# AUTONOMOUS.md - Autonomous Task Management

## Task States

- **PENDING**: Ready to be picked up by the dispatcher
- **IN_PROGRESS**: Currently being worked on by an agent
- **COMPLETED**: Finished successfully
- **FAILED**: Completed with errors
- **BLOCKED**: Cannot proceed due to dependencies

## Task Format

```markdown
## [YYYY-MM-DD HH:MM] — [Task ID] — [Agent]
- **Status**: [PENDING|IN_PROGRESS|COMPLETED|FAILED|BLOCKED]
- **Description**: [Brief description of the task]
- **Started**: [Timestamp when task began]
- **Last Updated**: [Timestamp of last status change]
- **Agent**: [Agent ID that picked up the task]
- **Notes**: [Optional additional context]
```

## Current Tasks

*(This section will be populated by the dispatcher)*