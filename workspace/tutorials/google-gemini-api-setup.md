# How to Use Google Gemini API with Free Credits

This tutorial shows how to use your Google AI Pro / Ultra account to get free Google Cloud credits and set up Gemini API keys.

## What You Need

- Google account with AI Pro / Ultra subscription
- Computer / web browser
- 10-15 minutes

---

## Step 1: Check Your Benefits

1. Go to Google AI benefits page:
   https://developers.google.com/program/my-ben

2. Look for:
   - Free monthly credits amount
   - Which services are included (Gemini API, Cloud APIs, etc.)

---

## Step 2: Set Up Google Cloud Billing

1. Go to Google Cloud console:
   https://console.cloud.google.com/billing

2. Sign in with your Google account (same as AI Pro)

3. Create a billing account:
   - Click "Create billing account"
   - Select your country
   - Add payment method (Google will use this for verification only)
   - Your AI Pro credits will be applied automatically

4. Verify billing is linked to AI Pro:
   - Look for "Free credits from AI Pro" note
   - Credits should show as monthly free tier

---

## Step 3: Create a Google Cloud Project (DevOps Best Practices)

1. Go to Google Cloud console:
   https://console.cloud.google.com

2. Create a new project:
   - Click "Select a project" → "New Project"
   - Project name: `gemini-api-prod` (use clear, purposeful names)
   - Location: `No organization` (or pick your org if you have one)
   - Click "Create"

3. Project naming best practices:
   - Use lowercase, no spaces: `gemini-api-prod`
   - Include environment: `-prod`, `-dev`, `-test`
   - Make it clear what project is for

4. Wait 1-2 minutes for project to be created

5. Select your new project:
   - Click project selector at top-left
   - Choose `gemini-api-prod`

### DevOps Tip: Project Organization

If you have multiple projects, organize them:

| Project Name | Purpose |
|------------|---------|
| `gemini-api-prod` | Production use |
| `gemini-api-dev` | Testing and experiments |
| `gemini-api-test` | Automated tests |
| `ai-infrastructure` | Shared resources |

---

## Step 4: Enable Gemini API

1. In Google Cloud console, make sure your new project is selected

2. Search for "Gemini API":
   - Click the search box at top
   - Type "Gemini API"
   - Click on "Gemini API" result

3. Click "Enable" button
   - Wait for API to be enabled (10-20 seconds)

### DevOps Tip: API Management

After enabling APIs, go to:
- **APIs & Services** → **Enabled APIs**
- See all enabled APIs in your project
- Disable unused APIs to prevent accidental costs

---

## Step 4.5: Set Up IAM Roles (Security Best Practice)

**Why IAM?** Identity and Access Management controls who can use your resources.

### Recommended Setup

For personal use with API keys:

| Role | Purpose |
|------|---------|
| **Editor** | Full access to modify resources |
| **Viewer** | Read-only access |

**Best practice for production:**
- Create a service account (not use your personal email)
- Give it only permissions it needs (principle of least privilege)

### How to Create a Service Account (Advanced)

1. Go to: **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Name: `gemini-api-sa`
4. Click **Create and Continue**
5. Skip roles for now (API key will handle this)
6. Click **Done**

### Generate Service Account Key (More Secure)

1. In Service Accounts page, click your new account
2. Go to **Keys** tab
3. Click **Add Key** → **Create New Key**
4. Key type: JSON (recommended)
5. Save JSON file securely

**Advantages of Service Account Keys:**
- Can be rotated (security)
- Can be disabled if compromised
- Separate from your personal login

**Note:** For simple personal use, user API key (Step 5) is fine. Service accounts are for production/team environments.

---

## Step 4.6: Set Up Quotas & Alerts (Cost Control)

**Why?** Prevent unexpected charges and monitor your free credit usage.

### Check Quotas

1. Go to: **APIs & Services** → **Quotas**
2. Select **Generative Language API** from dropdown
3. Review quotas:
   - Tokens per day (for free tier)
   - Requests per minute (rate limits)
   - Available models

### Set Up Billing Alerts

1. Go to: **Billing** → **Budgets & Alerts**
2. Click **Create Budget**
3. Set amount: $0.01 (or your comfort level)
4. Configure alerts:
   - Email notifications when quota is low
   - SMS alerts (optional)

**DevOps best practice:** Set alerts at 50%, 80%, and 100% of your free credits.

---

## Step 4.7: Configure Monitoring & Logging (Production Ready)

**Why?** Track API usage, errors, and performance.

### Enable Cloud Logging

1. Go to: **Logging** → **Logs Explorer**
2. Select your `gemini-api-prod` project
3. Create a filter for Gemini API:
   ```
   resource.type="generativelanguage.googleapis.com/Request"
   ```
4. Save this filter as "Gemini API Logs"

### What to Monitor

| Metric | Why It Matters |
|--------|----------------|
| **Error rate** | High errors = API key or quota issues |
| **Latency** | Slow responses = network or API problems |
| **Quota usage** | Track when free credits run out |
| **Request count** | Understand your usage patterns |

---

## Step 5: Create API Key (DevOps Best Practices)

1. Go to Google AI Studio API keys page:
   https://aistudio.google.com/api-keys

2. Click "Create API Key" button

3. Name your API key (use descriptive names):
   - Example: `gemini-prod-flash-key`
   - Format: `{service}-{environment}-{model}`
   - This helps you identify which key is for what

4. Click "Create"

5. Copy your API key:
   - Click the "Copy" button next to your new key
   - Save it somewhere safe (you won't see it again)

6. Restrict API key (recommended for production):
   - Click on API key after creation
   - Go to **Application Restrictions**
   - Add your application domain or IP range
   - Go to **API Restrictions**
   - Restrict to only `Generative Language API`

**Important:** Never share your API key with others!

### DevOps Tip: Key Management

Best practice: Create separate keys for each environment:

| Key Name | Environment | Purpose |
|-----------|-----------|---------|
| `gemini-dev-flash-key` | Development | Testing, experiments |
| `gemini-prod-flash-key` | Production | Live applications |
| `gemini-test-flash-key` | CI/CD | Automated tests |

**Key rotation schedule:**
- Every 90 days (standard security practice)
- Add new key before deleting old one
- Update all applications using the key

### Environment Variables (Best for Apps)

Store your API key in environment variables:

```bash
# Linux/macOS (add to ~/.bashrc, ~/.zshrc, or ~/.bash_profile)
export GOOGLE_GEMINI_API_KEY="your_api_key_here"

# Windows (set in System Properties or .env file)
set GOOGLE_GEMINI_API_KEY=your_api_key_here
```

**Why environment variables?**
- Safer than hardcoding in files
- Easy to change without redeploying code
- Keys aren't accidentally committed to git

---

## Step 6: Use Your Gemini API Key

### Option A: Use in OpenClaw

Add Gemini as a provider to OpenClaw:

1. Run this command:
   ```bash
   openclaw auth login --provider google --profile default
   ```

2. When prompted, paste your Gemini API key

3. Set Gemini as your model:
   ```bash
   openclaw models set google/gemini-1.5-flash
   ```

### Option B: Test with cURL

Test your API key works:

```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {
        "parts": [
          {"text": "Hello, how are you?"}
        ]
      }
    ]
  }'
```

Replace `YOUR_API_KEY` with your actual key.

---

## Step 7: Monitor Your Free Credits

1. Go to Google Cloud billing:
   https://console.cloud.google.com/billing

2. Check:
   - Remaining free credits
   - Credit expiry date (if any)
   - Usage breakdown by service

3. Also check AI Studio dashboard:
   - Shows Gemini-specific usage
   - More detailed than Cloud billing

---

## Common Gemini Models

| Model | Best For | Speed |
|--------|----------|--------|
| `gemini-1.5-flash` | Fast responses, simple tasks | Fast |
| `gemini-1.5-pro` | Complex reasoning, detailed answers | Medium |
| `gemini-1.5-flash-8b` | Very fast, lightweight tasks | Very fast |

---

## Troubleshooting

### Problem: "API key not found"
- Check you copied the full key (no spaces)
- Make sure you enabled the Gemini API in your project

### Problem: "Quota exceeded"
- Check your free credits balance in billing
- Wait for next month for credits to refresh

### Problem: "Billing account required"
- Make sure you set up billing account in Step 2
- AI Pro credits only work with a billing account linked

---

## Step 8: Production Deployment Best Practices (DevOps)

### Security Checklist

| Item | Why It Matters | Status |
|--------|----------------|--------|
| **API key restrictions** | Limits where key can be used | ☐ Application restrictions set |
| **API restrictions** | Only allows Gemini API | ☐ Only Generative Language API allowed |
| **Environment variables** | Keys not in code | ☐ Using .env or secrets manager |
| **Key rotation** | Regular security updates | ☐ 90-day rotation scheduled |
| **Access logging** | Track who used API | ☐ Cloud Logging enabled |

### Infrastructure as Code (IaC) Tips

**Use Terraform or similar for production:**

```hcl
# Example: Google Cloud project with Terraform
resource "google_project" "gemini_prod" {
  name       = "gemini-api-prod"
  project_id = "gemini-api-prod-12345"
}

resource "google_cloudfunctions2_function" "gemini_proxy" {
  name        = "gemini-api-proxy"
  description = "API proxy with rate limiting"
  runtime     = "nodejs20"
}
```

**Benefits:**
- Reproducible infrastructure
- Easy to create dev/staging/prod environments
- Version control for your GCP setup

### CI/CD Integration

**GitHub Actions example:**

```yaml
# .github/workflows/test-gemini-api.yml
name: Test Gemini API
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Test Gemini API
        env:
          GOOGLE_GEMINI_API_KEY: ${{ secrets.GOOGLE_GEMINI_API_KEY }}
        run: |
          curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_GEMINI_API_KEY}" \
            -H "Content-Type: application/json" \
            -d '{"contents": [{"parts": [{"text": "test"}]}]}'
```

**DevOps best practices for CI/CD:**
- Store API keys in repository secrets (never in code)
- Run tests before deployment
- Use staging environment before production

### Rate Limiting & Caching

**Why?** Prevent hitting quotas and improve performance.

**Implementation options:**
- Use Redis/ Memcached for caching responses
- Implement exponential backoff for retries
- Use request queuing for high-volume apps

**Example: Rate limiting logic:**
```javascript
// Wait if hitting rate limits
const waitForQuota = async () => {
  while (rateLimitReached) {
    await sleep(60000); // 60 seconds
    // Retry request
  }
};
```

---

## Summary (DevOps Checklist)

| Step | Description | Done |
|-------|-------------|--------|
| 1 ✅ | Check AI Pro benefits & free credits | ☐ |
| 2 ✅ | Set up Google Cloud billing | ☐ |
| 3 ✅ | Create project (with proper naming) | ☐ |
| 4 ✅ | Enable Gemini API | ☐ |
| 4.5 ✅ | Set up IAM roles & service accounts | ☐ |
| 4.6 ✅ | Configure quotas & billing alerts | ☐ |
| 4.7 ✅ | Enable Cloud Logging | ☐ |
| 5 ✅ | Create API key (with restrictions) | ☐ |
| 6 ✅ | Store in environment variables | ☐ |
| 7 ✅ | Test with cURL or OpenClaw | ☐ |
| 8 ✅ | Set up monitoring & alerts | ☐ |
| 9 ✅ | Deploy with CI/CD (if needed) | ☐ |

---

**Your free Gemini API is now production-ready!**

1. ✅ Check AI Pro benefits
2. ✅ Set up Google Cloud billing
3. ✅ Create project
4. ✅ Enable Gemini API
5. ✅ Create API key
6. ✅ Use API key in OpenClaw or other tools
7. ✅ Monitor free credits

---

**Your free Gemini API is now ready to use!**

---

## Links

- AI Pro benefits: https://developers.google.com/program/my-ben
- Cloud billing: https://console.cloud.google.com/billing
- API keys: https://aistudio.google.com/api-keys
- Cloud console: https://console.cloud.google.com
