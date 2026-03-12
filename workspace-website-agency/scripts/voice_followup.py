#!/usr/bin/env python3
"""
Voice Follow-up Scheduler for Website Agency
Schedules AI voice calls for projects that were sent but not yet called.
Integrates with n8n voice-call-schedule webhook.
"""
import json
import os
import argparse
import random
import urllib.request
from datetime import datetime, timezone, timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECTS_FILE = os.path.join(BASE_DIR, "projects.json")
LEADS_FILE = os.path.join(BASE_DIR, "leads.json")
LOG_DIR = os.path.join(BASE_DIR, "logs")
LOG_FILE = os.path.join(LOG_DIR, "voice_calls.log")
N8N_WEBHOOK = "http://localhost:5678/webhook/voice-call-schedule"

os.makedirs(LOG_DIR, exist_ok=True)


def load_projects():
    with open(PROJECTS_FILE) as f:
        return json.load(f)


def save_projects(data):
    data["lastUpdated"] = datetime.now(timezone.utc).isoformat()
    # Recompute stats
    p = data["projects"]
    data["stats"] = {
        "total": len(p),
        "building": sum(1 for x in p if x["status"] == "building"),
        "ready": sum(1 for x in p if x["status"] == "ready"),
        "sent": sum(1 for x in p if x["status"] == "sent"),
        "called": sum(1 for x in p if x.get("calledAt")),
        "converted": sum(1 for x in p if x["status"] == "converted"),
    }
    with open(PROJECTS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def load_leads():
    with open(LEADS_FILE) as f:
        return {l["id"]: l for l in json.load(f)["leads"]}


def schedule_call(project: dict, lead: dict, dry_run: bool) -> bool:
    """Send call request to n8n webhook."""
    payload = {
        "projectId": project["id"],
        "leadId": project["leadId"],
        "businessName": project["businessName"],
        "category": project.get("category", ""),
        "phone": lead.get("phone", f"+1416{random.randint(1000000, 9999999)}"),
        "previewUrl": project["previewUrl"],
        "scheduledFor": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
        "script": (
            f"Hi, this is Alex from Web Solutions. I'm calling about the custom website preview "
            f"we sent for {project['businessName']}. Did you get a chance to see it? "
            f"We'd love to chat about getting your business online!"
        ),
    }

    if dry_run:
        print(f"  [DRY RUN] Would call: {project['businessName']} ({payload['phone']})")
        return True

    try:
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            N8N_WEBHOOK,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.load(resp)
            return result.get("ok", False)
    except Exception as e:
        print(f"  Webhook error: {e}")
        return False


def log_call(project_id: str, business: str, success: bool, dry_run: bool):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    mode = "DRY_RUN" if dry_run else ("SUCCESS" if success else "FAILED")
    with open(LOG_FILE, "a") as f:
        f.write(f"[{ts}] {project_id} | {business} | {mode}\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--status", default="sent", help="Project status to process (sent/ready)")
    args = parser.parse_args()

    proj_data = load_projects()
    projects = proj_data["projects"]
    leads = load_leads()

    # Find projects awaiting call
    candidates = [
        p for p in projects
        if p["status"] == args.status and not p.get("calledAt")
    ]

    print(f"Projects awaiting voice follow-up: {len(candidates)}")
    print(f"Processing up to {args.limit} calls...")

    called = 0
    failed = 0
    for proj in candidates[:args.limit]:
        lead = leads.get(proj["leadId"], {})
        success = schedule_call(proj, lead, args.dry_run)
        log_call(proj["id"], proj["businessName"], success, args.dry_run)

        if success or args.dry_run:
            proj["calledAt"] = datetime.now(timezone.utc).isoformat()
            proj["callOutcome"] = "scheduled" if not args.dry_run else "dry_run"
            called += 1
            print(f"  ✓ Scheduled: {proj['businessName']}")
        else:
            failed += 1
            print(f"  ✗ Failed: {proj['businessName']}")

    save_projects(proj_data)
    print(f"\nDone: {called} calls scheduled, {failed} failed")
    print(f"Log: {LOG_FILE}")


if __name__ == "__main__":
    main()
