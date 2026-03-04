#!/usr/bin/env python3
"""
Launch Checklist - Codebase Onboarding Agent
Track progress toward public launch
"""

from datetime import datetime
from pathlib import Path

CHECKLIST = {
    "Pre-Launch (Week 1)": {
        "✅ Build Python analyzer": True,
        "✅ Add MIT license": True,
        "✅ Write CONTRIBUTING.md": True,
        "✅ Polish README": True,
        "✅ Create open source strategy": True,
        "🚧 Add JS/TS support": False,  # ENG working on it
        "🚧 Build landing page": False,  # OPS working on it
        "✅ Push repos to GitHub": True,  # 2 repos live!
        "⏳ Set up CI/CD": False,
        "⏳ Write demo video script": False,
    },
    "Launch Day": {
        "⏳ Post on HackerNews": False,
        "⏳ Post on Reddit (r/programming)": False,
        "⏳ Tweet announcement": False,
        "⏳ Post in Discord communities": False,
        "⏳ Email early supporters": False,
    },
    "Post-Launch (Week 2)": {
        "⏳ Respond to all HN comments": False,
        "⏳ Merge first community PR": False,
        "⏳ Create Discord server": False,
        "⏳ Weekly blog post": False,
        "⏳ Demo video": False,
        "⏳ GitHub Action integration": False,
    },
    "Growth (Weeks 3-4)": {
        "⏳ 1k GitHub stars": False,
        "⏳ 10 contributors": False,
        "⏳ 50 issues/PRs": False,
        "⏳ First paying customer": False,
        "⏳ VS Code extension": False,
    }
}

METRICS = {
    "GitHub Repos": 2,  # codebase-onboarding-agent, smart-worker-suspension
    "GitHub Stars": 0,
    "Contributors": 1,  # Just us
    "Forks": 0,
    "Issues": 0,
    "PRs": 0,
    "Website Visitors": 0,
    "Waitlist Signups": 0,
    "Paying Customers": 0,
    "MRR": 0,
}

def print_checklist():
    print("🚀 CODEBASE ONBOARDING AGENT - LAUNCH CHECKLIST")
    print(f"📅 Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 60)
    
    for phase, tasks in CHECKLIST.items():
        print(f"\n{phase}")
        print("-" * 60)
        for task, done in tasks.items():
            print(f"  {task}")
    
    print("\n" + "=" * 60)
    print("\n📊 METRICS")
    print("-" * 60)
    for metric, value in METRICS.items():
        print(f"  {metric}: {value}")
    
    # Calculate progress
    total_tasks = sum(len(tasks) for tasks in CHECKLIST.values())
    completed_tasks = sum(
        sum(1 for done in tasks.values() if done)
        for tasks in CHECKLIST.values()
    )
    progress = (completed_tasks / total_tasks) * 100
    
    print("\n" + "=" * 60)
    print(f"📈 Overall Progress: {completed_tasks}/{total_tasks} ({progress:.1f}%)")
    print("=" * 60)

if __name__ == "__main__":
    print_checklist()
