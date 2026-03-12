#!/usr/bin/env python3
"""
Website Agency Outreach - Sends SMS and emails to qualified leads.
Finds leads with grade F (no website) and sends outreach with website preview links.
"""
import json
import os
import random
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEADS_FILE = os.path.join(BASE_DIR, "leads.json")
AUDITS_FILE = os.path.join(BASE_DIR, "audits.json")
LOG_FILE = os.path.join(BASE_DIR, "logs", "outreach.log")

# Configuration - these would normally be environment variables or config
TWILIO_ACCOUNT_SID = "your_twilio_account_sid"
TWILIO_AUTH_TOKEN = "your_twilio_auth_token"
TWILIO_PHONE_NUMBER = "+15551234567"

SENDGRID_API_KEY = "your_sendgrid_api_key"
FROM_EMAIL = "agency@yourdomain.com"


class OutreachScript:
    def __init__(self):
        self.leads = []
        self.audits = []
        self.outreach_log = []
        self.load_data()
        
    def load_data(self):
        """Load leads and audit data from JSON files."""
        # Load leads
        if os.path.exists(LEADS_FILE):
            with open(LEADS_FILE, 'r') as f:
                leads_data = json.load(f)
                self.leads = leads_data.get('leads', [])
        else:
            print(f"Error: Leads file not found at {LEADS_FILE}")
            return
            
        # Load audits
        if os.path.exists(AUDITS_FILE):
            with open(AUDITS_FILE, 'r') as f:
                audits_data = json.load(f)
                self.audits = audits_data.get('audits', [])
        else:
            print(f"Error: Audits file not found at {AUDITS_FILE}")
            return
            
    def find_qualified_leads(self):
        """Find leads ready for outreach (grade F with no website)."""
        qualified = []
        for lead in self.leads:
            # Find audit for this lead
            audit = next((a for a in self.audits if a['leadId'] == lead['id']), None)
            if audit and audit.get('grade') == 'F' and lead.get('no_website', True):
                # Check if already contacted recently
                last_contact = self.get_last_contact(lead['id'])
                if last_contact and (datetime.now() - last_contact).days < 7:
                    continue  # Skip if contacted in last 7 days
                    
                qualified.append({
                    'lead': lead,
                    'audit': audit,
                    'days_since_creation': (datetime.now() - 
                                           datetime.strptime(lead['created'], '%Y-%m-%d %H:%M:%S')).days
                })
        
        # Sort by priority: high priority first, then oldest first
        qualified.sort(key=lambda x: (-1 if x['lead'].get('priority') == 'high' else 0, x['days_since_creation']))
        return qualified
        
    def get_last_contact(self, lead_id):
        """Get the last contact date for a lead from log."""
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE, 'r') as f:
                for line in f:
                    if lead_id in line:
                        parts = line.split('|')
                        if len(parts) >= 2:
                            date_str = parts[1].strip()
                            try:
                                return datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
                            except ValueError:
                                continue
        return None
        
    def send_sms(self, to_phone, message):
        """Send SMS using Twilio (placeholder implementation)."""
        # This is a placeholder - would use Twilio API in production
        print(f"SMS to {to_phone}: {message}")
        return True
        
    def send_email(self, to_email, subject, html_content):
        """Send email using SendGrid (placeholder implementation)."""
        # This is a placeholder - would use SendGrid API in production
        print(f"Email to {to_email}: {subject}")
        return True
        
    def create_website_preview_link(self, lead):
        """Generate a preview link for the lead's website."""
        # In production, this would generate a real preview URL
        return f"https://preview.youragency.com/{lead['id']}/preview"
        
    def create_email_content(self, lead, audit, preview_link):
        """Create personalized email content."""
        business_name = lead['name']
        category = lead['category']
        
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Hi {business_name},</h2>
                <p>We noticed you're a {category} business in {lead['city']}. Great to see you're serving the community!</p>
                <p>We've created a custom website preview just for you. This is what your business could look like online:</p>
                <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; text-align: center;">
                    <a href="{preview_link}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; margin: 10px 0;">
                        View Your Website Preview
                    </a>
                    <br>
                    <small style="color: #666;">No obligation, just see what's possible!</small>
                </div>
                <p><strong>Why this matters for your {category} business:</strong></p>
                <ul>
                    <li>Be found by more customers searching online</li>
                    <li>Showcase your services 24/7</li>
                    <li>Build trust with professional online presence</li>
                    <li>Compete with larger businesses</li>
                </ul>
                <p>We've already graded your current online presence and found opportunities for improvement. The preview shows exactly how we can help.</p>
                <p>Would you like to discuss this further? Just reply to this email or call us at 1-800-WEBSITES.</p>
                <p>Best regards,<br>The Website Agency Team</p>
            </div>
        </body>
        </html>
        """
        return html
        
    def create_sms_content(self, lead, preview_link):
        """Create SMS content."""
        business_name = lead['name']
        return f"Hi {business_name}! We created a website preview for your business. Check it out: {preview_link} - No obligation! Reply STOP to opt out."
        
    def log_outreach(self, lead_id, method, success=True, error=None):
        """Log outreach attempt to file."""
        if not os.path.exists(os.path.dirname(LOG_FILE)):
            os.makedirs(os.path.dirname(LOG_FILE))
            
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        status = "SUCCESS" if success else "FAILED"
        error_msg = f" | Error: {error}" if error else ""
        
        log_entry = f"[{timestamp}] {lead_id} | {method} | {status}{error_msg}\n"
        
        with open(LOG_FILE, 'a') as f:
            f.write(log_entry)
            
        return log_entry
        
    def run_outreach(self, limit=10):
        """Main outreach execution."""
        print("Starting Website Agency Outreach...")
        
        # Find qualified leads
        qualified_leads = self.find_qualified_leads()
        print(f"Found {len(qualified_leads)} qualified leads for outreach")
        
        if not qualified_leads:
            print("No leads ready for outreach. Exiting.")
            return
            
        # Process up to limit leads
        results = []
        for i, ql in enumerate(qualified_leads[:limit]):
            lead = ql['lead']
            audit = ql['audit']
            
            print(f"\nProcessing lead {i+1}/{min(limit, len(qualified_leads))}: {lead['name']}")
            
            # Generate preview link
            preview_link = self.create_website_preview_link(lead)
            
            # Send email
            email_sent = False
            email_subject = f"Your Custom Website Preview - {lead['name']}"
            email_content = self.create_email_content(lead, audit, preview_link)
            
            try:
                email_sent = self.send_email(
                    to_email="contact@" + lead['name'].replace(' ', '').lower() + ".com",  # Placeholder
                    subject=email_subject,
                    html_content=email_content
                )
                results.append(f"Email sent to {lead['name']}")
                self.log_outreach(lead['id'], "email", success=True)
            except Exception as e:
                error_msg = f"Email failed: {str(e)}"
                print(error_msg)
                self.log_outreach(lead['id'], "email", success=False, error=str(e))
                
            # Send SMS
            sms_sent = False
            sms_content = self.create_sms_content(lead, preview_link)
            
            try:
                sms_sent = self.send_sms(
                    to_phone="+1" + str(random.randint(4161234567, 4169876543)),  # Placeholder
                    message=sms_content
                )
                results.append(f"SMS sent to {lead['name']}")
                self.log_outreach(lead['id'], "sms", success=True)
            except Exception as e:
                error_msg = f"SMS failed: {str(e)}"
                print(error_msg)
                self.log_outreach(lead['id'], "sms", success=False, error=str(e))
                
            # Update lead with contact timestamp
            lead['last_contacted'] = datetime.now().isoformat()
            
            print(f"Lead {lead['name']} processed: Email={'✓' if email_sent else '✗'}, SMS={'✓' if sms_sent else '✗'}")
            
        # Save updated leads
        self.save_leads()
        
        # Summary
        print(f"\nOutreach Summary:")
        print(f"Leads processed: {len(qualified_leads[:limit])}")
        print(f"Emails sent: {sum(1 for r in results if 'Email sent' in r)}")
        print(f"SMS sent: {sum(1 for r in results if 'SMS sent' in r)}")
        print(f"Total outreach attempts: {len(results)}")
        
        return results
        
    def save_leads(self):
        """Save updated leads data back to JSON file."""
        data = {
            "leads": self.leads,
            "lastUpdated": datetime.now().isoformat(),
            "stats": {
                "total": len(self.leads),
                "high_priority": sum(1 for l in self.leads if l.get('priority') == 'high'),
                "last_outreach_run": datetime.now().isoformat()
            }
        }
        
        with open(LEADS_FILE, 'w') as f:
            json.dump(data, f, indent=2)

def main():
    """Main execution function."""
    # Parse command line arguments
    import argparse
    parser = argparse.ArgumentParser(description="Website Agency Outreach Script")
    parser.add_argument("--limit", type=int, default=10, 
                       help="Maximum number of leads to contact")
    parser.add_argument("--test", action="store_true", 
                       help="Run in test mode (no actual sending)")
    
    args = parser.parse_args()
    
    # Initialize and run outreach
    outreach = OutreachScript()
    
    if args.test:
        print("Running in TEST mode - no actual messages will be sent")
        # Override send methods for test mode
        outreach.send_sms = lambda to_phone, message: print(f"TEST: Would send SMS to {to_phone}: {message}")
        outreach.send_email = lambda to_email, subject, html_content: print(f"TEST: Would send email to {to_email}: {subject}")
        
    results = outreach.run_outreach(limit=args.limit)
    
    print(f"\nOutreach completed successfully!")
    print(f"Results saved to {LOG_FILE}")
    
    # Return success code
    return 0


if __name__ == "__main__":
    exit(main())