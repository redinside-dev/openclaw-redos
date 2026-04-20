# Deploy Landing Page to Vercel

## Quick Deploy (2 minutes)

### Option 1: One-Command Deploy
```bash
cd /Users/redinside/.openclaw/workspace/projects/codebase-onboarding-agent/landing

# Login to Vercel (opens browser)
vercel login

# Deploy to production
vercel --prod
```

### Option 2: Vercel Dashboard (No CLI)
1. Go to https://vercel.com/new
2. Import from Git: Select the codebase-onboarding-agent repo (once you create it)
3. Root Directory: `landing`
4. Click "Deploy"

### Option 3: Deploy from GitHub
1. Push the repo to GitHub (see SETUP-REDINSIDE.md)
2. Go to https://vercel.com
3. Click "Add New Project"
4. Import `redinside/codebase-onboarding-agent`
5. Set Root Directory to `landing`
6. Deploy

## What You'll Get

**Live URL:** `https://codebase-onboarding-agent-xxx.vercel.app`

**Features:**
- ✅ Hero section with value prop
- ✅ Feature showcase
- ✅ Pricing tiers (Free/Pro/Enterprise)
- ✅ Waitlist signup form
- ✅ Responsive design (mobile-friendly)
- ✅ Fast loading (Tailwind CSS CDN)

## After Deployment

1. **Custom Domain** (optional)
   - Add `codebase-onboarding.ai` in Vercel dashboard
   - Update DNS records

2. **Analytics**
   - Sign up for Plausible.io
   - Already integrated in the HTML

3. **Waitlist Form**
   - Sign up for Formspree.io
   - Replace `YOUR_FORM_ID` in index.html with your Formspree endpoint

4. **Test It**
   - Visit the URL
   - Try the waitlist form
   - Check mobile responsiveness

## Files Ready to Deploy

```
landing/
├── index.html (11KB, production-ready)
└── deploy.sh (deployment script)
```

---

**Status:** Ready to deploy. Just need Vercel login.

**Estimated time:** 2 minutes from login to live URL.
