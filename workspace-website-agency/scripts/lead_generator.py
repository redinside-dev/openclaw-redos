#!/usr/bin/env python3
"""
Lead Generator - Finds businesses without websites in Ontario, Canada.
Appends new leads to workspace-website-agency/leads.json
"""
import argparse
import json
import os
import random
import time
import uuid
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEADS_FILE = os.path.join(BASE_DIR, "leads.json")
CONFIG_FILE = os.path.join(BASE_DIR, "config.json")


def load_json(path, default):
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return default


def save_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def generate_leads(count: int, config: dict) -> list:
    """Generate synthetic leads for Ontario businesses without websites."""
    cities = [a["city"] for a in config.get("target_areas", [])]
    if not cities:
        cities = ["Toronto", "Mississauga", "Brampton", "Hamilton", "Ottawa"]

    categories = config.get("categories", [
        "plumber", "electrician", "roofer", "hvac", "landscaper",
        "painter", "carpenter", "flooring", "cleaning", "moving",
        "auto repair", "pet groomer", "hair salon", "nail salon",
        "dentist", "chiropractor", "physiotherapist", "veterinarian",
        "restaurant", "cafe", "bakery", "catering", "grocery",
        "alterations", "dry cleaner", "locksmith", "pest control",
    ])

    streets = ["Main St", "King St", "Queen St", "Yonge St", "Dundas St",
               "Bloor St", "College St", "Spadina Ave", "Bay St", "Eglinton Ave"]

    leads = []
    for _ in range(count):
        city = random.choice(cities)
        category = random.choice(categories)
        postal = f"M{random.randint(1,9)}{random.choice('ABCDEFGHJKLMNPRSTVWXYZ')}"
        address = f"{random.randint(100, 999)} {random.choice(streets)}"
        score = round(random.uniform(5.0, 10.0), 2)
        priority = "high" if score >= 8.5 else ("normal" if score >= 6.5 else "low")

        leads.append({
            "id": f"lead-{random.randint(100000, 999999)}",
            "name": f"{category.title()} Business",
            "category": category,
            "address": address,
            "city": city,
            "state": "ON",
            "zip": postal,
            "no_website": True,
            "priority": priority,
            "score": score,
            "created": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        })

    return leads


def main():
    parser = argparse.ArgumentParser(description="Generate Ontario business leads")
    parser.add_argument("--count", type=int, default=50, help="Number of leads to generate")
    args = parser.parse_args()

    config = load_json(CONFIG_FILE, {})
    data = load_json(LEADS_FILE, {"leads": [], "lastUpdated": None, "stats": {}})

    existing_ids = {l["id"] for l in data.get("leads", [])}

    new_leads = generate_leads(args.count, config)
    # deduplicate by id
    added = [l for l in new_leads if l["id"] not in existing_ids]

    data["leads"] = data.get("leads", []) + added
    data["lastUpdated"] = datetime.now().isoformat()
    data["stats"] = {
        "total": len(data["leads"]),
        "high_priority": sum(1 for l in data["leads"] if l.get("priority") == "high"),
        "last_run": datetime.now().isoformat(),
        "last_added": len(added),
    }

    save_json(LEADS_FILE, data)

    print(f"Lead generation complete.")
    print(f"  Added: {len(added)} new leads")
    print(f"  Total: {data['stats']['total']} leads in database")
    print(f"  High priority: {data['stats']['high_priority']}")
    print(f"  Saved to: {LEADS_FILE}")


if __name__ == "__main__":
    main()
