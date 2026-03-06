#!/usr/bin/env python3
"""Quick status check for Website Agency"""
import json
import os

WORKSPACE = "/Users/redinside/.openclaw/workspace-website-agency"

print("=" * 50)
print("  🌐 ONTARIO WEBSITE AGENCY - STATUS")
print("=" * 50)

# Leads
with open(f"{WORKSPACE}/leads.json") as f:
    l = json.load(f)
    print(f"\n📍 LEADS: {l['stats']['total']}")
    print(f"   Without website: {l['stats']['withoutWebsite']}")
    print(f"   Pending audit: {l['stats']['pendingAudit']}")

# Audits
with open(f"{WORKSPACE}/audits.json") as f:
    a = json.load(f)
    print(f"\n🔍 AUDITS: {a['stats']['total']}")
    print(f"   Grade A: {a['stats']['gradeA']}")
    print(f"   Grade B: {a['stats']['gradeB']}")
    print(f"   Grade C: {a['stats']['gradeC']}")
    print(f"   Grade D: {a['stats']['gradeD']} ← Build!")

# Projects
with open(f"{WORKSPACE}/projects.json") as f:
    p = json.load(f)
    print(f"\n🏗️  PROJECTS: {p['stats']['total']}")
    print(f"   Ready: {p['stats']['ready']}")
    print(f"   Sent: {p['stats']['sent']}")
    print(f"   Converted: {p['stats']['converted']} 💰")

# Config
with open(f"{WORKSPACE}/config.json") as f:
    c = json.load(f)
    print(f"\n📍 Target: {len(c['target_areas'])} cities in Ontario")
    print(f"   Radius: {c['target_radius_km']}km from Toronto")
    print(f"   Categories: {len(c['categories'])}")

print("\n" + "=" * 50)
