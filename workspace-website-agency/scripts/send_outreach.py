#!/usr/bin/env python3
"""
Outreach Sender for Website Agency
Marks 'ready' projects as 'sent' and logs outreach.
In production: integrate Twilio/SendGrid. For now, logs intent.
"""
import json
import os
import argparse
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECTS_FILE = os.path.join(BASE_DIR, "projects.json")
LEADS_FILE = os.path.join(BASE_DIR, "leads.json")
LOG_DIR = os.path.join(BASE_DIR, "logs")
LOG_FILE = os.path.join(LOG_DIR, "outreach.log")

os.makedirs(LOG_DIR, exist_ok=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    proj_data = json.load(open(PROJECTS_FILE))
    projects = proj_data["projects"]
    leads = {l["id"]: l for l in json.load(open(LEADS_FILE))["leads"]}

    ready = [p for p in projects if p["status"] == "ready"]
    print(f"Ready to send: {len(ready)}, limit: {args.limit}")

    sent = 0
    for proj in ready[:args.limit]:
        lead = leads.get(proj["leadId"], {})
        name = proj["businessName"]
        preview = proj["previewUrl"]
        city = lead.get("city", "")

        msg = (
            f"Hi {name}! We built a free website preview for your {proj.get('category','')} "
            f"business in {city}. Check it out: {preview} — Reply STOP to opt out."
        )

        if not args.dry_run:
            proj["status"] = "sent"
            proj["sentAt"] = datetime.now(timezone.utc).isoformat()

        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        mode = "DRY" if args.dry_run else "SENT"
        with open(LOG_FILE, "a") as f:
            f.write(f"[{ts}] {proj['id']} | {name} | {mode} | {preview}\n")

        print(f"  {'[DRY] ' if args.dry_run else ''}✓ {name}")
        sent += 1

    if not args.dry_run:
        proj_data["lastUpdated"] = datetime.now(timezone.utc).isoformat()
        stats = proj_data.get("stats", {})
        stats["sent"] = sum(1 for p in projects if p["status"] == "sent")
        stats["ready"] = sum(1 for p in projects if p["status"] == "ready")
        proj_data["stats"] = stats
        with open(PROJECTS_FILE, "w") as f:
            json.dump(proj_data, f, indent=2)

    print(f"\nDone: {sent} outreach messages {'would be ' if args.dry_run else ''}sent")


if __name__ == "__main__":
    main()
