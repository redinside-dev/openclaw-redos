#!/bin/bash
# ═══════════════════════════════════════════════════════════
# AgentOS — End-to-End Pipeline Test
# Tests every component of the system in order.
# Run after deployment to verify everything works.
# ═══════════════════════════════════════════════════════════

set -e

OPENCLAW_DIR="$HOME/.openclaw"
WORKSPACE="$OPENCLAW_DIR/workspace"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check() {
  local desc="$1"
  local cmd="$2"
  
  if eval "$cmd" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ PASS${NC}  $desc"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗ FAIL${NC}  $desc"
    FAIL=$((FAIL + 1))
  fi
}

warn_check() {
  local desc="$1"
  local cmd="$2"
  
  if eval "$cmd" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ PASS${NC}  $desc"
    PASS=$((PASS + 1))
  else
    echo -e "  ${YELLOW}⚠ WARN${NC}  $desc (non-blocking)"
    WARN=$((WARN + 1))
  fi
}

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}       AgentOS v3 — End-to-End Pipeline Test          ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""

# ── 1. DIRECTORY STRUCTURE ────────────────────────────────────
echo -e "${CYAN}[1/8] Directory Structure${NC}"
check "workspace/config/ exists" "[ -d '$WORKSPACE/config' ]"
check "workspace/skills/ exists" "[ -d '$WORKSPACE/skills' ]"
check "workspace/scripts/ exists" "[ -d '$WORKSPACE/scripts' ]"
check "workspace/projects/ exists" "[ -d '$WORKSPACE/projects' ]"
check "workspace/logs/ exists" "[ -d '$WORKSPACE/logs' ]"
check "workspace/tmp/ exists" "[ -d '$WORKSPACE/tmp' ]"
check "workspace/knowledge/ exists" "[ -d '$WORKSPACE/knowledge' ]"
echo ""

# ── 2. CONFIG FILES ───────────────────────────────────────────
echo -e "${CYAN}[2/8] Config Files${NC}"
check "model-registry.json exists" "[ -f '$WORKSPACE/config/model-registry.json' ]"
check "model-registry.json is valid JSON" "jq empty '$WORKSPACE/config/model-registry.json'"
check "routing-profiles.json exists" "[ -f '$WORKSPACE/config/routing-profiles.json' ]"
check "routing-profiles.json is valid JSON" "jq empty '$WORKSPACE/config/routing-profiles.json'"
check "budget-guardrails.json exists" "[ -f '$WORKSPACE/config/budget-guardrails.json' ]"
check "budget-guardrails.json is valid JSON" "jq empty '$WORKSPACE/config/budget-guardrails.json'"
check "openclaw.json exists" "[ -f '$OPENCLAW_DIR/openclaw.json' ]"
echo ""

# ── 3. SKILLS ─────────────────────────────────────────────────
echo -e "${CYAN}[3/8] Skills${NC}"
check "hatake-parser/SKILL.md exists" "[ -f '$WORKSPACE/skills/hatake-parser/SKILL.md' ]"
check "smart-router/SKILL.md exists" "[ -f '$WORKSPACE/skills/smart-router/SKILL.md' ]"
check "task-runner/SKILL.md exists" "[ -f '$WORKSPACE/skills/task-runner/SKILL.md' ]"
check "cost-tracker/SKILL.md exists" "[ -f '$WORKSPACE/skills/cost-tracker/SKILL.md' ]"
check "retry-cascade/SKILL.md exists" "[ -f '$WORKSPACE/skills/retry-cascade/SKILL.md' ]"
check "create-project.sh exists" "[ -f '$WORKSPACE/skills/task-runner/scripts/create-project.sh' ]"
check "create-project.sh is executable" "[ -x '$WORKSPACE/skills/task-runner/scripts/create-project.sh' ]"
echo ""

# ── 4. SCRIPTS ────────────────────────────────────────────────
echo -e "${CYAN}[4/8] System Scripts${NC}"
check "gateway-wrapper.sh exists" "[ -f '$WORKSPACE/scripts/gateway-wrapper.sh' ]"
check "gateway-wrapper.sh is executable" "[ -x '$WORKSPACE/scripts/gateway-wrapper.sh' ]"
check "ollama-health.sh exists" "[ -f '$WORKSPACE/scripts/ollama-health.sh' ]"
check "ollama-health.sh is executable" "[ -x '$WORKSPACE/scripts/ollama-health.sh' ]"
check "disk-watchdog.sh exists" "[ -f '$WORKSPACE/scripts/disk-watchdog.sh' ]"
check "backup-to-cloud.sh exists" "[ -f '$WORKSPACE/scripts/backup-to-cloud.sh' ]"
echo ""

# ── 5. LOG FILES ──────────────────────────────────────────────
echo -e "${CYAN}[5/8] Log Files${NC}"
check "routing-decisions.jsonl exists" "[ -f '$WORKSPACE/logs/routing-decisions.jsonl' ]"
check "cost-events.jsonl exists" "[ -f '$WORKSPACE/logs/cost-events.jsonl' ]"
check "audit.jsonl exists" "[ -f '$WORKSPACE/logs/audit.jsonl' ]"
check "ollama-status.json exists" "[ -f '$WORKSPACE/tmp/ollama-status.json' ]"
echo ""

# ── 6. PROJECT TEMPLATE ──────────────────────────────────────
echo -e "${CYAN}[6/8] Project Template${NC}"
check "Template state.json exists" "[ -f '$WORKSPACE/projects/_template/state.json' ]"
check "Template state.json is valid JSON" "jq empty '$WORKSPACE/projects/_template/state.json'"
check "Template BRIEF.md exists" "[ -f '$WORKSPACE/projects/_template/BRIEF.md' ]"

# Test project creation
TEST_ID="TEST-$(date +%s)"
check "Create test project" "bash '$WORKSPACE/skills/task-runner/scripts/create-project.sh' '$TEST_ID' 'Test project for pipeline validation'"
check "Test project dir created" "[ -d '$WORKSPACE/projects/$TEST_ID' ]"
check "Test state.json has project_id" "jq -e '.project_id == \"$TEST_ID\"' '$WORKSPACE/projects/$TEST_ID/state.json'"

# Cleanup test project
rm -rf "$WORKSPACE/projects/$TEST_ID"
echo ""

# ── 7. EXTERNAL SERVICES ─────────────────────────────────────
echo -e "${CYAN}[7/8] External Services${NC}"
warn_check "Ollama is running" "curl -s --connect-timeout 3 http://127.0.0.1:11434/api/tags"
warn_check "OpenClaw gateway is running" "curl -s --connect-timeout 3 http://127.0.0.1:18789/"
warn_check "ollama-health.sh runs" "bash '$WORKSPACE/scripts/ollama-health.sh'"
warn_check "calculate-costs.sh runs" "bash '$WORKSPACE/skills/cost-tracker/scripts/calculate-costs.sh'"
echo ""

# ── 8. DEPENDENCIES ──────────────────────────────────────────
echo -e "${CYAN}[8/8] Dependencies${NC}"
check "jq installed" "command -v jq"
check "curl installed" "command -v curl"
check "tar installed" "command -v tar"
warn_check "docker installed" "command -v docker"
warn_check "openclaw CLI installed" "command -v openclaw"
warn_check "claude CLI installed" "command -v claude"
echo ""

# ── RESULTS ───────────────────────────────────────────────────
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
TOTAL=$((PASS + FAIL + WARN))
echo -e "  Results: ${GREEN}$PASS passed${NC}  ${RED}$FAIL failed${NC}  ${YELLOW}$WARN warnings${NC}  (${TOTAL} total)"

if [ $FAIL -eq 0 ]; then
  echo -e "  ${GREEN}All critical checks passed! ✅${NC}"
  echo ""
  echo -e "  ${CYAN}Next: Test the full pipeline by sending a command to RED:${NC}"
  echo -e "  @RedinsideBot build me a hello world web page"
else
  echo -e "  ${RED}$FAIL critical check(s) failed. Fix before proceeding.${NC}"
fi
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""
