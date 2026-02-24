# ENG Coding Factory Pipeline
# Deterministic, resumable, approval-gated workflow for autonomous code tasks
# Usage: lobster run eng-coding-factory.lobster --input '{"task":"<description>","repo":"/path/to/repo"}'

exec --json --shell 'echo "{\"step\":\"intake\",\"task\":\"$TASK\",\"repo\":\"$REPO\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"'
| exec --stdin json --shell 'jq -r "\"Task received: \" + .task"'
| exec --stdin json --shell '
  REPO=$(echo $STDIN | jq -r .repo)
  TASK=$(echo $STDIN | jq -r .task)
  # Create isolated git worktree for this task
  BRANCH="agent/$(date +%Y%m%d-%H%M%S)-task"
  git -C "$REPO" worktree add "/tmp/openclaw-worktree-$$" -b "$BRANCH" 2>&1
  echo "{\"worktree\":\"/tmp/openclaw-worktree-$$\",\"branch\":\"$BRANCH\",\"task\":\"$TASK\",\"repo\":\"$REPO\"}"
'
| approve --preview-from-stdin --prompt "ENG is about to create a git worktree and start coding. Approve?" --limit 1
| exec --stdin json --shell '
  WORKTREE=$(echo $STDIN | jq -r .worktree)
  TASK=$(echo $STDIN | jq -r .task)
  # Run tests before making changes (baseline)
  cd "$WORKTREE"
  TEST_RESULT=$(npm test 2>&1 || python -m pytest 2>&1 || echo "no tests found")
  echo "{\"worktree\":\"$WORKTREE\",\"task\":\"$TASK\",\"baseline_tests\":\"$TEST_RESULT\"}"
'
| exec --stdin json --shell '
  # Write task brief for ENG agent to pick up
  WORKTREE=$(echo $STDIN | jq -r .worktree)
  TASK=$(echo $STDIN | jq -r .task)
  cat > "$WORKTREE/TASK.md" << TASKEOF
# Task Brief
$TASK

## Instructions
1. Implement the task described above
2. Write tests for your implementation
3. Ensure all existing tests still pass
4. Commit with a clear message
TASKEOF
  echo "{\"worktree\":\"$WORKTREE\",\"task\":\"$TASK\",\"brief_written\":true}"
'
| exec --stdin json --shell '
  WORKTREE=$(echo $STDIN | jq -r .worktree)
  TASK=$(echo $STDIN | jq -r .task)
  # Run tests after implementation
  cd "$WORKTREE"
  TEST_RESULT=$(npm test 2>&1 || python -m pytest 2>&1 || echo "no tests found")
  PASS=$(echo "$TEST_RESULT" | grep -c "pass\|PASS\|ok\|OK" || echo "0")
  FAIL=$(echo "$TEST_RESULT" | grep -c "fail\|FAIL\|error\|ERROR" || echo "0")
  echo "{\"worktree\":\"$WORKTREE\",\"task\":\"$TASK\",\"test_output\":\"$TEST_RESULT\",\"pass\":$PASS,\"fail\":$FAIL}"
'
| approve --preview-from-stdin --prompt "Tests complete. Review results and approve merge to main?" --limit 1
| exec --stdin json --shell '
  WORKTREE=$(echo $STDIN | jq -r .worktree)
  REPO=$(echo $STDIN | jq -r .repo)
  BRANCH=$(git -C "$WORKTREE" branch --show-current)
  # Merge back to main
  git -C "$REPO" merge "$BRANCH" --no-ff -m "feat: agent task complete — merged $BRANCH"
  # Clean up worktree
  git -C "$REPO" worktree remove "$WORKTREE" --force
  echo "{\"status\":\"merged\",\"branch\":\"$BRANCH\",\"repo\":\"$REPO\"}"
'
