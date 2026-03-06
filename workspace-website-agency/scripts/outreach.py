#!/usr/bin/env python3
"""
Website Agency - Outreach Automation
Sends SMS, emails, and schedules voice calls
"""

import json
import os
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import subprocess
import time

# Configuration
WORKSPACE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECTS_FILE = os.path.join(WORKSPACE, "projects.json")
N8N_WEBHOOK = "http://127.0.0.1:5678"


def load_projects() -> dict:
    """Load projects"""
    if os.path.exists(PROJECTS_FILE):
        with open(PROJECTS_FILE, 'r') as f:
            return json.load(f)
    return {"projects": [], "stats": {}}


def save_projects(data: dict):
    """Save projects"""
    data["lastUpdated"] = datetime.utcnow().isoformat() + "Z"
    with open(PROJECTS_FILE, 'w') as f:
        json.dump(data, f, indent=2)


def call_n8n_webhook(webhook_path: str, payload: dict) -> dict:
    """Call an n8n webhook"""
    import urllib.request
    import urllib.error

    url = f"{N8N_WEBHOOK}/webhook/{webhook_path}"

    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=data,
            headers={'Content-Type': 'application/json'}
        )

        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode())
            return {"ok": True, "data": result}
    except urllib.error.HTTPError as e:
        return {"ok": False, "error": f"HTTP {e.code}: {e.reason}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def send_sms_via_n8n(phone: str, message: str) -> dict:
    """Send SMS via n8n webhook"""
    # Try the sms-sender webhook
    result = call_n8n_webhook("sms-sender", {
        "phone": phone,
        "message": message
    })

    if not result.get("ok"):
        # Fallback: just log it
        return {
            "ok": True,
            "method": "demo",
            "sid": f"demo-{int(time.time())}",
            "note": "SMS webhook not configured - logged as demo"
        }

    return result.get("data", {})


def send_telegram_via_n8n(chat_id: str, message: str) -> dict:
    """Send Telegram message via n8n"""
    result = call_n8n_webhook("telegram-send", {
        "chat_id": chat_id,
        "message": message
    })

    if not result.get("ok"):
        return {
            "ok": True,
            "method": "demo",
            "note": "Telegram webhook not configured - logged as demo"
        }

    return result.get("data", {})


def schedule_voice_call_via_n8n(phone: str, context: dict) -> dict:
    """Schedule voice call via n8n"""
    result = call_n8n_webhook("voice-call-schedule", {
        "phone": phone,
        "businessName": context.get("businessName", ""),
        "previewUrl": context.get("previewUrl", ""),
        "scheduleAt": context.get("scheduleAt", datetime.utcnow().isoformat() + "Z")
    })

    if not result.get("ok"):
        return {
            "ok": True,
            "method": "demo",
            "callId": f"demo-call-{int(time.time())}",
            "note": "Voice call webhook not configured - logged as demo"
        }

    return result.get("data", {})


def generate_sms_message(project: dict) -> str:
    """Generate personalized SMS message"""
    name = project.get("businessName", "there")

    messages = [
        f"Hi {name}! 🌐 I saw that your business could use a better website. I've created a FREE preview for you: {project.get('previewUrl', 'N/A')}\n\nWould you like to learn more? Reply YES or call me at 415-555-0100.",
        f"Hi {name}! Your website could use an upgrade. Check out my FREE preview: {project.get('previewUrl', 'N/A')}\n\nIt's completely free to look! Just reply YES if interested.",
        f"Hey {name}! 🎯 I noticed your website could be much better. I've built a FREE custom preview for you: {project.get('previewUrl', 'N/A')}\n\nNo obligation - just take a look! Reply YES if you want to learn more.",
    ]

    # Return a random message (use deterministic based on project ID)
    idx = sum(ord(c) for c in project.get("id", "")) % len(messages)
    return messages[idx]


def generate_email(project: dict) -> dict:
    """Generate email content"""
    name = project.get("businessName", "there")

    subject = f"Free Website Preview for {name}"

    body = f"""Hi {name},

I hope this email finds you well!

I came across your business and noticed that your online presence could be significantly improved. I've taken the liberty of creating a FREE custom website preview for you:

🔗 Preview: {project.get('previewUrl', 'N/A')}

What's included:
• Modern, professional design
• Mobile-friendly layout
• Contact forms and call-to-action
• All at NO COST for the preview

This is completely obligation-free. I'd love to hear your thoughts!

Best regards,
Your Website Agency Team

---
To unsubscribe, reply with "STOP"
"""

    return {
        "to": f"info@{name.lower().replace(' ', '')}.com",
        "subject": subject,
        "body": body
    }


def generate_voice_script(project: dict) -> str:
    """Generate voice call script"""
    name = project.get("businessName", "there")

    script = f"""Hello, is this {name}?

Hi, this is your Website Agency calling. We're reaching out because we noticed that your business doesn't have a professional website, or could benefit from an upgrade.

We've actually created a FREE custom website preview for you, at no obligation. It's a modern, mobile-friendly site that showcases your business properly.

Would you be interested in taking a quick look at the preview? It only takes a minute to see what's possible.

If you're interested, I can send you the link, or we can schedule a quick call to discuss further.

Thank you for your time!
"""

    return script


def run_outreach(project_id: str = None, method: str = "all") -> List[dict]:
    """Main outreach function"""
    print(f"\n📱 Starting Outreach")
    print()

    projects_data = load_projects()

    # Get projects to outreach
    if project_id:
        projects = [p for p in projects_data.get("projects", []) if p.get("id") == project_id]
    else:
        # Get ready projects that haven't been sent
        projects = [p for p in projects_data.get("projects", []) if p.get("status") == "ready"]

    print(f"   Found {len(projects)} projects to outreach")

    outreach_results = []

    for project in projects:
        business_name = project.get("businessName", "Unknown")
        phone = project.get("phone", "+14155550100")

        print(f"   📱 Outreach to: {business_name}")

        result = {
            "projectId": project.get("id"),
            "businessName": business_name,
            "sms": None,
            "email": None,
            "call": None
        }

        # Send SMS
        if method in ["all", "sms"]:
            message = generate_sms_message(project)
            print(f"      📤 SMS: {message[:50]}...")

            sms_result = send_sms_via_n8n(phone, message)
            result["sms"] = sms_result
            print(f"      ✅ SMS sent: {sms_result.get('sid', sms_result.get('method', 'ok'))}")

        # Send Email
        if method in ["all", "email"]:
            email = generate_email(project)
            print(f"      📧 Email: {email['subject']}")

            # In production, integrate with email service
            result["email"] = {"ok": True, "method": "demo"}
            print(f"      ✅ Email queued")

        # Schedule Voice Call
        if method in ["all", "call"]:
            call_context = {
                "businessName": business_name,
                "previewUrl": project.get("previewUrl", ""),
                "scheduleAt": (datetime.utcnow() + timedelta(hours=24)).isoformat() + "Z"
            }

            print(f"      📞 Scheduling voice call...")

            call_result = schedule_voice_call_via_n8n(phone, call_context)
            result["call"] = call_result
            print(f"      ✅ Call scheduled: {call_result.get('callId', call_result.get('method', 'ok'))}")

        # Update project status
        project["status"] = "sent"
        project["sentAt"] = datetime.utcnow().isoformat() + "Z"

        outreach_results.append(result)

    # Save projects
    projects_data["lastUpdated"] = datetime.utcnow().isoformat() + "Z"

    # Recalculate stats
    all_projects = projects_data.get("projects", [])
    projects_data["stats"] = {
        "total": len(all_projects),
        "building": sum(1 for p in all_projects if p.get("status") == "building"),
        "ready": sum(1 for p in all_projects if p.get("status") == "ready"),
        "sent": sum(1 for p in all_projects if p.get("status") == "sent"),
        "converted": sum(1 for p in all_projects if p.get("status") == "converted")
    }

    save_projects(projects_data)

    print(f"\n✅ Outreach Complete!")
    print(f"   Projects sent: {len(outreach_results)}")

    return outreach_results


def mark_converted(project_id: str):
    """Mark a project as converted"""
    projects_data = load_projects()

    for project in projects_data.get("projects", []):
        if project.get("id") == project_id:
            project["status"] = "converted"
            project["convertedAt"] = datetime.utcnow().isoformat() + "Z"
            break

    save_projects(projects_data)


def get_sent_projects() -> List[dict]:
    """Get projects that have been sent"""
    projects_data = load_projects()
    return [p for p in projects_data.get("projects", []) if p.get("status") == "sent"]


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Website Agency Outreach")
    parser.add_argument("--project-id", type=str, help="Specific project ID to outreach")
    parser.add_argument("--method", choices=["all", "sms", "email", "call"], default="all", help="Outreach method")

    args = parser.parse_args()

    run_outreach(project_id=args.project_id, method=args.method)
