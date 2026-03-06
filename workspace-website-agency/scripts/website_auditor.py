#!/usr/bin/env python3
"""
Website Agency - Website Auditor
Analyzes websites and grades them A/B/C/D
"""

import json
import os
import uuid
from datetime import datetime
from typing import List, Dict, Optional
import subprocess
import re
import ssl
import urllib.request
import urllib.error

# Configuration
WORKSPACE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEADS_FILE = os.path.join(WORKSPACE, "leads.json")
AUDITS_FILE = os.path.join(WORKSPACE, "audits.json")


def load_leads() -> dict:
    """Load leads"""
    if os.path.exists(LEADS_FILE):
        with open(LEADS_FILE, 'r') as f:
            return json.load(f)
    return {"leads": [], "stats": {}}


def save_leads(data: dict):
    """Save leads"""
    with open(LEADS_FILE, 'w') as f:
        json.dump(data, f, indent=2)


def load_audits() -> dict:
    """Load existing audits"""
    if os.path.exists(AUDITS_FILE):
        with open(AUDITS_FILE, 'r') as f:
            return json.load(f)
    return {
        "audits": [],
        "lastUpdated": datetime.utcnow().isoformat() + "Z",
        "stats": {
            "total": 0,
            "gradeA": 0,
            "gradeB": 0,
            "gradeC": 0,
            "gradeD": 0
        }
    }


def save_audits(data: dict):
    """Save audits"""
    data["lastUpdated"] = datetime.utcnow().isoformat() + "Z"
    with open(AUDITS_FILE, 'w') as f:
        json.dump(data, f, indent=2)


def generate_audit_id() -> str:
    """Generate unique audit ID"""
    return f"audit-{uuid.uuid4().hex[:8]}"


def fetch_website(url: str, timeout: int = 10) -> Optional[str]:
    """Fetch website content"""
    if not url:
        return None

    # Add https if missing
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url

    try:
        # Create SSL context that doesn't verify certificates
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        )

        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as response:
            return response.read().decode('utf-8', errors='ignore')
    except Exception as e:
        return None


def analyze_speed(content: str, url: str) -> int:
    """Analyze page speed (1-5 score)"""
    score = 3  # Default

    # Check for obvious speed issues
    if content:
        size = len(content)
        # Large page = slow
        if size > 500000:  # > 500KB
            score = 1
        elif size > 200000:  # > 200KB
            score = 2
        elif size < 50000:  # < 50KB
            score = 5

    # Check for speed optimization indicators
    if content:
        # Good indicators
        if 'lazy' in content.lower():
            score += 0.5
        if 'cdn' in content.lower():
            score += 0.5
        if 'compression' in content.lower() or 'gzip' in content.lower():
            score += 0.5

        # Bad indicators
        if content.count('<script') > 10:
            score -= 1
        if 'jquery' in content.lower() and 'cdn' not in content.lower():
            score -= 0.5

    return max(1, min(5, int(score)))


def analyze_mobile(content: str) -> int:
    """Analyze mobile-friendliness (1-5 score)"""
    score = 3

    if content:
        # Check for responsive design indicators
        if 'viewport' in content.lower():
            score += 1
        if '@media' in content.lower():
            score += 1
        if 'bootstrap' in content.lower():
            score += 1
        if 'tailwind' in content.lower():
            score += 1

        # Check for mobile-unfriendly elements
        if 'width: 1000px' in content or 'width: 800px' in content:
            score -= 2
        if 'float: left' in content and '@media' not in content:
            score -= 1

    return max(1, min(5, int(score)))


def analyze_seo(content: str, url: str) -> int:
    """Analyze SEO (1-5 score)"""
    score = 2

    if not content:
        return 1

    content_lower = content.lower()

    # Check for essential SEO elements
    if '<title>' in content_lower and '</title>' in content_lower:
        score += 1

    if 'meta name="description"' in content_lower:
        score += 1

    if 'meta name="keywords"' in content_lower:
        score += 0.5

    # Check for heading structure
    if '<h1' in content_lower:
        score += 0.5
    if '<h2' in content_lower:
        score += 0.5

    # Check for alt tags
    if 'alt="' in content_lower:
        score += 0.5

    # Check for schema/structured data
    if 'schema.org' in content_lower or 'application/ld+json' in content_lower:
        score += 1

    # Check for open graph (social)
    if 'og:' in content_lower:
        score += 0.5

    return max(1, min(5, int(score)))


def analyze_design(content: str) -> int:
    """Analyze design quality (1-5 score)"""
    score = 3

    if not content:
        return 1

    content_lower = content.lower()

    # Modern design indicators
    modern_frameworks = ['tailwind', 'bootstrap', 'foundation', 'bulma', 'material']
    for framework in modern_frameworks:
        if framework in content_lower:
            score += 1

    # CSS indicators
    if 'flexbox' in content_lower or 'grid' in content_lower:
        score += 1
    if 'css-variables' in content_lower or ':root' in content_lower:
        score += 1

    # Animation (modern)
    if '@keyframes' in content_lower or 'transition:' in content_lower:
        score += 0.5

    # Font indicators (modern = Google Fonts)
    if 'googleapis' in content_lower or 'fonts.' in content_lower:
        score += 0.5

    # Old design indicators
    old_patterns = ['<table>', '<font', 'bgcolor=', 'alink=', 'vlink=']
    for pattern in old_patterns:
        if pattern in content_lower:
            score -= 1

    # Wix/Wixsite = poor design
    if 'wixsite' in content_lower or 'wix.com' in content_lower:
        score -= 1

    return max(1, min(5, int(score)))


def analyze_content(content: str) -> int:
    """Analyze content quality (1-5 score)"""
    score = 2

    if not content:
        return 1

    # Length check
    word_count = len(content.split())
    if word_count > 100:
        score += 1
    if word_count > 300:
        score += 1
    if word_count > 500:
        score += 0.5

    # Check for key business content
    content_lower = content.lower()

    has_about = 'about' in content_lower
    has_services = 'service' in content_lower or 'product' in content_lower
    has_contact = 'contact' in content_lower or 'phone' in content_lower or 'email' in content_lower
    has_location = 'address' in content_lower or 'location' in content_lower or 'map' in content_lower
    has_cta = 'call now' in content_lower or 'contact us' in content_lower or 'get started' in content_lower or 'book' in content_lower

    if has_about:
        score += 0.5
    if has_services:
        score += 0.5
    if has_contact:
        score += 0.5
    if has_location:
        score += 0.5
    if has_cta:
        score += 0.5

    return max(1, min(5, int(score)))


def calculate_grade(scores: dict) -> str:
    """Calculate letter grade from scores"""
    avg_score = sum(scores.values()) / len(scores)

    if avg_score >= 4.5:
        return "A"
    elif avg_score >= 3.5:
        return "B"
    elif avg_score >= 2.5:
        return "C"
    else:
        return "D"


def generate_issues(scores: dict, content: str) -> List[str]:
    """Generate list of issues found"""
    issues = []

    if scores['speed'] < 3:
        issues.append("Slow page load time")
    if scores['mobile'] < 3:
        issues.append("Not mobile-friendly")
    if scores['seo'] < 3:
        issues.append("Poor SEO optimization")
    if scores['design'] < 3:
        issues.append("Outdated design")
    if scores['content'] < 3:
        issues.append("Limited content")

    if not content:
        issues.append("No website or unreachable")

    return issues


def audit_website(url: str, business_name: str = "") -> dict:
    """Audit a single website"""

    # Fetch website content
    content = fetch_website(url, timeout=10)

    # Analyze each aspect
    speed = analyze_speed(content, url)
    mobile = analyze_mobile(content)
    seo = analyze_seo(content, url)
    design = analyze_design(content)
    content_score = analyze_content(content)

    scores = {
        "speed": speed,
        "mobile": mobile,
        "seo": seo,
        "design": design,
        "content": content_score
    }

    grade = calculate_grade(scores)
    issues = generate_issues(scores, content)

    # Determine recommendation
    if grade == "A":
        recommendation = "Website is excellent. No action needed."
    elif grade == "B":
        recommendation = "Website is good. Minor improvements possible."
    elif grade == "C":
        recommendation = "Website needs improvement. Consider optimization."
    else:
        recommendation = "Full rebuild recommended. Current site is ineffective."

    return {
        "url": url,
        "businessName": business_name,
        "grade": grade,
        "scores": scores,
        "issues": issues,
        "recommendation": recommendation,
        "analyzedAt": datetime.utcnow().isoformat() + "Z",
        "hasContent": content is not None
    }


def run_audit(lead_id: str = None) -> List[dict]:
    """Main audit function"""
    print(f"\n🔍 Starting Website Audit")
    print()

    leads_data = load_leads()
    audits_data = load_audits()

    # Get leads to audit
    if lead_id:
        leads_to_audit = [l for l in leads_data.get("leads", []) if l.get("id") == lead_id]
    else:
        leads_to_audit = [l for l in leads_data.get("leads", []) if l.get("status") == "pending-audit"]

    print(f"   Found {len(leads_to_audit)} leads to audit")

    new_audits = []

    for lead in leads_to_audit:
        business_name = lead.get("name", "Unknown")
        url = lead.get("website")

        print(f"   📊 Auditing: {business_name}")

        if not url:
            # No website = automatic D grade
            audit = {
                "id": generate_audit_id(),
                "leadId": lead.get("id"),
                "url": None,
                "businessName": business_name,
                "grade": "D",
                "scores": {
                    "speed": 1,
                    "mobile": 1,
                    "seo": 1,
                    "design": 1,
                    "content": 1
                },
                "issues": ["No website found"],
                "recommendation": "No website exists. Full rebuild with modern website recommended.",
                "analyzedAt": datetime.utcnow().isoformat() + "Z",
                "hasContent": False
            }
            print(f"      → Grade: D (No website)")
        else:
            audit = audit_website(url, business_name)
            audit["id"] = generate_audit_id()
            audit["leadId"] = lead.get("id")
            print(f"      → Grade: {audit['grade']} (Speed:{audit['scores']['speed']}, Mobile:{audit['scores']['mobile']}, SEO:{audit['scores']['seo']}, Design:{audit['scores']['design']}, Content:{audit['scores']['content']})")

        new_audits.append(audit)

        # Update lead status
        lead["status"] = "audited"

    # Save audits
    all_audits = audits_data.get("audits", []) + new_audits

    # Calculate stats
    stats = {
        "total": len(all_audits),
        "gradeA": sum(1 for a in all_audits if a.get("grade") == "A"),
        "gradeB": sum(1 for a in all_audits if a.get("grade") == "B"),
        "gradeC": sum(1 for a in all_audits if a.get("grade") == "C"),
        "gradeD": sum(1 for a in all_audits if a.get("grade") == "D")
    }

    audits_data["audits"] = all_audits
    audits_data["stats"] = stats
    save_audits(audits_data)

    # Save leads
    save_leads(leads_data)

    print(f"\n✅ Audit Complete!")
    print(f"   Total audits: {stats['total']}")
    print(f"   Grade A: {stats['gradeA']}")
    print(f"   Grade B: {stats['gradeB']}")
    print(f"   Grade C: {stats['gradeC']}")
    print(f"   Grade D: {stats['gradeD']} ← Build candidates!")

    return new_audits


def get_grade_d_leads() -> List[dict]:
    """Get leads that need websites (Grade D)"""
    audits_data = load_audits()
    leads_data = load_leads()

    grade_d_audit_lead_ids = [a.get("leadId") for a in audits_data.get("audits", []) if a.get("grade") == "D"]

    return [l for l in leads_data.get("leads", []) if l.get("id") in grade_d_audit_lead_ids]


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Website Agency Auditor")
    parser.add_argument("--lead-id", type=str, help="Specific lead ID to audit")
    parser.add_argument("--all", action="store_true", help="Audit all pending leads")

    args = parser.parse_args()

    run_audit(lead_id=args.lead_id)
