# Quick Start: Netlify Deployment in 5 Steps

## 🚀 30-Minute Deployment Guide

This is the fastest path from local development to production on Netlify.

---

## Step 1: Prepare Your Code (5 minutes)

### Ensure everything is committed to GitHub

```bash
cd c:\Users\peak\Desktop\peak
git status
git add .
git commit -m "Ready for Netlify deployment"
git push origin main
```

### Verify netlify.toml exists

File: `Google-new/netlify.toml`

Should contain:
```toml
[build]
  publish = "gfg-main/dist"
  command = "cd gfg-main && npm install && npm run build"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[scheduled_functions]]
  function = "scheduler"
  cron = "*/15 * * * * *"
```

---

## Step 2: Set Up Database (5 minutes)

### 1. Create Supabase Project

- Go to [supabase.com](https://supabase.com)
- Click "New Project"
- Name: "peak-xender"
- Set strong password
- Choose region
- Click "Create new project" and wait ~3 minutes

### 2. Import Database Schema

- Open SQL Editor in Supabase dashboard
- New Query → paste contents of `Google-new/supabase_schema.sql` → Run
- All tables should be created ✓

### 3. Save Connection String

- Settings → Database → Connection String
- Copy the entire string
- This becomes your `DATABASE_URL` for Netlify

---

## Step 3: Create Google OAuth (5 minutes)

### 1. Go to Google Cloud Console

- [console.cloud.google.com](https://console.cloud.google.com)
- Create new project
- Name: "Peak Xender"

### 2. Enable Gmail API

- APIs & Services → Library
- Search "Gmail API" → Enable
- Search "Google+ API" → Enable

### 3. Create OAuth Credentials

- APIs & Services → Credentials
- Create Credentials → OAuth 2.0 Client ID
- Application type: "Web application"
- Name: "Peak Xender Netlify"
- Authorized redirect URIs:
  ```
  http://localhost:3000/api/accounts/callback
  ```
  (We'll add the Netlify domain later)
- Create

### 4. Copy Credentials

- Save your:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`

---

## Step 4: Deploy to Netlify (5 minutes)

### 1. Create Netlify Site

- Go to [netlify.com](https://netlify.com)
- Click "Add new site" → "Import an existing project"
- Choose GitHub
- Select your repository
- Click "Deploy site"

**⏳ Wait 5-10 minutes for build to complete**

### 2. Get Your Domain

Once deployment completes:
- Note your Netlify domain: `https://[random-name].netlify.app`
- Example: `https://zen-goldwasser-abc123.netlify.app`

### 3. Add Environment Variables

In Netlify dashboard:
- Site Settings → Build & Deploy → Environment
- Click "Edit variables"
- Add these variables:

```
DATABASE_URL = postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres
JWT_SECRET = [generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
GOOGLE_CLIENT_ID = [your client ID]
GOOGLE_CLIENT_SECRET = [your client secret]
GOOGLE_REDIRECT_URI = https://[your-netlify-domain].netlify.app/api/accounts/callback
GOOGLE_LOGIN_REDIRECT_URI = https://[your-netlify-domain].netlify.app/auth/google/callback
TRACKING_BASE_URL = https://[your-netlify-domain].netlify.app
BACKEND_ORIGIN = https://[your-netlify-domain].netlify.app
FRONTEND_ORIGIN = https://[your-netlify-domain].netlify.app
NETLIFY = true
```

### 4. Redeploy

- Click "Trigger deploy" → "Clear cache and deploy"
- Wait for build to complete

---

## Step 5: Update Google OAuth & Test (5 minutes)

### 1. Update Google OAuth

Return to Google Cloud Console:
- OAuth credentials → Edit
- Add authorized redirect URI:
  ```
  https://[your-netlify-domain].netlify.app/api/accounts/callback
  ```
- Save

### 2. Test Your Deployment

1. **Visit your site**: `https://[your-netlify-domain].netlify.app`
   - Should see login screen ✓

2. **Sign up**:
   - Create account with test email ✓
   - Click verification link in email ✓
   - Should see dashboard ✓

3. **Add Gmail Account**:
   - Click "Connect Gmail" ✓
   - Authorize with your Google account ✓
   - Should see account in "My Accounts" ✓

4. **Create & Send Campaign**:
   - Create campaign with test recipient ✓
   - Launch campaign ✓
   - Check test inbox for email ✓

5. **Check Scheduler**:
   - Netlify dashboard → Functions → scheduler
   - Should see invocations every ~15 seconds ✓

---

## 🎉 You're Live!

Your application is now:
- ✅ Running on Netlify's global CDN (100+ locations)
- ✅ Processing emails every 15 seconds automatically
- ✅ Backed by Supabase PostgreSQL
- ✅ Secured with SSL/TLS
- ✅ Highly scalable

---

## What If Something Doesn't Work?

### Error: "Cannot connect to database"

**Fix**:
1. Verify `DATABASE_URL` is correct in Netlify dashboard
2. Check database is running in Supabase
3. Redeploy: Trigger deploy → Clear cache and deploy

### Error: "OAuth callback failed"

**Fix**:
1. Verify redirect URIs updated in Google Cloud Console
2. Make sure you're using correct Netlify domain
3. Wait 5 minutes for Google to propagate changes

### Email not sending

**Fix**:
1. Check function logs: Functions → scheduler
2. Verify Gmail account is connected
3. Check database has queue entries

### Scheduler not running

**Fix**:
1. Check `netlify.toml` is committed to GitHub
2. Redeploy after netlify.toml changes
3. Wait a few minutes, then check Functions dashboard

---

## 📊 What's Now Automatic

- ✅ **Email Sending**: Every 15 seconds, scheduled function processes queue
- ✅ **Campaign Progression**: Multi-step campaigns with waits and triggers
- ✅ **Status Updates**: Real-time campaign status (draft → sending → completed)
- ✅ **Pause/Resume**: Pause campaigns, edit them, resume sending
- ✅ **Account Management**: Gmail OAuth integration for multiple sender accounts
- ✅ **Contact Lists**: Import and manage email lists
- ✅ **Logs & Analytics**: Track which emails sent, opened, clicked

---

## 🔐 Security Notes

- ✅ All passwords hashed with bcrypt
- ✅ JWT tokens secure and expire after 7 days
- ✅ Google OAuth used for Gmail accounts (no password storage)
- ✅ HTTPS enforced automatically
- ✅ Database connection encrypted
- ✅ API keys stored in Netlify secrets (not in code)

---

## 📚 For More Details

- **Full setup guide**: [NETLIFY_DEPLOYMENT_GUIDE.md](NETLIFY_DEPLOYMENT_GUIDE.md)
- **Pre-deployment checklist**: [NETLIFY_CHECKLIST.md](NETLIFY_CHECKLIST.md)
- **Scheduler technical details**: [NETLIFY_SCHEDULED_FUNCTIONS.md](NETLIFY_SCHEDULED_FUNCTIONS.md)
- **Architecture overview**: [NETLIFY_DEPLOYMENT_SUMMARY.md](NETLIFY_DEPLOYMENT_SUMMARY.md)

---

## 🆘 Need Help?

1. Check function logs in Netlify dashboard
2. Verify all environment variables set correctly
3. Test database connection with psql
4. Review error messages carefully (often indicate exact issue)
5. Check that files are committed to GitHub

---

**Status**: 🚀 **Ready to Deploy**
**Estimated Time**: 30 minutes from start to live
**Cost**: Mostly free (with Netlify/Supabase free tiers)
