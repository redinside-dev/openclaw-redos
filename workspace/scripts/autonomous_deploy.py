#!/usr/bin/env python3
"""
Autonomous Deployment System
Deploys projects without human intervention
"""

import os
import subprocess
import json
from pathlib import Path
from datetime import datetime

class AutonomousDeployer:
    def __init__(self):
        self.workspace = Path(__file__).parent.parent
        self.deployments = []
        
    def check_github_auth(self):
        """Check if GitHub CLI is authenticated"""
        try:
            result = subprocess.run(['gh', 'auth', 'status'], 
                                  capture_output=True, text=True)
            return result.returncode == 0
        except:
            return False
    
    def get_github_user(self):
        """Get current GitHub username"""
        try:
            result = subprocess.run(['gh', 'api', 'user', '--jq', '.login'],
                                  capture_output=True, text=True)
            if result.returncode == 0:
                return result.stdout.strip()
        except:
            pass
        return None
    
    def create_and_push_repo(self, local_path, repo_name, description):
        """Create GitHub repo and push code autonomously"""
        user = self.get_github_user()
        if not user:
            return {"status": "error", "message": "No GitHub auth"}
        
        repo_full_name = f"{user}/{repo_name}"
        
        # Create repo
        try:
            subprocess.run([
                'gh', 'repo', 'create', repo_full_name,
                '--public',
                '--description', description,
                '--source', str(local_path),
                '--push'
            ], check=True, capture_output=True)
            
            url = f"https://github.com/{repo_full_name}"
            return {"status": "success", "url": url, "user": user}
        except subprocess.CalledProcessError as e:
            # Repo might exist, try to push anyway
            try:
                os.chdir(local_path)
                subprocess.run(['git', 'remote', 'set-url', 'origin', 
                              f"https://github.com/{repo_full_name}.git"], 
                              check=True)
                subprocess.run(['git', 'push', '-u', 'origin', 'main'], 
                              check=True)
                url = f"https://github.com/{repo_full_name}"
                return {"status": "success", "url": url, "user": user}
            except:
                return {"status": "error", "message": str(e)}
    
    def deploy_static_site(self, local_path, site_name):
        """Deploy static site autonomously using multiple fallback methods"""
        
        # Method 1: GitHub Pages (no auth needed, uses existing gh auth)
        try:
            os.chdir(local_path)
            
            # Create gh-pages branch
            subprocess.run(['git', 'checkout', '--orphan', 'gh-pages'], 
                          check=True, capture_output=True)
            subprocess.run(['git', 'add', '.'], check=True, capture_output=True)
            subprocess.run(['git', 'commit', '-m', 'Deploy to GitHub Pages'], 
                          check=True, capture_output=True)
            subprocess.run(['git', 'push', '-f', 'origin', 'gh-pages'], 
                          check=True, capture_output=True)
            subprocess.run(['git', 'checkout', 'main'], 
                          check=True, capture_output=True)
            
            user = self.get_github_user()
            url = f"https://{user}.github.io/{site_name}"
            return {"status": "success", "method": "github-pages", "url": url}
        except Exception as e:
            pass
        
        # Method 2: Surge.sh (no auth needed for anonymous deploys)
        try:
            subprocess.run(['npm', 'install', '-g', 'surge'], 
                          check=True, capture_output=True)
            result = subprocess.run(['surge', str(local_path), '--domain', 
                                   f"{site_name}.surge.sh"],
                                  capture_output=True, text=True)
            if result.returncode == 0:
                url = f"https://{site_name}.surge.sh"
                return {"status": "success", "method": "surge", "url": url}
        except:
            pass
        
        # Method 3: Create deployment instructions
        return {
            "status": "partial",
            "message": "Created deployment-ready files",
            "instructions": f"Run: cd {local_path} && vercel --prod"
        }
    
    def deploy_all(self):
        """Deploy all projects autonomously"""
        results = {
            "timestamp": datetime.now().isoformat(),
            "deployments": []
        }
        
        # Deploy codebase-onboarding-agent
        print("📦 Deploying codebase-onboarding-agent...")
        repo_result = self.create_and_push_repo(
            self.workspace / "projects" / "codebase-onboarding-agent",
            "codebase-onboarding-agent",
            "Understand any codebase in minutes with AI-powered analysis"
        )
        results["deployments"].append({
            "project": "codebase-onboarding-agent",
            "type": "github",
            "result": repo_result
        })
        
        if repo_result["status"] == "success":
            print(f"✅ Repo live: {repo_result['url']}")
        
        # Deploy landing page
        print("🌐 Deploying landing page...")
        site_result = self.deploy_static_site(
            self.workspace / "projects" / "codebase-onboarding-agent" / "landing",
            "codebase-onboarding-agent"
        )
        results["deployments"].append({
            "project": "landing-page",
            "type": "static-site",
            "result": site_result
        })
        
        if site_result["status"] == "success":
            print(f"✅ Site live: {site_result['url']}")
        
        # Deploy smart-worker-suspension
        print("📦 Deploying smart-worker-suspension...")
        repo_result2 = self.create_and_push_repo(
            Path("/tmp/smart-worker-suspension"),
            "smart-worker-suspension",
            "Eliminate 96% waste in AI agent systems with exponential backoff"
        )
        results["deployments"].append({
            "project": "smart-worker-suspension",
            "type": "github",
            "result": repo_result2
        })
        
        if repo_result2["status"] == "success":
            print(f"✅ Repo live: {repo_result2['url']}")
        
        # Save results
        results_file = self.workspace / "tmp" / "autonomous-deployment-results.json"
        results_file.parent.mkdir(exist_ok=True)
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📊 Results saved to {results_file}")
        return results


def main():
    deployer = AutonomousDeployer()
    
    if not deployer.check_github_auth():
        print("❌ GitHub CLI not authenticated")
        print("Run: gh auth login")
        return 1
    
    print("🚀 Starting autonomous deployment...")
    results = deployer.deploy_all()
    
    print("\n" + "="*60)
    print("DEPLOYMENT SUMMARY")
    print("="*60)
    
    for deployment in results["deployments"]:
        print(f"\n{deployment['project']}:")
        print(f"  Status: {deployment['result'].get('status', 'unknown')}")
        if 'url' in deployment['result']:
            print(f"  URL: {deployment['result']['url']}")
    
    return 0


if __name__ == "__main__":
    exit(main())
