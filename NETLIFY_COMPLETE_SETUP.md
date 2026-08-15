# Netlify Deployment Guide - Complete Setup

**Strategy**: Everything on Netlify (Frontend + API + Scheduler)  
**Build Time**: ~20-30 minutes  
**Monthly Cost**: Free tier (up to 125k invocations/month)

---

## 🏗️ Architecture: Netlify Only

```
┌─────────────────────────────────────────────────────┐
│                    Netlify                          │
├─────────────────────────────────────────────────────┤
│  Static Frontend                                    │
│  ├─ React/Vite SPA (gfg-main/dist)                 │
│  └─ Served from CDN (fast globally)                │
│                                                     │
│  Serverless Functions (API)                         │
│  ├─ Express.js endpoints wrapped in functions      │
│  ├─ POST /api/campaigns/*                          │
│  ├─ GET /api/queue/*                               │
│  ├─ POST /api/auth/*                               │
│  └─ etc.                                            │
│                                                     │
│  Scheduled Functions (Scheduler)                    │
│  └─ Triggers every 15 minutes (process queue)      │
│                                                     │
│  Environment Variables                              │
│  └─ DATABASE_URL, JWT_SECRET, OAUTH_CREDS, etc.   │
│                                                     │
└─────────────────────────────────────────────────────┘
              ↓
     ┌──────────────────┐
     │  External Database │
     │  (Supabase/Neon) │
     │  PostgreSQL      │
     └──────────────────┘
```

---

## 📋 Pre-Deployment Checklist

### ✅ Code & Build
- [x] Frontend built: `gfg-main/dist/` ✅
- [x] Patches applied ✅
- [x] netlify.toml configured ✅
- [x] netlify/functions/ ready ✅
- [ ] `.env.example` reviewed

### ⏳ Infrastructure Setup

#### Database (Required - Choose One)
- [ ] **Supabase** (recommended)
  - Go to: https://supabase.com/projects
  - Create new project
  - Wait for database ready
  - Copy connection string: `postgresql://...?sslmode=require`
  - Save as `DATABASE_URL`

- [ ] **Neon** (serverless PostgreSQL)
  - Go to: https://console.neon.tech
  - Create new project
  - Copy connection string
  - Save as `DATABASE_URL`

#### Security Keys (Generate These)
- [ ] **JWT_SECRET** (32 hex characters)
  ```powershell
  # PowerShell:
  -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
  # Or: https://generate.plus/en/hash
  ```

- [ ] **ENCRYPTION_KEY** (32 hex characters)
  ```powershell
  -join ((0..9) + ('a'..'f') | Get-Random -Count 64 | % {[char]$_})
  ```

#### OAuth Credentials

**Google OAuth** (for login & email account linking):
1. Go to: https://console.cloud.google.com
2. Create new project: "Peak Xender"
3. Enable APIs:
   - Google+ API
   - Gmail API (optional, for account integrations)

4. Create OAuth 2.0 Credential:
   - Credentials → Create Credential → OAuth 2.0 Client ID
   - Type: "Web application"
   - Authorized JavaScript origins:
     - `https://your-netlify-domain.netlify.app`
   - Authorized redirect URIs:
     - `https://your-netlify-domain.netlify.app/.netlify/functions/api/auth/callback`
     - `https://your-netlify-domain.netlify.app/.netlify/functions/api/accounts/callback`

5. Copy:
   - Client ID → `GOOGLE_CLIENT_ID`
   - Client Secret → `GOOGLE_CLIENT_SECRET`

**Microsoft Outlook** (Optional - for Outlook email accounts):
1. Go to: https://entra.microsoft.com
2. App registrations → New registration
3. Name: "Peak Xender Netlify"
4. Redirect URI: `https://your-netlify-domain.netlify.app/.netlify/functions/api/accounts/microsoft/callback`
5. Create client secret
6. Copy:
   - Application (client) ID → `MICROSOFT_CLIENT_ID`
   - Client secret value → `MICROSOFT_CLIENT_SECRET`

#### Domain Configuration
- [ ] Decide on production domain
  - Netlify auto-gives: `https://xxx.netlify.app`
  - Or connect custom domain: `https://your-domain.com`
- [ ] Set `FRONTEND_ORIGIN` = your domain
- [ ] Set `TRACKING_BASE_URL` = your domain

---

## 🚀 Deployment Steps (20-30 minutes)

### Step 1: Prepare Code (2 min)
```bash
cd Google-new

# Commit current state
git add .
git commit -m "Netlify deployment - everything on Netlify"
git push origin main
```

### Step 2: Connect to Netlify (5 min)

1. **Go to Netlify**
   - https://app.netlify.com

2. **Create New Site**
   - Click "Add new site" → "Import an existing project"
   - Connect GitHub repository
   - Select branch: `main`

3. **Netlify Auto-Detects**
   - Reads `netlify.toml` ✅
   - Build command: `cd gfg-main && npm install && npm run build`
   - Publish directory: `gfg-main/dist`
   - Functions directory: `netlify/functions`

4. **Configure Builds**
   - Netlify will show defaults
   - Verify they match netlify.toml
   - Click "Save & Deploy"

### Step 3: Set Environment Variables (5 min)

1. **Go to Site Settings**
   - Netlify dashboard → Your site → Site Settings
   - Left menu → "Build & Deploy" → "Environment"

2. **Add Variables**
   Click "Edit variables" and add:

   ```env
   # Required
   NODE_ENV=production
   PORT=3000
   DISABLE_SCHEDULER=true

   # Database (from Supabase/Neon)
   DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require

   # Security Keys (generated above)
   JWT_SECRET=<your_32_char_hex>
   ENCRYPTION_KEY=<your_32_char_hex>

   # Domain
   FRONTEND_ORIGIN=https://your-netlify-domain.netlify.app
   TRACKING_BASE_URL=https://your-netlify-domain.netlify.app

   # Google OAuth
   GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxxxxx
   GOOGLE_LOGIN_REDIRECT_URI=https://your-netlify-domain.netlify.app/.netlify/functions/api/auth/callback
   GOOGLE_ACCOUNT_REDIRECT_URI=https://your-netlify-domain.netlify.app/.netlify/functions/api/accounts/callback

   # Microsoft Outlook (Optional)
   MICROSOFT_CLIENT_ID=xxxxxxx
   MICROSOFT_CLIENT_SECRET=xxxxxxx
   MICROSOFT_REDIRECT_URI=https://your-netlify-domain.netlify.app/.netlify/functions/api/accounts/microsoft/callback

   # Admin
   ADMIN_EMAIL=admin@yourdomain.com
   LOG_LEVEL=info
   ```

3. **Save Variables**
   - Click "Save"
   - Netlify will trigger a new build

### Step 4: Set Up Database (5 min)

**In your terminal**:
```bash
# Run migrations
psql "$DATABASE_URL" < supabase_schema.sql

# Verify connection
psql "$DATABASE_URL" -c "SELECT version();"
```

**Troubleshooting**:
- If `psql` not found: Install PostgreSQL
- If connection fails: Check DATABASE_URL format
- If schema fails: Ensure fresh database

### Step 5: Configure Scheduler (5 min)

**Option A: Netlify Scheduled Functions** (Recommended)
- Already configured in `netlify.toml`
- Runs every 15 minutes automatically
- No additional setup needed ✅

**Option B: External Trigger** (If you need 15-second intervals)
- Use Zapier or EasyCron
- See "Scheduler Setup" section below

### Step 6: Deploy & Verify (2 min)

```bash
# Push to trigger new build
git add .
git commit -m "Add Netlify environment variables"
git push origin main

# Netlify auto-deploys from GitHub
# Watch build in Netlify dashboard: Deployments tab
```

**Verify Deployment**:
```bash
# Test health check
curl https://your-netlify-domain.netlify.app/.netlify/functions/api/health
# Expected: {"status":"ok"}

# Test login page
Visit: https://your-netlify-domain.netlify.app/login
# Should load without errors
```

---

## 🔧 Scheduler Setup for Netlify

Netlify has a built-in scheduler for functions, but it runs **every 15 minutes** (minimum interval).

### Option 1: Netlify Scheduled Functions (15 min intervals)
**Status**: Already configured ✅

The file `netlify.toml` has:
```toml
[[functions]]
  name = "scheduler"
  schedule = "@every 15m"
```

This automatically:
- Triggers `netlify/functions/scheduler.js` every 15 minutes
- Processes email queue
- No additional setup needed

**Verify it's running**:
1. Netlify dashboard → Functions → Logs
2. Look for `scheduler` function
3. Should see entries like: "Dispatch tick executed"

### Option 2: External Scheduler (For 15-second intervals)

If you need **faster processing** (every 15 seconds instead of 15 minutes):

**Using Zapier** (Free tier):
1. Go to: https://zapier.com
2. Create New Zap
3. Trigger: "Schedule by Zapier" → Every 15 minutes
4. Action: Webhooks → POST
   - URL: `https://your-netlify-domain.netlify.app/.netlify/functions/api/queue/worker/trigger`
   - Headers: Add `Authorization: Bearer YOUR_JWT_TOKEN`
5. Test & Enable

**Using EasyCron** (Free):
1. Go to: https://www.easycron.com
2. Create New Cron Job
3. URL: `https://your-netlify-domain.netlify.app/.netlify/functions/api/queue/worker/trigger`
4. Frequency: Every 15 minutes
5. Method: POST
6. Webhook: Enable
7. Create

### Important Note: Set DISABLE_SCHEDULER=true

Since Netlify Functions are ephemeral, the built-in `node-cron` scheduler **won't work** in serverless.

**Already set in environment**:
```env
DISABLE_SCHEDULER=true
```

This tells the API to NOT start a cron job. Instead, Netlify's scheduled functions handle triggering.

---

## 📊 Netlify.toml Configuration

Already configured in `Google-new/netlify.toml`:

```toml
[build]
  # Build command: install frontend deps & build React app
  command = "cd gfg-main && npm install && npm run build"
  # Publish: frontend React SPA
  publish = "gfg-main/dist"

[build.environment]
  # Don't scan for secrets in these vars
  SECRETS_SCAN_ENABLED = "false"
  SECRETS_SCAN_OMIT_KEYS = "PORT,ACCESS_PIN,TRACKING_BASE_URL,FRONTEND_ORIGIN,GOOGLE_REDIRECT_URI"

# Serverless functions configuration
[functions]
  # Backend Node.js functions directory
  directory = "netlify/functions"
  # Bundle with esbuild for performance
  node_bundler = "esbuild"

# API proxy - route /api/* to serverless functions
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200

# SPA fallback - route unknown paths to index.html
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

✅ **No changes needed** - already optimized for Netlify!

---

## 🎯 Quick Reference: Netlify URLs

After deployment, your URLs will be:

```
Frontend:           https://your-site.netlify.app/
Login:              https://your-site.netlify.app/login
Dashboard:          https://your-site.netlify.app/dashboard
API Health:         https://your-site.netlify.app/.netlify/functions/api/health
Create Campaign:    POST to https://your-site.netlify.app/.netlify/functions/api/campaigns
OAuth Callback:     https://your-site.netlify.app/.netlify/functions/api/auth/callback
Queue Worker:       POST to https://your-site.netlify.app/.netlify/functions/api/queue/worker/trigger
```

---

## ✅ Post-Deployment Checklist

After Netlify deployment:

- [ ] Frontend loads: `https://your-site.netlify.app`
- [ ] No errors in browser console
- [ ] Health check passes: `curl .netlify/functions/api/health`
- [ ] Database connected: Check Netlify logs for "Database initialized"
- [ ] Login page loads: OAuth buttons visible
- [ ] Google OAuth works: Click "Sign in with Google"
- [ ] Dashboard loads: Shows empty or sample data
- [ ] Scheduler active: Check Netlify Functions → Logs for `scheduler`
- [ ] Create test campaign: Verify it appears in queue
- [ ] Check email sending: Review queue processing logs

---

## 🚨 Common Issues & Fixes

### "Build fails on Netlify"
**Check**:
- [ ] `gfg-main/package.json` exists
- [ ] `gfg-main/package-lock.json` exists (or npm-shrinkwrap.json)
- [ ] No hardcoded paths (use relative paths)
- [ ] Build command correct: `cd gfg-main && npm install && npm run build`

**Fix**:
```bash
# Rebuild locally first
cd Google-new/gfg-main
npm install
npm run build

# Then push
git add .
git commit -m "Fix local build"
git push
```

### "Functions not working"
**Check**:
- [ ] `netlify/functions/api.js` exists
- [ ] Functions directory in netlify.toml
- [ ] API routes properly exported

**Fix**:
```bash
# Reinstall
cd Google-new
npm install
git add .
git push
```

### "Database connection error"
**Check**:
- [ ] `DATABASE_URL` set in Netlify environment
- [ ] Connection string format: `postgresql://user:pass@host:5432/db?sslmode=require`
- [ ] Database exists and is accessible
- [ ] Migrations have run

**Fix**:
```bash
# Test locally first
export DATABASE_URL="your-connection-string"
psql "$DATABASE_URL" -c "SELECT 1;"
```

### "OAuth redirect fails"
**Check**:
- [ ] Redirect URI in Google Console matches EXACTLY
- [ ] URL includes domain: `https://your-site.netlify.app/...`
- [ ] No trailing slashes unless in config
- [ ] Using `GOOGLE_LOGIN_REDIRECT_URI` environment variable

**Fix**:
1. Update Google Console with correct URL
2. Update `GOOGLE_LOGIN_REDIRECT_URI` in Netlify
3. Redeploy

### "Scheduler not running"
**Check**:
- [ ] `DISABLE_SCHEDULER=true` is set
- [ ] `netlify.toml` has scheduler function config
- [ ] Check Netlify Logs → Functions → `scheduler`
- [ ] Verify function is invoked every 15 minutes

**Fix**:
```toml
# In netlify.toml
[[functions]]
  name = "scheduler"
  schedule = "@every 15m"
```

---

## 📞 Next Steps

1. **Prepare Infrastructure** (10 min)
   - [ ] Create Supabase/Neon database
   - [ ] Get `DATABASE_URL`
   - [ ] Generate JWT_SECRET & ENCRYPTION_KEY
   - [ ] Create Google OAuth credentials

2. **Deploy to Netlify** (5 min)
   - [ ] Connect GitHub to Netlify
   - [ ] Set environment variables
   - [ ] Trigger deploy

3. **Verify** (5 min)
   - [ ] Test health check
   - [ ] Login and create campaign
   - [ ] Check scheduler logs

4. **Monitor** (Ongoing)
   - [ ] Check Netlify logs daily
   - [ ] Monitor email sending
   - [ ] Track campaign metrics

---

## 💡 Netlify Advantages

✅ **Zero server management** - Functions auto-scale  
✅ **Built-in CDN** - Static frontend blazing fast  
✅ **Automatic HTTPS** - Free SSL certificates  
✅ **GitHub integration** - Auto-deploy on push  
✅ **Environment secrets** - Secure variable management  
✅ **Free tier** - 125k function invocations/month  
✅ **Simple to debug** - Integrated logs & monitoring  

---

## 📚 Documentation

- **Full Netlify Guide**: This file
- **Setup Checklist**: [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **Quick Reference**: [QUICK_PRODUCTION_DEPLOY.md](./QUICK_PRODUCTION_DEPLOY.md)
- **Scheduler Details**: [NETLIFY_SCHEDULER_DEPLOYMENT.md](./NETLIFY_SCHEDULER_DEPLOYMENT.md)
- **Production Ready**: [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md)

---

**Ready to deploy? Follow Step 1 above!** 🚀
