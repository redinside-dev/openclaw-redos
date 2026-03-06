#!/usr/bin/env python3
"""
Website Agency - AI Website Builder
Generates professional websites for businesses
"""

import json
import os
import uuid
from datetime import datetime
from typing import List, Dict, Optional
import subprocess

# Configuration
WORKSPACE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEADS_FILE = os.path.join(WORKSPACE, "leads.json")
AUDITS_FILE = os.path.join(WORKSPACE, "audits.json")
PROJECTS_FILE = os.path.join(WORKSPACE, "projects.json")
SITES_DIR = os.path.join(WORKSPACE, "sites")


def load_leads() -> dict:
    """Load leads"""
    with open(LEADS_FILE, 'r') as f:
        return json.load(f)


def load_audits() -> dict:
    """Load audits"""
    with open(AUDITS_FILE, 'r') as f:
        return json.load(f)


def load_projects() -> dict:
    """Load projects"""
    if os.path.exists(PROJECTS_FILE):
        with open(PROJECTS_FILE, 'r') as f:
            return json.load(f)
    return {
        "projects": [],
        "lastUpdated": datetime.utcnow().isoformat() + "Z",
        "stats": {
            "total": 0,
            "building": 0,
            "ready": 0,
            "sent": 0,
            "converted": 0
        }
    }


def save_projects(data: dict):
    """Save projects"""
    data["lastUpdated"] = datetime.utcnow().isoformat() + "Z"
    with open(PROJECTS_FILE, 'w') as f:
        json.dump(data, f, indent=2)


def generate_project_id() -> str:
    """Generate unique project ID"""
    return f"proj-{uuid.uuid4().hex[:8]}"


def slugify(text: str) -> str:
    """Convert text to URL-safe slug"""
    import re
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text.strip('-')


def generate_website_content(business: dict) -> str:
    """Generate website HTML content based on business type"""

    name = business.get("name", "My Business")
    category = business.get("category", "business")
    address = business.get("address", "")
    city = business.get("city", "")
    state = business.get("state", "")
    zip_code = business.get("zip", "")
    phone = business.get("phone", "")
    email = business.get("enrichment", {}).get("email", "info@example.com")

    # Category-specific content
    category_content = {
        "restaurant": {
            "hero_title": "Best Local Restaurant",
            "hero_subtitle": "Fresh Ingredients • Great Atmosphere • Excellent Service",
            "services": ["Dine-In", "Takeout & Delivery", "Private Events", "Catering"],
            "cta": "Order Now",
            "color": "#e74c3c"
        },
        "pizza": {
            "hero_title": "Authentic Pizza",
            "hero_subtitle": "Family Recipe • Fresh Ingredients • Wood-Fired",
            "services": ["Pizza", "Pasta", "Salads", "Desserts", "Beverages"],
            "cta": "Order Online",
            "color": "#f39c12"
        },
        "bakery": {
            "hero_title": "Fresh Bakery",
            "hero_subtitle": "Artisan Breads • Pastries • Custom Cakes",
            "services": ["Bread", "Pastries", "Cakes", "Cookies", "Coffee"],
            "cta": "Order Now",
            "color": "#d35400"
        },
        "plumber": {
            "hero_title": "Professional Plumbing",
            "hero_subtitle": "24/7 Emergency Service • Licensed & Insured",
            "services": ["Emergency Repairs", "Installation", "Drain Cleaning", "Water Heaters"],
            "cta": "Call Now",
            "color": "#3498db"
        },
        "electrician": {
            "hero_title": "Expert Electrician",
            "hero_subtitle": "Licensed • Insured • Professional",
            "services": ["Electrical Repairs", "Wiring", "Panel Upgrade", "Lighting"],
            "cta": "Get Quote",
            "color": "#f1c40f"
        },
        "hvac": {
            "hero_title": "HVAC Services",
            "hero_subtitle": "Heating & Cooling • Maintenance • Repair",
            "services": ["AC Repair", "Heating Repair", "Installation", "Maintenance"],
            "cta": "Service Call",
            "color": "#9b59b6"
        },
        "lawyer": {
            "hero_title": "Legal Services",
            "hero_subtitle": "Experienced • Professional • Dedicated",
            "services": ["Consultation", "Legal Advice", "Case Evaluation", "Representation"],
            "cta": "Contact Us",
            "color": "#2c3e50"
        },
        "accountant": {
            "hero_title": "Accounting Services",
            "hero_subtitle": "Tax • Bookkeeping • Financial Planning",
            "services": ["Tax Preparation", "Bookkeeping", "Payroll", "Financial Advice"],
            "cta": "Schedule Consultation",
            "color": "#27ae60"
        },
        "real estate": {
            "hero_title": "Real Estate Services",
            "hero_subtitle": "Buy • Sell • Rent • Invest",
            "services": ["Home Buying", "Home Selling", "Rentals", "Property Management"],
            "cta": "View Listings",
            "color": "#1abc9c"
        },
        "auto repair": {
            "hero_title": "Auto Repair Shop",
            "hero_subtitle": "Expert Mechanics • Fair Prices • Quality Parts",
            "services": ["Oil Change", "Brakes", "Engine Repair", "Tires", "Diagnostics"],
            "cta": "Book Appointment",
            "color": "#e67e22"
        },
        "cleaning service": {
            "hero_title": "Cleaning Services",
            "hero_subtitle": "Residential • Commercial • Move-In/Out",
            "services": ["House Cleaning", "Office Cleaning", "Deep Cleaning", "Move-Out Cleaning"],
            "cta": "Get Quote",
            "color": "#00cec9"
        },
        "landscaping": {
            "hero_title": "Landscaping Services",
            "hero_subtitle": "Design • Installation • Maintenance",
            "services": ["Lawn Care", "Garden Design", "Irrigation", "Tree Service"],
            "cta": "Free Estimate",
            "color": "#00b894"
        },
        "hair salon": {
            "hero_title": "Hair Salon",
            "hero_subtitle": "Styling • Color • Treatments",
            "services": ["Haircuts", "Coloring", "Styling", "Treatments", "Bridal"],
            "cta": "Book Now",
            "color": "#fd79a8"
        },
        "veterinarian": {
            "hero_title": "Veterinary Care",
            "hero_subtitle": "Compassionate Care for Your Pets",
            "services": ["Wellness Exams", "Surgery", "Vaccinations", "Dental Care", "Emergency"],
            "cta": "Call Now",
            "color": "#6c5ce7"
        },
        "gym": {
            "hero_title": "Fitness Center",
            "hero_subtitle": "Train • Transform • Achieve",
            "services": ["Personal Training", "Group Classes", "Equipment", "Locker Rooms"],
            "cta": "Join Now",
            "color": "#0984e3"
        },
        "florist": {
            "hero_title": "Florist",
            "hero_subtitle": "Fresh Flowers • Arrangements • Delivery",
            "services": ["Bouquets", "Arrangements", "Weddings", "Events", "Sympathy"],
            "cta": "Order Online",
            "color": "#e84393"
        },
        "dentist": {
            "hero_title": "Dental Care",
            "hero_subtitle": "Family Dentistry • Modern Techniques",
            "services": ["Cleanings", "Whitening", "Crowns", "Implants", "Orthodontics"],
            "cta": "Book Appointment",
            "color": "#74b9ff"
        },
        "insurance": {
            "hero_title": "Insurance Agency",
            "hero_subtitle": "Protect What Matters Most",
            "services": ["Auto Insurance", "Home Insurance", "Life Insurance", "Business Insurance"],
            "cta": "Get Quote",
            "color": "#2d3436"
        }
    }

    # Get category content or use default
    cat_lower = category.lower()
    content = None
    for cat_key, cat_data in category_content.items():
        if cat_key in cat_lower:
            content = cat_data
            break

    if not content:
        content = {
            "hero_title": name,
            "hero_subtitle": "Professional Services",
            "services": ["Service 1", "Service 2", "Service 3", "Service 4"],
            "cta": "Contact Us",
            "color": "#3498db"
        }

    full_address = f"{address}, {city}, {state} {zip_code}" if address else f"{city}, {state}"

    # Generate HTML
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{name} - {content['hero_title']}</title>
    <meta name="description" content="{name} - {content['hero_subtitle']}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
        }}
        .header {{
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            position: fixed;
            width: 100%;
            top: 0;
            z-index: 1000;
        }}
        .nav {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .logo {{
            font-size: 1.5rem;
            font-weight: 700;
            color: {content['color']};
        }}
        .nav-links {{
            display: flex;
            gap: 2rem;
            list-style: none;
        }}
        .nav-links a {{
            text-decoration: none;
            color: #555;
            font-weight: 500;
            transition: color 0.3s;
        }}
        .nav-links a:hover {{
            color: {content['color']};
        }}
        .cta-button {{
            background: {content['color']};
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: transform 0.2s, box-shadow 0.2s;
        }}
        .cta-button:hover {{
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }}
        .hero {{
            background: linear-gradient(135deg, {content['color']} 0%, {content['color']}dd 100%);
            color: white;
            padding: 8rem 2rem 6rem;
            text-align: center;
            margin-top: 60px;
        }}
        .hero h1 {{
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 1rem;
        }}
        .hero p {{
            font-size: 1.25rem;
            opacity: 0.9;
            margin-bottom: 2rem;
        }}
        .section {{
            padding: 4rem 2rem;
            max-width: 1200px;
            margin: 0 auto;
        }}
        .services {{
            background: #f8f9fa;
        }}
        .section-title {{
            text-align: center;
            font-size: 2rem;
            margin-bottom: 3rem;
            color: #222;
        }}
        .services-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
        }}
        .service-card {{
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            transition: transform 0.3s;
        }}
        .service-card:hover {{
            transform: translateY(-5px);
        }}
        .service-icon {{
            font-size: 2rem;
            margin-bottom: 1rem;
        }}
        .service-card h3 {{
            margin-bottom: 0.5rem;
            color: {content['color']};
        }}
        .about {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4rem;
            align-items: center;
        }}
        .about-content h2 {{
            font-size: 2rem;
            margin-bottom: 1rem;
        }}
        .about-content p {{
            margin-bottom: 1rem;
            color: #666;
        }}
        .contact {{
            background: #f8f9fa;
        }}
        .contact-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 2rem;
            text-align: center;
        }}
        .contact-item {{
            background: white;
            padding: 2rem;
            border-radius: 12px;
        }}
        .contact-item h3 {{
            color: {content['color']};
            margin-bottom: 0.5rem;
        }}
        .footer {{
            background: #222;
            color: white;
            text-align: center;
            padding: 2rem;
        }}
        @media (max-width: 768px) {{
            .hero h1 {{
                font-size: 2rem;
            }}
            .about {{
                grid-template-columns: 1fr;
            }}
            .nav-links {{
                display: none;
            }}
        }}
    </style>
</head>
<body>
    <header class="header">
        <nav class="nav">
            <div class="logo">{name}</div>
            <ul class="nav-links">
                <li><a href="#services">Services</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
            <a href="#contact" class="cta-button">{content['cta']}</a>
        </nav>
    </header>

    <section class="hero">
        <h1>{content['hero_title']}</h1>
        <p>{content['hero_subtitle']}</p>
        <a href="#contact" class="cta-button" style="background: white; color: {content['color']};">{content['cta']}</a>
    </section>

    <section id="services" class="section services">
        <h2 class="section-title">Our Services</h2>
        <div class="services-grid">
"""

    # Add service cards
    for service in content['services']:
        html += f"""
            <div class="service-card">
                <div class="service-icon">✓</div>
                <h3>{service}</h3>
            </div>
"""

    html += f"""
        </div>
    </section>

    <section id="about" class="section">
        <div class="about">
            <div class="about-image" style="background: {content['color']}20; height: 300px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 4rem; color: {content['color']};">
                🏢
            </div>
            <div class="about-content">
                <h2>About {name}</h2>
                <p>Welcome to {name}! We are proud to serve our community with exceptional {category} services.</p>
                <p>Our team is dedicated to providing the highest quality service at competitive prices. With years of experience, we handle every job with professionalism and care.</p>
                <p>Contact us today to experience the difference!</p>
            </div>
        </div>
    </section>

    <section id="contact" class="section contact">
        <h2 class="section-title">Contact Us</h2>
        <div class="contact-grid">
            <div class="contact-item">
                <h3>📍 Address</h3>
                <p>{full_address}</p>
            </div>
            <div class="contact-item">
                <h3>📞 Phone</h3>
                <p><a href="tel:{phone}" style="color: inherit; text-decoration: none;">{phone}</a></p>
            </div>
            <div class="contact-item">
                <h3>✉️ Email</h3>
                <p><a href="mailto:{email}" style="color: inherit; text-decoration: none;">{email}</a></p>
            </div>
            <div class="contact-item">
                <h3>🕐 Hours</h3>
                <p>Mon-Fri: 9am - 6pm<br>Sat: 10am - 4pm<br>Sun: Closed</p>
            </div>
        </div>
    </section>

    <footer class="footer">
        <p>© {datetime.now().year} {name}. All rights reserved.</p>
        <p style="margin-top: 0.5rem; opacity: 0.7;">Professional website generated by AI</p>
    </footer>
</body>
</html>
"""

    return html


def build_website(business: dict) -> dict:
    """Build a website for a business"""

    name = business.get("name", "My Business")
    slug = slugify(name)

    # Ensure sites directory exists
    os.makedirs(SITES_DIR, exist_ok=True)

    # Generate website content
    html = generate_website_content(business)

    # Write HTML file
    site_path = os.path.join(SITES_DIR, f"{slug}.html")
    with open(site_path, 'w') as f:
        f.write(html)

    # Generate preview URL (in production, this would be deployed to a real URL)
    preview_url = f"file://{site_path}"

    return {
        "previewUrl": preview_url,
        "localPath": site_path,
        "status": "ready",
        "builtAt": datetime.utcnow().isoformat() + "Z"
    }


def run_build(lead_id: str = None) -> List[dict]:
    """Main build function"""
    print(f"\n🏗️  Starting Website Build")
    print()

    audits_data = load_audits()
    leads_data = load_leads()
    projects_data = load_projects()

    # Find grade D leads
    grade_d_audits = [a for a in audits_data.get("audits", []) if a.get("grade") == "D"]

    # Filter by lead_id if specified
    if lead_id:
        grade_d_audits = [a for a in grade_d_audits if a.get("leadId") == lead_id]

    # Find leads that haven't been built yet
    existing_project_lead_ids = [p.get("leadId") for p in projects_data.get("projects", [])]
    grade_d_audits = [a for a in grade_d_audits if a.get("leadId") not in existing_project_lead_ids]

    print(f"   Found {len(grade_d_audits)} grade D leads to build")

    new_projects = []

    for audit in grade_d_audits:
        lead_id = audit.get("leadId")

        # Find the lead
        lead = None
        for l in leads_data.get("leads", []):
            if l.get("id") == lead_id:
                lead = l
                break

        if not lead:
            print(f"   ⚠️  Lead not found: {lead_id}")
            continue

        business_name = lead.get("name", "Unknown Business")
        print(f"   🏗️  Building website for: {business_name}")

        try:
            result = build_website(lead)

            project = {
                "id": generate_project_id(),
                "leadId": lead_id,
                "businessName": business_name,
                "category": lead.get("category", "unknown"),
                "previewUrl": result["previewUrl"],
                "localPath": result["localPath"],
                "status": result["status"],
                "createdAt": result["builtAt"],
                "sentAt": None,
                "calledAt": None,
                "callOutcome": None,
                "convertedAt": None
            }

            new_projects.append(project)
            print(f"      ✅ Website built: {result['previewUrl']}")

        except Exception as e:
            print(f"      ❌ Error building website: {e}")

    # Save projects
    all_projects = projects_data.get("projects", []) + new_projects

    # Calculate stats
    stats = {
        "total": len(all_projects),
        "building": sum(1 for p in all_projects if p.get("status") == "building"),
        "ready": sum(1 for p in all_projects if p.get("status") == "ready"),
        "sent": sum(1 for p in all_projects if p.get("status") == "sent"),
        "converted": sum(1 for p in all_projects if p.get("status") == "converted")
    }

    projects_data["projects"] = all_projects
    projects_data["stats"] = stats
    save_projects(projects_data)

    print(f"\n✅ Build Complete!")
    print(f"   Total projects: {stats['total']}")
    print(f"   Ready to send: {stats['ready']}")

    return new_projects


def get_ready_projects() -> List[dict]:
    """Get projects ready for outreach"""
    projects_data = load_projects()
    return [p for p in projects_data.get("projects", []) if p.get("status") == "ready"]


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Website Agency Builder")
    parser.add_argument("--lead-id", type=str, help="Specific lead ID to build for")

    args = parser.parse_args()

    run_build(lead_id=args.lead_id)
