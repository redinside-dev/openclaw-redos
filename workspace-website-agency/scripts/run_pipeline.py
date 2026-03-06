#!/usr/bin/env python3
"""
Website Agency - Pipeline Orchestrator
Runs the complete lead generation → audit → build → outreach pipeline
"""

import json
import os
import sys
import time
from datetime import datetime
from typing import List, Dict

# Add scripts directory to path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE = os.path.dirname(SCRIPT_DIR)

# Import the modules
sys.path.insert(0, SCRIPT_DIR)

import lead_generator
import website_auditor
import website_builder
import outreach


def print_header(text: str):
    """Print a nice header"""
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60)


def print_status():
    """Print current pipeline status"""
    # Load all data files
    leads_file = os.path.join(WORKSPACE, "leads.json")
    audits_file = os.path.join(WORKSPACE, "audits.json")
    projects_file = os.path.join(WORKSPACE, "projects.json")

    print("\n📊 PIPELINE STATUS")
    print("-" * 40)

    # Leads
    if os.path.exists(leads_file):
        with open(leads_file) as f:
            leads = json.load(f)
            print(f"📍 Leads: {leads['stats']['total']} total")
            print(f"   - Without website: {leads['stats']['withoutWebsite']}")
            print(f"   - Pending audit: {leads['stats']['pendingAudit']}")

    # Audits
    if os.path.exists(audits_file):
        with open(audits_file) as f:
            audits = json.load(f)
            print(f"\n🔍 Audits: {audits['stats']['total']} total")
            print(f"   - Grade A: {audits['stats']['gradeA']}")
            print(f"   - Grade B: {audits['stats']['gradeB']}")
            print(f"   - Grade C: {audits['stats']['gradeC']}")
            print(f"   - Grade D: {audits['stats']['gradeD']} ← Build candidates!")

    # Projects
    if os.path.exists(projects_file):
        with open(projects_file) as f:
            projects = json.load(f)
            print(f"\n🏗️  Projects: {projects['stats']['total']} total")
            print(f"   - Building: {projects['stats']['building']}")
            print(f"   - Ready: {projects['stats']['ready']}")
            print(f"   - Sent: {projects['stats']['sent']}")
            print(f"   - Converted: {projects['stats']['converted']} 💰")

    print()


def run_full_pipeline(leads_count: int = 50):
    """Run the complete pipeline"""
    print_header("🚀 WEBSITE AGENCY PIPELINE")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    start_time = time.time()

    # Stage 1: Lead Generation
    print_header("STAGE 1: Lead Generation")
    print("Finding businesses without websites...")
    new_leads = lead_generator.run_lead_generation(count=leads_count)
    print(f"✅ Generated {len(new_leads)} new leads")

    # Stage 2: Website Audit
    print_header("STAGE 2: Website Audit")
    print("Analyzing websites and grading...")
    new_audits = website_auditor.run_audit()
    print(f"✅ Audited {len(new_audits)} websites")

    # Stage 3: Website Build
    print_header("STAGE 3: Website Build")
    print("Building websites for grade D leads...")
    new_projects = website_builder.run_build()
    print(f"✅ Built {len(new_projects)} websites")

    # Stage 4: Outreach
    print_header("STAGE 4: Outreach")
    print("Sending preview links to clients...")
    outreach_results = outreach.run_outreach()
    print(f"✅ Reached {len(outreach_results)} clients")

    # Final status
    elapsed = time.time() - start_time
    print_header("✅ PIPELINE COMPLETE")
    print(f"Total time: {elapsed:.1f} seconds")

    print_status()

    return {
        "leads": len(new_leads),
        "audits": len(new_audits),
        "builds": len(new_projects),
        "outreach": len(outreach_results),
        "elapsed": elapsed
    }


def run_stage(stage: str, **kwargs):
    """Run a specific pipeline stage"""
    if stage == "leads":
        print_header("LEAD GENERATION")
        lead_generator.run_lead_generation(**kwargs)
    elif stage == "audit":
        print_header("WEBSITE AUDIT")
        website_auditor.run_audit(**kwargs)
    elif stage == "build":
        print_header("WEBSITE BUILD")
        website_builder.run_build(**kwargs)
    elif stage == "outreach":
        print_header("OUTREACH")
        outreach.run_outreach(**kwargs)
    elif stage == "status":
        print_status()
    else:
        print(f"Unknown stage: {stage}")
        print("Available stages: leads, audit, build, outreach, status")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Website Agency Pipeline")
    parser.add_argument("--stage", choices=["leads", "audit", "build", "outreach", "status", "full"],
                       default="full", help="Pipeline stage to run")
    parser.add_argument("--count", type=int, default=50, help="Number of leads to generate")
    parser.add_argument("--lead-id", type=str, help="Specific lead ID for audit/build")

    args = parser.parse_args()

    if args.stage == "full":
        run_full_pipeline(leads_count=args.count)
    elif args.stage == "status":
        print_status()
    else:
        run_stage(args.stage, lead_id=args.lead_id)
