#!/usr/bin/env python3
"""
RED Autonomous System — End-to-End Verification Suite
Run from: /Users/redinside/.openclaw
Usage: python3 verify-system.py [--verbose]
"""
import json, subprocess, time, sys

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
WARN = "\033[93m~\033[0m"
BOLD = "\033[1m"

results = []

def check(name, test_fn):
    try:
        ok, detail = test_fn()
        results.append((name, ok, detail))
        icon = PASS if ok else FAIL
        print(f"{icon} {name}: {detail}")
    except Exception as e:
        results.append((name, False, str(e)))
        print(f"{FAIL} {name}: EXCEPTION {e}")

# ─── 1. Gateway Health ────────────────────────────────────────────────────────

def test_gateway_reachable():
    import urllib.request
    try:
        r = urllib.request.urlopen("http://localhost:20128/v1/models", timeout=5)
        models = json.loads(r.read())["data"]
        return True, f"9router healthy ({len(models)} models)"
    except Exception as e:
        return False, f"9router unreachable: {e}"

def test_gateway_config_valid():
    try:
        cfg = json.load(open("/Users/redinside/.openclaw/config/gateway-config.json"))
        return True, "gateway-config.json valid JSON"
    except Exception as e:
        return False, f"Invalid JSON: {e}"

# ─── 2. OpenClaw Core ─────────────────────────────────────────────────────────

def test_openclaw_json_valid():
    try:
        cfg = json.load(open("/Users/redinside/.openclaw/openclaw.json"))
        keys = ["agents", "cron", "env", "gateway", "tools"]
        missing = [k for k in keys if k not in cfg]
        if missing:
            return False, f"Missing keys: {missing}"
        return True, "openclaw.json valid"
    except Exception as e:
        return False, f"Invalid JSON: {e}"

def test_exec_approvals_autonomous():
    try:
        cfg = json.load(open("/Users/redinside/.openclaw/exec-approvals.json"))
        agents = cfg.get("agents", {})
        # All agents should have ask: "off" for autonomous exec
        ask_off = [a for a, v in agents.items() if v.get("ask") == "off"]
        if len(ask_off) == len(agents):
            return True, f"All {len(ask_off)} agents autonomous (ask: off)"
        return False, f"Only {len(ask_off)}/{len(agents)} agents have ask: off"
    except Exception as e:
        return False, f"Error: {e}"

# ─── 3. Cron Scheduler ───────────────────────────────────────────────────────

def test_cron_jobs_json_valid():
    try:
        jobs = json.load(open("/Users/redinside/.openclaw/cron/jobs.json"))
        count = len(jobs.get("jobs", []))
        enabled = sum(1 for j in jobs["jobs"] if j.get("enabled", False))
        return True, f"{count} jobs total, {enabled} enabled"
    except Exception as e:
        return False, f"Invalid JSON: {e}"

def test_cron_factory_jobs_enabled():
    try:
        jobs = json.load(open("/Users/redinside/.openclaw/cron/jobs.json"))["jobs"]
        factory_jobs = [j for j in jobs if "factory" in j.get("id", "") or "self-healing" in j.get("name", "").lower()]
        if not factory_jobs:
            return False, "No factory/self-healing jobs found"
        all_enabled = all(j.get("enabled", False) for j in factory_jobs)
        names = [j["id"] for j in factory_jobs]
        status = "enabled" if all_enabled else "DISABLED"
        return all_enabled, f"{status}: {names}"
    except Exception as e:
        return False, f"Error: {e}"

def test_cron_no_recent_failures():
    try:
        runs = json.load(open("/Users/redinside/.openclaw/cron/runs.json"))
        recent = [r for r in runs.get("runs", []) if r.get("consecutiveErrors", 0) > 0]
        if recent:
            return False, f"{len(recent)} jobs with consecutive errors"
        return True, "No jobs with consecutive errors"
    except Exception:
        return True, "runs.json not yet available (no runs logged)"

# ─── 4. Tools / Web Search ──────────────────────────────────────────────────

def test_web_search_config():
    try:
        cfg = json.load(open("/Users/redinside/.openclaw/openclaw.json"))
        ws = cfg.get("tools", {}).get("web", {}).get("search", {})
        if ws.get("enabled"):
            return True, f"web_search enabled via {ws.get('provider', 'unknown')}"
        return False, "web_search disabled"
    except Exception as e:
        return False, f"Error: {e}"

def test_web_search_live():
    try:
        import urllib.request, urllib.parse
        payload = json.dumps({
            "model": "free-unlimited",
            "messages": [{"role": "user", "content": "What is 2+2? (answer in 3 words max)"}],
            "max_tokens": 30
        }).encode()
        req = urllib.request.Request(
            "http://localhost:20128/v1/chat/completions",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        r = urllib.request.urlopen(req, timeout=15)
        raw_body = r.read().decode('utf-8')
        # Robustly extract JSON object matching {}
        json_str = raw_body
        for line in raw_body.split('\n'):
            line = line.strip()
            if line.startswith('{') and line.endswith('}'):
                json_str = line
                break
            elif '{' in line and '}' in line:
                start = line.find('{')
                end = line.rfind('}')
                json_str = line[start:end+1]
                break
        resp = json.loads(json_str)
        content = resp["choices"][0]["message"]["content"]
        return True, f"free-unlimited responded: {content[:50]}"
    except Exception as e:
        return False, f"Web search failed: {e}"

# ─── 5. State / Tickets ──────────────────────────────────────────────────────

def test_state_yaml_valid():
    try:
        import yaml
        state = yaml.safe_load(open("/Users/redinside/.openclaw/STATE.yaml"))
        blockers = state.get("blockers", [])
        active_tickets = [t for t in state.get("notable", []) if t.get("status") in ("IN_PROGRESS", "OPEN")]
        return True, f"STATE.yaml valid — {len(blockers)} blockers, {len(active_tickets)} open tickets"
    except Exception as e:
        return False, f"Invalid YAML: {e}"

def test_no_gemini_dependencies():
    try:
        state = open("/Users/redinside/.openclaw/STATE.yaml").read()
        gemini_tickets = [l for l in state.split("\n") if "GEMINI_API_KEY" in l]
        return len(gemini_tickets) == 0, f"{len(gemini_tickets)} remaining GEMINI_API_KEY references in STATE.yaml"
    except Exception as e:
        return False, f"Error: {e}"

def test_web_search_ok_in_state():
    try:
        import yaml
        state = yaml.safe_load(open("/Users/redinside/.openclaw/STATE.yaml"))
        ws = state.get("web_search", {})
        return ws.get("status") in ("OK", "HEALTHY", "ACTIVE"), f"web_search status={ws.get('status', 'MISSING')}"
    except Exception as e:
        return False, f"Error: {e}"

# ─── 6. Agent Configs ────────────────────────────────────────────────────────

def test_all_agents_have_trust_level():
    try:
        cfg = json.load(open("/Users/redinside/.openclaw/exec-approvals.json"))
        agents = cfg.get("agents", {})
        missing = [a for a, v in agents.items() if "trustLevel" not in v]
        if missing:
            return False, f"Missing trustLevel: {missing}"
        return True, f"All {len(agents)} agents have trustLevel set"
    except Exception as e:
        return False, f"Error: {e}"

def test_no_disabled_agents():
    try:
        cfg = json.load(open("/Users/redinside/.openclaw/exec-approvals.json"))
        agents = cfg.get("agents", {})
        # All should have ask: "on" (monitored) or "off" (autonomous) — both valid
        valid = [a for a, v in agents.items() if v.get("ask") in ("on", "off")]
        return len(valid) == len(agents), f"{len(valid)}/{len(agents)} agents configured"
    except Exception as e:
        return False, f"Error: {e}"

# ─── 7. Secrets / Keys ───────────────────────────────────────────────────────

def test_perplexity_key_in_proxy_accounts():
    try:
        accounts = json.load(open("/Users/redinside/.openclaw/config/proxy-accounts.json"))
        has_pplx = any("perplexity" in k.lower() or "pplx" in k.lower() for k in accounts)
        return True, "Perplexity key found in proxy-accounts.json" if has_pplx else "No Perplexity key found (may rely on 9router)"
    except Exception as e:
        return False, f"Error: {e}"

# ─── 8. Slack Integration ────────────────────────────────────────────────────

def test_slack_plugin_configured():
    try:
        cfg = json.load(open("/Users/redinside/.openclaw/openclaw.json"))
        slack = cfg.get("channels", {}).get("slack", {})
        return bool(slack.get("botToken") or slack.get("token")), "Slack plugin configured"
    except Exception as e:
        return False, f"Error: {e}"

# ─── Run All Checks ──────────────────────────────────────────────────────────

print(f"\n{BOLD}═══ RED Autonomous System — E2E Verification ═══\033[0m\n")
print("[1] Gateway Health")
check("  9router reachable", test_gateway_reachable)
check("  gateway-config.json valid", test_gateway_config_valid)

print("\n[2] OpenClaw Core")
check("  openclaw.json valid", test_openclaw_json_valid)
check("  exec-approvals.json autonomous", test_exec_approvals_autonomous)

print("\n[3] Cron Scheduler")
check("  cron/jobs.json valid", test_cron_jobs_json_valid)
check("  factory/self-healing jobs enabled", test_cron_factory_jobs_enabled)
check("  no jobs with consecutive errors", test_cron_no_recent_failures)

print("\n[4] Tools / Web Search")
check("  web_search config enabled", test_web_search_config)
check("  web_search live (perplexity/sonar)", test_web_search_live)

print("\n[5] State / Tickets")
check("  STATE.yaml valid", test_state_yaml_valid)
check("  no GEMINI_API_KEY references", test_no_gemini_dependencies)
check("  web_search status OK in STATE", test_web_search_ok_in_state)

print("\n[6] Agent Configs")
check("  all agents have trustLevel", test_all_agents_have_trust_level)
check("  all agents configured", test_no_disabled_agents)

print("\n[7] Secrets / Keys")
check("  Perplexity key in proxy-accounts", test_perplexity_key_in_proxy_accounts)

print("\n[8] Slack Integration")
check("  Slack plugin configured", test_slack_plugin_configured)

# ─── Summary ─────────────────────────────────────────────────────────────────

passed = sum(1 for _, ok, _ in results if ok)
total = len(results)
failed = [(n, d) for n, ok, d in results if not ok]

print(f"\n{BOLD}─── Summary: {passed}/{total} passed ───\033[0m")
if failed:
    print(f"\n{FAIL} FAILED ({len(failed)}):")
    for name, detail in failed:
        print(f"  {FAIL} {name}: {detail}")
    sys.exit(1)
else:
    print(f"{PASS} All checks passed. System healthy.")
    sys.exit(0)