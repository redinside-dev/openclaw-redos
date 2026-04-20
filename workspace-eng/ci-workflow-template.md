# OpenClaw CI Workflow Template

## 1. Flaky Triage Metadata
- **Retry Count**: Track failed test attempts
- **Quarantine Status**: Auto-flag flaky PRs
- **Test Details**: Logs, screenshots, output

## 2. Bounded Retry Logic
```bash
max_retries=3
for attempt in {1..$max_retries}; do
  run_test
  if [ $? -eq 0 ]; then
    break
  fi
  quarantine_if_flaky
done
```

## 3. Quarantine Labeling
- Auto-add label: `quarantine` to PRs
- Manual override via GitHub API

## 4. Artifact-Rich PRs
- Attach test logs
- Include screenshots
- Embed code snippets

## Integration Points
- **Agent Ecosystem**: Spawn coding agents for test execution
- **Skill System**: Use `coding-agent` for test runs
- **GitHub**: Use `github` skill for PR operations
- **Metadata**: Store in `ci_metadata.json`

## Workflow Steps
1. Spawn coding agent to run tests
2. Capture output and logs
3. Analyze results for flakiness
4. Quarantine if needed
5. Generate PR with artifacts
6. Update metadata

## Example Script
```bash
# ci_workflow.sh
ci_metadata=$(cat ci_metadata.json)
spawn coding-agent --task "run_tests --metadata $ci_metadata"
```

## Configuration
- `max_retries` (configurable)
- `quarantine_threshold` (configurable)
- `artifact_dir` (configurable)

## Security
- Use `sessions_spawn` for GitHub API calls
- Validate all outputs before PR creation

## Testing
- Validate with sample test suite
- Check quarantine logic
