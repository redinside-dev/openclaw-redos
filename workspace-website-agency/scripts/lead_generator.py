#!/usr/bin/env python3
"""
Lead Generator - Finds REAL businesses without websites in Ontario, Canada.
Uses Overpass API (free, no key required) to query OpenStreetMap data.
Appends new leads to workspace-website-agency/leads.json
"""
import argparse
import json
import os
import time
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEADS_FILE = os.path.join(BASE_DIR, "leads.json")
CONFIG_FILE = os.path.join(BASE_DIR, "config.json")

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"

# Ontario cities with lat/lon
DEFAULT_AREAS = [
    {"city": "Toronto",     "lat": 43.6532, "lon": -79.3832},
    {"city": "Mississauga", "lat": 43.5890, "lon": -79.6441},
    {"city": "Brampton",    "lat": 43.7315, "lon": -79.7624},
    {"city": "Hamilton",    "lat": 43.2557, "lon": -79.8711},
    {"city": "Ottawa",      "lat": 45.4215, "lon": -75.6972},
    {"city": "London",      "lat": 42.9849, "lon": -81.2453},
    {"city": "Markham",     "lat": 43.8561, "lon": -79.3370},
    {"city": "Vaughan",     "lat": 43.8361, "lon": -79.4985},
]

# Category scoring: higher = better lead (more likely to need a website, higher ticket)
CATEGORY_SCORES = {
    "plumber": 9, "electrician": 9, "roofer": 9, "hvac": 9,
    "locksmith": 8, "pest_control": 8, "carpenter": 8,
    "dentist": 9, "veterinary": 8, "physiotherapist": 7, "chiropractor": 7,
    "restaurant": 7, "cafe": 6, "bakery": 7,
    "hairdresser": 6, "beauty": 6,
    "car_repair": 8, "car_wash": 7,
    "florist": 7, "tailor": 6,
}


def overpass_query(lat: float, lon: float, radius_m: int = 5000) -> list:
    """Query Overpass API for businesses without websites near a location."""
    query = f"""
[out:json][timeout:25];
(
  node["shop"]["name"][!"website"](around:{radius_m},{lat},{lon});
  node["amenity"~"restaurant|cafe|dentist|clinic|veterinary|pharmacy|beauty|hairdresser|car_wash|car_repair|bakery|fast_food"]["name"][!"website"](around:{radius_m},{lat},{lon});
  node["craft"]["name"][!"website"](around:{radius_m},{lat},{lon});
  node["office"]["name"][!"website"](around:{radius_m},{lat},{lon});
);
out body;
"""
    data = query.encode("utf-8")
    req = urllib.request.Request(
        OVERPASS_URL,
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result.get("elements", [])
    except (urllib.error.URLError, json.JSONDecodeError) as e:
        print(f"  Overpass error: {e}")
        return []


def score_node(node: dict) -> float:
    """Score a business node based on category and available data completeness."""
    tags = node.get("tags", {})
    score = 5.0  # base

    # Category bonus
    category = (
        tags.get("amenity") or
        tags.get("shop") or
        tags.get("craft") or
        tags.get("office") or
        "unknown"
    )
    score += CATEGORY_SCORES.get(category, 3)

    # Has phone but no website = hot lead
    if tags.get("phone") or tags.get("contact:phone"):
        score += 2

    # Has address data = easier to reach
    if tags.get("addr:street"):
        score += 1

    return min(round(score, 1), 10.0)


def node_to_lead(node: dict, city: str) -> dict:
    tags = node.get("tags", {})
    category = (
        tags.get("amenity") or
        tags.get("shop") or
        tags.get("craft") or
        tags.get("office") or
        "business"
    )
    name = tags.get("name", f"Unnamed {category.title()}")
    street = tags.get("addr:street", "")
    housenumber = tags.get("addr:housenumber", "")
    address = f"{housenumber} {street}".strip() if (housenumber or street) else ""
    postcode = tags.get("addr:postcode", "")
    phone = tags.get("phone") or tags.get("contact:phone") or ""

    score = score_node(node)
    priority = "high" if score >= 8 else ("normal" if score >= 6 else "low")

    return {
        "id": f"osm-{node['id']}",
        "name": name,
        "category": category,
        "address": address,
        "city": city,
        "state": "ON",
        "zip": postcode,
        "phone": phone,
        "lat": node.get("lat"),
        "lon": node.get("lon"),
        "osm_id": node["id"],
        "no_website": True,
        "source": "overpass/openstreetmap",
        "priority": priority,
        "score": score,
        "created": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


def load_json(path, default):
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return default


def save_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def main():
    parser = argparse.ArgumentParser(description="Find real Ontario businesses without websites via Overpass API")
    parser.add_argument("--count", type=int, default=50, help="Target number of leads to find")
    parser.add_argument("--radius", type=int, default=5000, help="Search radius in meters per city")
    args = parser.parse_args()

    config = load_json(CONFIG_FILE, {})
    data = load_json(LEADS_FILE, {"leads": [], "lastUpdated": None, "stats": {}})
    existing_ids = {l["id"] for l in data.get("leads", [])}

    # Use config areas if defined, else defaults
    raw_areas = config.get("target_areas", DEFAULT_AREAS)
    areas = []
    for a in raw_areas:
        if "lat" in a and "lon" in a:
            areas.append(a)
        else:
            # Find matching default by city name
            match = next((d for d in DEFAULT_AREAS if d["city"] == a.get("city")), None)
            if match:
                areas.append(match)

    if not areas:
        areas = DEFAULT_AREAS

    new_leads = []
    print(f"Searching {len(areas)} Ontario cities via Overpass API...")

    for area in areas:
        if len(new_leads) >= args.count:
            break
        city = area["city"]
        lat, lon = area["lat"], area["lon"]
        print(f"  Querying {city} ({lat}, {lon})...")

        nodes = overpass_query(lat, lon, args.radius)
        print(f"    Found {len(nodes)} businesses without websites")

        for node in nodes:
            if len(new_leads) >= args.count:
                break
            lead_id = f"osm-{node['id']}"
            if lead_id not in existing_ids:
                lead = node_to_lead(node, city)
                new_leads.append(lead)
                existing_ids.add(lead_id)

        # Respectful rate limiting for Overpass
        time.sleep(1)

    data["leads"] = data.get("leads", []) + new_leads
    data["lastUpdated"] = datetime.now().isoformat()
    data["stats"] = {
        "total": len(data["leads"]),
        "high_priority": sum(1 for l in data["leads"] if l.get("priority") == "high"),
        "last_run": datetime.now().isoformat(),
        "last_added": len(new_leads),
        "source": "overpass/openstreetmap",
    }

    save_json(LEADS_FILE, data)

    print(f"\nLead generation complete (real data via Overpass API).")
    print(f"  Added: {len(new_leads)} new leads")
    print(f"  Total: {data['stats']['total']} leads in database")
    print(f"  High priority: {data['stats']['high_priority']}")
    print(f"  Saved to: {LEADS_FILE}")


if __name__ == "__main__":
    main()
