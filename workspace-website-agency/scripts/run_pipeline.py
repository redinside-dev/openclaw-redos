#!/usr/bin/env python3
"""
Pipeline Runner for Website Agency
Executes the full build pipeline for leads
"""

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path


def load_leads():
    """Load leads from JSON file"""
    try:
        with open('/Users/redinside/.openclaw/workspace-website-agency/leads.json', 'r') as f:
            data = json.load(f)
            return data.get("leads", [])
    except Exception as e:
        print(f"Error loading leads: {e}")
        return []

def save_leads(leads):
    """Save updated leads back to JSON file"""
    try:
        data = {"leads": leads}
        with open('/Users/redinside/.openclaw/workspace-website-agency/leads.json', 'w') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving leads: {e}")

def build_website(lead):
    """Simulate website building process"""
    print(f"Building website for: {lead.get('name', 'Unknown')} ({lead.get('email', 'no email')})")
    
    # Simulate build process
    time.sleep(2)  # Simulate build time
    
    # Mark as built
    lead['status'] = 'built'
    lead['built_at'] = datetime.now().isoformat()
    lead['website_url'] = f"https://built-{lead['id']}.website-agency.com"
    
    print(f"Website built: {lead['website_url']}")
    return lead

def run_pipeline():
    """Main pipeline execution"""
    print("=== Website Agency - Build Pipeline ===")
    print(f"Starting at: {datetime.now().isoformat()}")
    
    # Load leads
    leads = load_leads()
    if not leads:
        print("No leads found")
        return
    
    # Filter for leads that need building (grade D and below)
    to_build = [lead for lead in leads if lead.get('status') == 'ready' and lead.get('grade', 'A') in ['D', 'E', 'F']]
    
    if not to_build:
        print("No leads ready for building")
        return
    
    print(f"Found {len(to_build)} leads ready for building")
    
    # Build websites
    built_count = 0
    for lead in to_build:
        try:
            lead = build_website(lead)
            built_count += 1
        except Exception as e:
            print(f"Error building website for {lead.get('name', 'Unknown')}: {e}")
            lead['status'] = 'build_failed'
            lead['error'] = str(e)
    
    # Save updated leads
    save_leads(leads)
    
    print(f"Completed: {built_count} websites built")
    print(f"Finished at: {datetime.now().isoformat()}")

if __name__ == "__main__":
    run_pipeline()