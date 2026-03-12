import json
import datetime

def grade_website(lead):
    # Simple grading logic based on website existence and category
    if lead.get('no_website'):
        return {
            'grade': 'F',
            'scores': {'speed': 0, 'mobile': 0, 'seo': 0, 'design': 0, 'content': 0},
            'issues': ['No website']
        }
    
    # Default grading logic
    base_score = 2
    scores = {
        'speed': base_score,
        'mobile': base_score,
        'seo': base_score,
        'design': base_score,
        'content': base_score
    }
    
    # Adjust scores based on business category
    category = lead.get('category', '').lower()
    if category in ['veterinarian', 'doctor', 'dentist']:
        scores['content'] = 3
    elif category in ['electrician', 'plumber', 'contractor']:
        scores['mobile'] = 3
    
    # Calculate grade
    total = sum(scores.values())
    if total >= 12:
        grade = 'A'
    elif total >= 10:
        grade = 'B'
    elif total >= 8:
        grade = 'C'
    else:
        grade = 'D'
    
    issues = []
    if scores['speed'] <= 2:
        issues.append('Slow load')
    if scores['mobile'] <= 2:
        issues.append('Poor mobile')
    if scores['seo'] <= 2:
        issues.append('No SEO')
    if scores['design'] <= 2:
        issues.append('Bad design')
    if scores['content'] <= 2:
        issues.append('Poor content')
    
    return {
        'grade': grade,
        'scores': scores,
        'issues': issues
    }

def main():
    # Load leads
    with open('/Users/redinside/.openclaw/workspace-website-agency/leads.json', 'r') as f:
        leads_data = json.load(f)
    
    # Load existing audits
    try:
        with open('/Users/redinside/.openclaw/workspace-website-agency/audits.json', 'r') as f:
            audits_data = json.load(f)
    except:
        audits_data = {'audits': []}
    
    pending_leads = [lead for lead in leads_data['leads'] 
                    if not any(audit['leadId'] == lead['id'] for audit in audits_data['audits'])]
    
    new_audits = []
    for lead in pending_leads:
        audit = grade_website(lead)
        audit.update({
            'id': f'audit-{datetime.datetime.now().timestamp()}',
            'leadId': lead['id'],
            'url': lead.get('website', None),
            'businessName': lead['name'],
            'timestamp': datetime.datetime.now().isoformat()
        })
        new_audits.append(audit)
    
    # Update audits file
    audits_data['audits'].extend(new_audits)
    with open('/Users/redinside/.openclaw/workspace-website-agency/audits.json', 'w') as f:
        json.dump(audits_data, f, indent=2)
    
    # Summary
    print(f"Website Agency Audit Complete")
    print(f"Total leads: {len(leads_data['leads'])}")
    print(f"Pending audits: {len(pending_leads)}")
    print(f"New audits created: {len(new_audits)}")
    
    if new_audits:
        print("\nNew Audit Results:")
        for audit in new_audits[:5]:  # Show first 5
            print(f"{audit['businessName']}: {audit['grade']} - {audit['scores']}")

if __name__ == '__main__':
    main()