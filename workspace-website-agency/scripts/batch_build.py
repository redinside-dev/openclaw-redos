#!/usr/bin/env python3
"""
Batch Website Builder for Website Agency
Generates HTML sites for all Grade F leads that don't yet have a project.
Reads: leads.json, audits.json
Writes: sites/<slug>.html, projects.json
"""
import json
import os
import re
import sys
import argparse
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEADS_FILE = os.path.join(BASE_DIR, "leads.json")
AUDITS_FILE = os.path.join(BASE_DIR, "audits.json")
PROJECTS_FILE = os.path.join(BASE_DIR, "projects.json")
SITES_DIR = os.path.join(BASE_DIR, "sites")
PREVIEW_BASE = "http://localhost:8765"

os.makedirs(SITES_DIR, exist_ok=True)

CATEGORY_COLORS = {
    "restaurant": ("#e74c3c", "#c0392b"),
    "pizza": ("#e74c3c", "#c0392b"),
    "bakery": ("#e67e22", "#d35400"),
    "coffee shop": ("#795548", "#5d4037"),
    "cafe": ("#795548", "#5d4037"),
    "plumber": ("#2980b9", "#1a6a9a"),
    "electrician": ("#f1c40f", "#d4ac0d"),
    "hvac": ("#16a085", "#0e6655"),
    "contractor": ("#8e44ad", "#6c3483"),
    "lawyer": ("#2c3e50", "#1a252f"),
    "accountant": ("#27ae60", "#1e8449"),
    "real estate": ("#2980b9", "#1a6a9a"),
    "insurance": ("#16a085", "#0e6655"),
    "hair salon": ("#e91e63", "#c2185b"),
    "spa": ("#9c27b0", "#7b1fa2"),
    "nail salon": ("#ff4081", "#f50057"),
    "veterinarian": ("#4caf50", "#388e3c"),
    "doctor": ("#2196f3", "#1565c0"),
    "dentist": ("#00bcd4", "#0097a7"),
    "gym": ("#ff5722", "#e64a19"),
    "florist": ("#e91e63", "#c2185b"),
    "mechanic": ("#607d8b", "#455a64"),
    "cleaning service": ("#00bcd4", "#0097a7"),
    "landscaping": ("#4caf50", "#388e3c"),
    "grooming": ("#9c27b0", "#7b1fa2"),
    "computer repair": ("#3f51b5", "#283593"),
}

def slugify(name: str) -> str:
    s = name.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")

def get_colors(category: str):
    cat = category.lower()
    for key, colors in CATEGORY_COLORS.items():
        if key in cat:
            return colors
    return ("#6366f1", "#4f46e5")

def generate_html(lead: dict) -> str:
    name = lead.get("name", "Business Name")
    category = lead.get("category", "business")
    city = lead.get("city", "")
    state = lead.get("state", "")
    location = f"{city}, {state}".strip(", ")
    primary, dark = get_colors(category)

    features = {
        "restaurant": ["Fresh Ingredients", "Daily Specials", "Takeout & Delivery"],
        "pizza": ["Fresh Dough Daily", "Custom Toppings", "Takeout & Delivery"],
        "bakery": ["Freshly Baked Daily", "Custom Orders", "Special Occasions"],
        "plumber": ["24/7 Emergency Service", "Licensed & Insured", "Free Estimates"],
        "electrician": ["Fully Licensed", "Commercial & Residential", "Emergency Calls"],
        "hvac": ["Installation & Repair", "Maintenance Plans", "Energy Efficient"],
        "lawyer": ["Free Consultation", "Experienced Team", "Proven Results"],
        "accountant": ["Tax Planning", "Business Consulting", "Bookkeeping"],
        "real estate": ["Buy & Sell", "Property Management", "Investment Properties"],
        "hair salon": ["Expert Stylists", "All Hair Types", "Walk-ins Welcome"],
        "spa": ["Relaxation Packages", "Expert Therapists", "Gift Cards Available"],
        "dentist": ["Family Friendly", "Modern Equipment", "Emergency Care"],
        "doctor": ["Accepting New Patients", "Same Day Appointments", "Telehealth Available"],
        "veterinarian": ["All Pets Welcome", "Preventative Care", "Emergency Services"],
        "gym": ["State-of-the-Art Equipment", "Personal Training", "Group Classes"],
        "florist": ["Same Day Delivery", "Custom Arrangements", "Wedding Specialist"],
        "cleaning service": ["Insured & Bonded", "Eco-Friendly Products", "Flexible Scheduling"],
        "landscaping": ["Design & Install", "Seasonal Maintenance", "Free Estimates"],
    }
    cat_lower = category.lower()
    feature_list = features.get(cat_lower, ["Quality Service", "Professional Team", "Customer Satisfaction"])

    services_html = "".join([
        f'<div class="feature-card"><div class="feature-icon">✓</div><p>{f}</p></div>'
        for f in feature_list
    ])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{name} | {category.title()} in {city}</title>
    <meta name="description" content="{name} — Professional {category} services in {location}. Contact us today!">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{ font-family: 'Inter', sans-serif; color: #1a1a1a; line-height: 1.6; }}
        header {{
            background: {primary};
            color: white;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky; top: 0; z-index: 100;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }}
        header h1 {{ font-size: 1.4rem; font-weight: 700; }}
        .cta-btn {{
            background: white; color: {primary};
            padding: 0.5rem 1.2rem; border-radius: 50px;
            font-weight: 600; text-decoration: none;
            transition: transform 0.2s;
        }}
        .cta-btn:hover {{ transform: scale(1.05); }}
        .hero {{
            background: linear-gradient(135deg, {primary} 0%, {dark} 100%);
            color: white; padding: 5rem 2rem;
            text-align: center;
        }}
        .hero h2 {{ font-size: 2.8rem; font-weight: 800; margin-bottom: 1rem; line-height: 1.2; }}
        .hero p {{ font-size: 1.2rem; opacity: 0.9; max-width: 600px; margin: 0 auto 2rem; }}
        .hero-btn {{
            background: white; color: {primary};
            padding: 0.9rem 2.5rem; border-radius: 50px;
            font-size: 1.1rem; font-weight: 700;
            text-decoration: none; display: inline-block;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }}
        .section {{ padding: 4rem 2rem; max-width: 1100px; margin: 0 auto; }}
        .section h2 {{ font-size: 2rem; font-weight: 700; margin-bottom: 2rem; text-align: center; color: {primary}; }}
        .features {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }}
        .feature-card {{
            background: #f8fafc; border-radius: 12px;
            padding: 1.5rem; text-align: center;
            border: 2px solid {primary}20;
        }}
        .feature-icon {{
            background: {primary}; color: white;
            width: 48px; height: 48px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.4rem; margin: 0 auto 1rem;
        }}
        .contact-section {{
            background: {primary}10; padding: 4rem 2rem; text-align: center;
        }}
        .contact-section h2 {{ font-size: 2rem; font-weight: 700; color: {primary}; margin-bottom: 1rem; }}
        .contact-btn {{
            background: {primary}; color: white;
            padding: 1rem 3rem; border-radius: 50px;
            font-size: 1.1rem; font-weight: 700;
            text-decoration: none; display: inline-block;
            margin-top: 1.5rem; box-shadow: 0 4px 15px {primary}40;
        }}
        footer {{
            background: #1a1a1a; color: #aaa;
            padding: 2rem; text-align: center; font-size: 0.9rem;
        }}
        .badge {{
            display: inline-block; background: white; color: {primary};
            border: 2px solid {primary}; padding: 0.3rem 1rem;
            border-radius: 50px; font-size: 0.85rem; font-weight: 600;
            margin-bottom: 1.5rem;
        }}
    </style>
</head>
<body>
    <header>
        <h1>{name}</h1>
        <a href="#contact" class="cta-btn">Contact Us</a>
    </header>

    <div class="hero">
        <div class="badge">📍 {location}</div>
        <h2>Your Trusted<br>{category.title()} in {city}</h2>
        <p>Professional service, expert team, and a commitment to quality that you can count on.</p>
        <a href="#contact" class="hero-btn">Get in Touch Today</a>
    </div>

    <section class="section">
        <h2>Why Choose {name}?</h2>
        <div class="features">
            {services_html}
        </div>
    </section>

    <div class="contact-section" id="contact">
        <h2>Ready to Get Started?</h2>
        <p style="color:#555;max-width:500px;margin:0 auto;">
            We're here to help. Contact us today for a free consultation.
        </p>
        <a href="tel:+14161234567" class="contact-btn">📞 Call Now</a>
    </div>

    <footer>
        <p>&copy; {datetime.now().year} {name} · {location} · All rights reserved</p>
    </footer>
</body>
</html>"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=50, help="Max sites to build this run")
    parser.add_argument("--force", action="store_true", help="Rebuild even if site exists")
    args = parser.parse_args()

    # Load data
    leads = json.load(open(LEADS_FILE))["leads"]
    audits = json.load(open(AUDITS_FILE))["audits"]
    proj_data = json.load(open(PROJECTS_FILE))
    projects = proj_data["projects"]

    # Index
    audit_by_lead = {a["leadId"]: a for a in audits}
    built_lead_ids = {p["leadId"] for p in projects}

    # Find grade D/F leads not yet built
    candidates = []
    for lead in leads:
        if lead["id"] in built_lead_ids and not args.force:
            continue
        audit = audit_by_lead.get(lead["id"])
        if audit and audit.get("grade") in ("D", "F"):
            candidates.append(lead)

    print(f"Candidates for building: {len(candidates)}, limit: {args.limit}")
    batch = candidates[:args.limit]

    built = 0
    for lead in batch:
        slug = slugify(lead.get("name", lead["id"]))
        html_path = os.path.join(SITES_DIR, f"{slug}.html")

        if not os.path.exists(html_path) or args.force:
            html = generate_html(lead)
            with open(html_path, "w") as f:
                f.write(html)

        preview_url = f"{PREVIEW_BASE}/{slug}.html"
        proj_id = f"proj-{lead['id'][-8:]}"

        if lead["id"] not in built_lead_ids:
            projects.append({
                "id": proj_id,
                "leadId": lead["id"],
                "businessName": lead.get("name", ""),
                "category": lead.get("category", ""),
                "slug": slug,
                "previewUrl": preview_url,
                "localPath": html_path,
                "status": "ready",
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "sentAt": None,
                "calledAt": None,
                "callOutcome": None,
                "convertedAt": None,
            })
            built += 1
        print(f"  ✓ {lead.get('name')} → {slug}.html")

    # Save projects
    proj_data["projects"] = projects
    proj_data["lastUpdated"] = datetime.now(timezone.utc).isoformat()
    proj_data["stats"] = {
        "total": len(projects),
        "ready": sum(1 for p in projects if p["status"] == "ready"),
        "sent": sum(1 for p in projects if p["status"] == "sent"),
        "converted": sum(1 for p in projects if p["status"] == "converted"),
    }
    with open(PROJECTS_FILE, "w") as f:
        json.dump(proj_data, f, indent=2)

    print(f"\nDone: {built} new sites built. Total projects: {len(projects)}")


if __name__ == "__main__":
    main()
