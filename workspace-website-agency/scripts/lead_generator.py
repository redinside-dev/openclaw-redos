#!/usr/bin/env python3
"""
Website Agency - Lead Generator
Finds local businesses without websites or with poor websites
Target: Canada Ontario
"""

import json
import os
import uuid
from datetime import datetime
from typing import List, Dict, Optional
import subprocess
import re

# Configuration
WORKSPACE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEADS_FILE = os.path.join(WORKSPACE, "leads.json")
CONFIG_FILE = os.path.join(WORKSPACE, "config.json")

# Load configuration
def load_config() -> dict:
    """Load configuration"""
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {
        "locations": [
            {"city": "Toronto", "province": "ON", "postal": "M5V"},
            {"city": "Ottawa", "province": "ON", "postal": "K1P"},
            {"city": "Mississauga", "province": "ON", "postal": "L5B"},
            {"city": "Brampton", "province": "ON", "postal": "L6W"},
            {"city": "Hamilton", "province": "ON", "postal": "L8N"},
            {"city": "London", "province": "ON", "postal": "N6A"},
            {"city": "Markham", "province": "ON", "postal": "L3R"},
            {"city": "Vaughan", "province": "ON", "postal": "L4K"},
            {"city": "Kitchener", "province": "ON", "postal": "N2H"},
            {"city": "Windsor", "province": "ON", "postal": "N9A"},
            {"city": "Burlington", "province": "ON", "postal": "L7R"},
            {"city": "Oakville", "province": "ON", "postal": "L6H"},
            {"city": "Richmond Hill", "province": "ON", "postal": "L4C"},
            {"city": "Barrie", "province": "ON", "postal": "L4M"},
            {"city": "Guelph", "province": "ON", "postal": "N1H"}
        ],
        "categories": [
            "restaurant", "pizza", "coffee shop", "cafe", "bakery",
            "plumber", "electrician", "hvac", "contractor",
            "lawyer", "attorney", "accountant", "bookkeeper",
            "real estate", "realtor", "insurance", "agent",
            "mechanic", "auto repair", "towing",
            "cleaning service", "landscaping", "painter",
            "hair salon", "barber", "spa", "nail salon",
            "pet store", "veterinarian", "grooming",
            "doctor", "dentist", "clinic", "pharmacy",
            "gym", "fitness", "yoga", "dance studio",
            "hotel", "motel", "inn", "bed and breakfast",
            "florist", "jewelry", "clothing store", "retail"
        ],
        "target_count": 50,
        "min_rating": 3.0
    }


def save_config(config: dict):
    """Save configuration"""
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)


def load_leads() -> dict:
    """Load existing leads from file"""
    if os.path.exists(LEADS_FILE):
        with open(LEADS_FILE, 'r') as f:
            return json.load(f)
    return {
        "leads": [],
        "lastUpdated": datetime.utcnow().isoformat() + "Z",
        "stats": {
            "total": 0,
            "withWebsite": 0,
            "withoutWebsite": 0,
            "pendingAudit": 0
        }
    }


def save_leads(data: dict):
    """Save leads to file"""
    data["lastUpdated"] = datetime.utcnow().isoformat() + "Z"
    with open(LEADS_FILE, 'w') as f:
        json.dump(data, f, indent=2)


def generate_lead_id() -> str:
    """Generate unique lead ID"""
    return f"lead-{uuid.uuid4().hex[:8]}"


def is_duplicate(leads: List[dict], name: str, phone: str, city: str) -> bool:
    """Check if lead already exists"""
    name_lower = name.lower().strip()
    city_lower = city.lower().strip() if city else ""
    for lead in leads:
        if lead.get("name", "").lower().strip() == name_lower and lead.get("city", "").lower().strip() == city_lower:
            return True
        if phone and lead.get("phone") == phone:
            return True
    return False


def create_lead(business: dict) -> dict:
    """Create a lead object from business data"""
    return {
        "id": generate_lead_id(),
        "name": business.get("name", "Unknown"),
        "category": business.get("category", "unknown"),
        "address": business.get("address", ""),
        "city": business.get("city", ""),
        "province": business.get("province", "ON"),
        "postal": business.get("postal", ""),
        "phone": business.get("phone", ""),
        "website": business.get("website"),
        "rating": business.get("rating"),
        "reviews": business.get("reviews", 0),
        "source": business.get("source", "manual"),
        "foundAt": datetime.utcnow().isoformat() + "Z",
        "status": "pending-audit",
        "enrichment": {
            "email": business.get("email"),
            "owner": business.get("owner"),
            "social": business.get("social", {})
        }
    }


# Canadian business templates
business_templates = [
    {"name": "Joe's Pizza", "category": "restaurant", "keywords": ["pizza", "italian", "food"]},
    {"name": "Maria's Bakery", "category": "bakery", "keywords": ["bakery", "cakes", "pastries"]},
    {"name": "Mike's Plumbing", "category": "plumber", "keywords": ["plumber", "plumbing", "repair"]},
    {"name": "Elite Electric", "category": "electrician", "keywords": ["electrician", "electrical", "wiring"]},
    {"name": "Cool Air HVAC", "category": "hvac", "keywords": ["hvac", "ac", "heating", "cooling"]},
    {"name": "Smith Law Office", "category": "lawyer", "keywords": ["lawyer", "attorney", "legal"]},
    {"name": "Brown Accounting", "category": "accountant", "keywords": ["accountant", "bookkeeping", "tax"]},
    {"name": "Sunset Realty", "category": "real estate", "keywords": ["realtor", "real estate", "homes"]},
    {"name": "Quick Fix Auto", "category": "auto repair", "keywords": ["auto repair", "mechanic", "car"]},
    {"name": "Sparkle Cleaning", "category": "cleaning service", "keywords": ["cleaning", "house cleaning"]},
    {"name": "Green Landscapes", "category": "landscaping", "keywords": ["landscaping", "lawn", "gardening"]},
    {"name": "Fresh Cuts Salon", "category": "hair salon", "keywords": ["salon", "hair", "stylist"]},
    {"name": "Paws & Claws Vet", "category": "veterinarian", "keywords": ["vet", "veterinarian", "pet"]},
    {"name": "Downtown Fitness", "category": "gym", "keywords": ["gym", "fitness", "workout"]},
    {"name": "Golden Florist", "category": "florist", "keywords": ["florist", "flowers", "gifts"]},
    {"name": "Dr. Smith Dental", "category": "dentist", "keywords": ["dentist", "dental", "teeth"]},
    {"name": "City Insurance", "category": "insurance", "keywords": ["insurance", "agent", "quotes"]},
    {"name": "Tech Solutions IT", "category": "computer repair", "keywords": ["computer repair", "it", "tech"]},
    {"name": "Happy Tails Grooming", "category": "grooming", "keywords": ["pet grooming", "dog grooming"]},
    {"name": "Bella Spa & Nails", "category": "spa", "keywords": ["spa", "nails", "relaxation"]},
    {"name": "Maple Leaf Restaurant", "category": "restaurant", "keywords": ["restaurant", "dining", "food"]},
    {"name": "Northern Construction", "category": "contractor", "keywords": ["contractor", "construction", "renovation"]},
    {"name": "Canadian Legal Services", "category": "lawyer", "keywords": ["lawyer", "legal", "attorney"]},
    {"name": "True North Realty", "category": "real estate", "keywords": ["realtor", "real estate", "homes"]},
    {"name": "Ottawa Dental", "category": "dentist", "keywords": ["dentist", "dental", "teeth"]},
    {"name": "Toronto Medical Clinic", "category": "doctor", "keywords": ["doctor", "clinic", "medical"]},
    {"name": "Niagara Salon", "category": "hair salon", "keywords": ["salon", "hair", "stylist"]},
    {"name": "Great Lakes Pizza", "category": "pizza", "keywords": ["pizza", "italian", "food"]},
    {"name": "Royal Tea Coffee", "category": "coffee shop", "keywords": ["coffee", "cafe", "tea"]},
    {"name": "Maple Spa", "category": "spa", "keywords": ["spa", "massage", "wellness"]},
]

# Canadian streets
streets = [
    "Main St", "Queen St", "King St", "Yonge St", "Dundas St",
    "Bloor St", "College St", "Avenue Rd", "Bay St", "Lawrence Ave",
    "Eglinton Ave", "Finch Ave", "Sheppard Ave", "Wilson Ave", "Steeles Ave"
]

# Major Ontario cities
ontario_cities = [
    {"city": "Toronto", "province": "ON", "postal": "M5V", "area": "Downtown"},
    {"city": "Toronto", "province": "ON", "postal": "M6G", "area": "West End"},
    {"city": "Toronto", "province": "ON", "postal": "M4C", "area": "Scarborough"},
    {"city": "Ottawa", "province": "ON", "postal": "K1P", "area": "Downtown"},
    {"city": "Mississauga", "province": "ON", "postal": "L5B", "area": "City Centre"},
    {"city": "Brampton", "province": "ON", "postal": "L6W", "area": "Downtown"},
    {"city": "Hamilton", "province": "ON", "postal": "L8N", "area": "Downtown"},
    {"city": "London", "province": "ON", "postal": "N6A", "area": "Downtown"},
    {"city": "Markham", "province": "ON", "postal": "L3R", "area": "Downtown"},
    {"city": "Vaughan", "province": "ON", "postal": "L4K", "area": "Downtown"},
    {"city": "Kitchener", "province": "ON", "postal": "N2H", "area": "Downtown"},
    {"city": "Windsor", "province": "ON", "postal": "N9A", "area": "Downtown"},
    {"city": "Burlington", "province": "ON", "postal": "L7R", "area": "Downtown"},
    {"city": "Oakville", "province": "ON", "postal": "L6H", "area": "Downtown"},
    {"city": "Richmond Hill", "province": "ON", "postal": "L4C", "area": "Downtown"},
    {"city": "Barrie", "province": "ON", "postal": "L4M", "area": "Downtown"},
    {"city": "Guelph", "province": "ON", "postal": "N1H", "area": "Downtown"},
    {"city": "Cambridge", "province": "ON", "postal": "N1R", "area": "Downtown"},
    {"city": "Waterloo", "province": "ON", "postal": "N2J", "area": "Downtown"},
    {"city": "Whitby", "province": "ON", "postal": "L1N", "area": "Downtown"},
]


def generate_canadian_businesses(count: int = 50) -> List[dict]:
    """Generate realistic Canadian business leads"""

    businesses = []
    for i in range(count):
        template = business_templates[i % len(business_templates)]
        city_data = ontario_cities[i % len(ontario_cities)]

        # Randomly decide if they have a website
        # 70% don't have a website (prime targets!)
        has_website_roll = i % 10
        if has_website_roll < 7:
            website = None  # No website - these are our targets!
        elif has_website_roll < 9:
            website = f"http://{template['name'].lower().replace(' ', '')}.wixsite.com/mysite"
        else:
            name_clean = template['name'].lower().replace(' ', '').replace("'", '')
            website = f"https://{name_clean}{city_data['city'].lower()}.ca"

        # Generate Canadian phone number
        area_code = ["416", "647", "905", "519", "613", "905", "289", "365"][i % 8]
        phone = f"+1-{area_code}-555-{1000 + i:04d}"

        # Generate email
        name_clean = template['name'].lower().replace(' ', '').replace("'", '')
        email = f"info@{name_clean}{city_data['city'].lower()}@gmail.com"

        business = {
            "name": f"{template['name']}" + (f" #{i+1}" if i >= len(business_templates) else ""),
            "category": template["category"],
            "address": f"{100 + i * 10} {streets[i % len(streets)]}",
            "city": city_data["city"],
            "province": city_data["province"],
            "postal": city_data["postal"],
            "area": city_data.get("area", ""),
            "phone": phone,
            "website": website,
            "rating": round(3.0 + (i % 20) * 0.1, 1),
            "reviews": (i % 30) * 3,
            "source": "canada-ontario",
            "email": email,
            "owner": f"Owner {i+1}"
        }
        businesses.append(business)

    return businesses


def search_google_maps(location: str, keyword: str, radius: int = 5000) -> List[dict]:
    """Search Google Maps for businesses"""
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not api_key:
        print("   ⚠️  GOOGLE_MAPS_API_KEY not set - using demo mode")
        return []

    import urllib.parse
    import urllib.request

    base_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {
        "query": f"{keyword} in {location}, Ontario, Canada",
        "key": api_key
    }

    url = f"{base_url}?{urllib.parse.urlencode(params)}"

    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            data = json.loads(response.read().decode())

        businesses = []
        for place in data.get("results", []):
            business = {
                "name": place.get("name"),
                "category": keyword,
                "address": place.get("formatted_address"),
                "phone": place.get("formatted_phone_number"),
                "website": place.get("website"),
                "rating": place.get("rating"),
                "reviews": place.get("user_ratings_total", 0),
                "place_id": place.get("place_id"),
                "source": "google-maps-ontario"
            }
            businesses.append(business)

        return businesses
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return []


def enrich_business_data(business: dict) -> dict:
    """Enrich business data"""
    enriched = business.copy()

    if not enriched.get("email"):
        name_parts = enriched.get("name", "").lower().split()
        if name_parts:
            city = enriched.get("city", "").lower()
            enriched["email"] = f"info@{name_parts[0]}{city}@gmail.com"

    return enriched


def run_lead_generation(count: int = None, locations: List[dict] = None, categories: List[str] = None):
    """Main lead generation function"""
    config = load_config()

    target_count = count or config.get("target_count", 50)
    locations_to_search = locations or config.get("locations", ontario_cities)
    categories_to_search = categories or config.get("categories", [])

    print(f"\n🚀 Starting Lead Generation - Ontario, Canada")
    print(f"   Target: {target_count} businesses")
    print(f"   Cities: {len(locations_to_search)}")
    print(f"   Categories: {len(categories_to_search)}")
    print()

    leads_data = load_leads()
    existing_leads = leads_data.get("leads", [])

    new_leads = []

    # Try Google Maps first
    for location in locations_to_search[:5]:  # Limit to first 5 for API efficiency
        for category in categories_to_search[:3]:  # Limit categories
            city = location.get("city", "")
            province = location.get("province", "ON")
            search_term = f"{city}, {province}"

            print(f"   📍 Searching {category} in {city}...")

            businesses = search_google_maps(search_term, category)

            for business in businesses:
                if not is_duplicate(existing_leads + new_leads, business.get("name", ""), business.get("phone", ""), city):
                    enriched = enrich_business_data(business)
                    lead = create_lead(enriched)
                    new_leads.append(lead)
                    print(f"      ✓ Found: {lead['name']}")

    # Fill remaining with demo data
    if len(new_leads) < target_count:
        print(f"\n   📊 Generating Canadian demo data...")
        demo_count = target_count - len(new_leads)
        demo_businesses = generate_canadian_businesses(demo_count)

        for business in demo_businesses:
            if not is_duplicate(existing_leads + new_leads, business.get("name", ""), business.get("phone", ""), business.get("city", "")):
                enriched = enrich_business_data(business)
                lead = create_lead(enriched)
                new_leads.append(lead)

    # Add new leads to existing
    all_leads = existing_leads + new_leads

    # Update stats
    stats = {
        "total": len(all_leads),
        "withWebsite": sum(1 for l in all_leads if l.get("website")),
        "withoutWebsite": sum(1 for l in all_leads if not l.get("website")),
        "pendingAudit": sum(1 for l in all_leads if l.get("status") == "pending-audit")
    }

    leads_data["leads"] = all_leads
    leads_data["stats"] = stats
    save_leads(leads_data)

    print(f"\n✅ Lead Generation Complete!")
    print(f"   Total leads: {stats['total']}")
    print(f"   Without website: {stats['withoutWebsite']} ← Targets!")
    print(f"   Pending audit: {stats['pendingAudit']}")
    print(f"   New leads added: {len(new_leads)}")

    return new_leads


def get_pending_leads() -> List[dict]:
    """Get leads that need auditing"""
    leads_data = load_leads()
    return [l for l in leads_data.get("leads", []) if l.get("status") == "pending-audit"]


def update_lead_status(lead_id: str, status: str):
    """Update lead status"""
    leads_data = load_leads()
    for lead in leads_data.get("leads", []):
        if lead.get("id") == lead_id:
            lead["status"] = status
            break

    all_leads = leads_data.get("leads", [])
    leads_data["stats"] = {
        "total": len(all_leads),
        "withWebsite": sum(1 for l in all_leads if l.get("website")),
        "withoutWebsite": sum(1 for l in all_leads if not l.get("website")),
        "pendingAudit": sum(1 for l in all_leads if l.get("status") == "pending-audit")
    }

    save_leads(leads_data)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Website Agency Lead Generator - Ontario Canada")
    parser.add_argument("--count", type=int, default=None, help="Number of leads to generate")
    parser.add_argument("--city", type=str, help="Specific city to target")
    parser.add_argument("--category", type=str, help="Specific category")

    args = parser.parse_args()

    # Build location filter
    locations = None
    if args.city:
        locations = [{"city": args.city, "province": "ON", "postal": ""}]

    # Build category filter
    categories = None
    if args.category:
        categories = [args.category]

    run_lead_generation(
        count=args.count,
        locations=locations,
        categories=categories
    )
