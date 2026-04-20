#!/usr/bin/env python3
"""
A2A Communication Test Script
Run this to verify agents are talking to each other.
Usage: python3 workspace/scripts/test_a2a.py
"""
import json, os, datetime, sys

WORKSPACE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG_FILE = os.path.join(WORKSPACE, "logs", "a2a-delegations.jsonl")
TASK_REGISTRY = os.path.join(WORKSPACE, "ops", "task-registry.json")
SESSIONS_DIR = os.path.expanduser("~/.openclaw/agents")

def check_a2a_log():
    print("=== A2A Delegation Log ===")
    if not os.path.exists(LOG_FILE):
        print("  ❌ MISSING: logs/a2a-delegations.jsonl does not exist")
        return 0
    lines = [l.strip() for l in open(LOG_FILE).readlines() if l.strip()]
    if not lines:
        print("  ❌ EMPTY: No A2A delegations have ever been logged")
        print("     → Agents are spawning subagents but NOT following the A2A protocol")
        print("     → SOUL.md now mandates logging — will take effect on next session")
        return 0
    today = datetime.date.today().isoformat()
    today_entries = [l for l in lines if today in l]
    print(f"  Total entries: {len(lines)}")
    print(f"  Today ({today}): {len(today_entries)}")
    for entry in today_entries[-5:]:
        try:
            e = json.loads(entry)
            print(f"    {e.get('type','?'):8} | {e.get('spawner','?'):10} → {e.get('subagent','?'):10} | {e.get('task','')[:60]}")
        except:
            print(f"    {entry[:80]}")
    return len(today_entries)

def check_subagent_sessions():
    print("\n=== Subagent Sessions Today ===")
    today = datetime.date.today().isoformat()
    count = 0
    agents = []
    if not os.path.exists(SESSIONS_DIR):
        print("  ❌ Agents directory not found")
        return 0
    for agent in os.listdir(SESSIONS_DIR):
        sess_dir = os.path.join(SESSIONS_DIR, agent, "sessions")
        if not os.path.isdir(sess_dir):
            continue
        for f in os.listdir(sess_dir):
            if not f.endswith(".jsonl"):
                continue
            fp = os.path.join(sess_dir, f)
            try:
                mtime = os.path.getmtime(fp)
                mdate = datetime.date.fromtimestamp(mtime).isoformat()
                if mdate != today:
                    continue
                # Check if it's a subagent session
                with open(fp) as fh:
                    first_lines = [fh.readline() for _ in range(6)]
                content = "".join(first_lines)
                if "[Subagent Context]" in content or "[System Message]" in content:
                    count += 1
                    agents.append(agent)
            except:
                pass
    if count == 0:
        print(f"  ⚠️  No subagent sessions found today")
    else:
        from collections import Counter
        by_agent = Counter(agents)
        print(f"  ✅ {count} subagent sessions today across agents:")
        for agent, n in by_agent.most_common():
            print(f"     {agent}: {n} subagent session(s)")
    return count

def check_task_registry():
    print("\n=== Task Registry ===")
    if not os.path.exists(TASK_REGISTRY):
        print("  ❌ MISSING: ops/task-registry.json")
        return
    try:
        data = json.load(open(TASK_REGISTRY))
        tasks = data.get("tasks", [])
        if not tasks:
            print("  ⚠️  No tasks registered")
        else:
            print(f"  {len(tasks)} task(s) registered:")
            for t in tasks:
                status = t.get("status", "?")
                icon = "✅" if status == "completed" else "🔄" if status == "in_progress" else "⏳"
                print(f"    {icon} [{t.get('priority','?')}] {t.get('title','?')[:60]} → {t.get('assignee','?')}")
    except Exception as e:
        print(f"  ❌ Error reading task registry: {e}")

def check_competitive_intel():
    print("\n=== Competitive Intelligence Skill ===")
    skill_md = os.path.join(WORKSPACE, "skills", "competitive-intelligence", "SKILL.md")
    config_path = os.path.expanduser("~/.openclaw/openclaw.json")
    if os.path.exists(skill_md):
        print("  ✅ SKILL.md exists")
    else:
        print("  ❌ SKILL.md missing")
    try:
        config = json.load(open(config_path))
        enabled = config.get("skills", {}).get("entries", {}).get("competitive-intelligence", {}).get("enabled", False)
        print(f"  {'✅' if enabled else '❌'} openclaw.json: enabled={enabled}")
    except Exception as e:
        print(f"  ❌ Could not read config: {e}")
    report_dir = os.path.join(WORKSPACE, "competitive-intel", "reports")
    if os.path.exists(report_dir):
        reports = os.listdir(report_dir)
        print(f"  📄 Reports found: {len(reports)}")
        for r in sorted(reports)[-3:]:
            print(f"     {r}")
    else:
        print("  ⚠️  No reports yet (workspace/competitive-intel/reports/ not created)")
        print("     → First report will be generated Monday 9am ET by RESEARCH cron")

def print_summary(a2a_count, subagent_count):
    print("\n" + "="*50)
    print("SUMMARY")
    print("="*50)
    if a2a_count == 0 and subagent_count == 0:
        print("❌ FAIL: No A2A activity detected today")
        print("   Agents are NOT talking to each other autonomously")
        print("   Root cause: SOUL.md A2A rules just added — will activate on next session")
        print("   Fix applied: ")
        print("     1. SOUL.md now mandates a2a-delegations.jsonl logging on every spawn")
        print("     2. RED daily delegation cron added (10am ET weekdays)")
        print("     3. OPS A2A health monitor added (6pm ET weekdays, alerts you on Telegram)")
        print("   To test NOW: Send RED a message on Telegram asking it to delegate to RESEARCH")
    elif a2a_count == 0 and subagent_count > 0:
        print(f"⚠️  PARTIAL: {subagent_count} subagent sessions found but 0 logged in a2a-delegations.jsonl")
        print("   Agents ARE spawning subagents but NOT following the logging protocol")
        print("   Fix: SOUL.md now mandates logging — will take effect on next session")
    else:
        print(f"✅ PASS: {a2a_count} A2A delegations logged today, {subagent_count} subagent sessions")
        print("   Agents are communicating. Check Slack #redos-mission-control for thread posts.")

if __name__ == "__main__":
    print(f"A2A Test — {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    a2a = check_a2a_log()
    sub = check_subagent_sessions()
    check_task_registry()
    check_competitive_intel()
    print_summary(a2a, sub)
