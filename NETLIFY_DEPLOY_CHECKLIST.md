# Netlify Deployment Checklist - Scheduled Function (Option 3)

## ✅ What's Already Set Up

Both `Google-new` and `gfg-main` folders now have:
- ✅ `netlify/functions/scheduler.js` — Scheduled function that runs every 15 seconds
- ✅ `netlify.toml` — Configured with `[[functions]]` scheduler section
- ✅ `.env.example` — All required environment variables
- ✅ `netlify/functions/api.js` — Express.js API wrapper

---

## 🚀 Deployment Steps (Same for Both Folders)

### Step 1: Push to GitHub (5 min)
```bash
cd gfg-main  # or Google-new
git add .
git commit -m "Enable Netlify Scheduled Function for email scheduling"
git push origin main
```

### Step 2: Create Netlify Site (5 min)
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Select your GitHub repository
4. **Important:** Click "Deploy site" (Netlify will auto-detect netlify.toml)

### Step 3: Set Environment Variables (10 min)
Go to **Site Settings** → **Build & Deploy** → **Environment variables** → Add:

```env
# Required
NODE_ENV=production
PORT=3000
JWT_SECRET=<generate: openssl rand -hex 32>
ENCRYPTION_KEY=<generate: openssl rand -hex 32>
FRONTEND_ORIGIN=https://your-site.netlify.app
TRACKING_BASE_URL=https://your-site.netlify.app
ACCESS_PIN=1234
DISABLE_SCHEDULER=true

# Database (CRITICAL - use PostgreSQL, not SQLite)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Optional: Google OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_LOGIN_REDIRECT_URI=https://your-site.netlify.app/.netlify/functions/api/auth/callback
GOOGLE_ACCOUNT_REDIRECT_URI=https://your-site.netlify.app/.netlify/functions/api/accounts/callback

# Optional: Microsoft Outlook
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_REDIRECT_URI=https://your-site.netlify.app/.netlify/functions/api/accounts/microsoft/callback

# Optional: Batch size per scheduled invocation
SCHEDULER_BATCH_SIZE=10
```

### Step 4: Set Up Database (PostgreSQL)
**⚠️ CRITICAL:** Never use SQLite on Netlify (ephemeral filesystem)

**Option A: Supabase (Recommended)**
1. Go to https://supabase.com
2. Create new project
3. Copy connection string
4. Run migrations: `psql -U user -d dbname < supabase_schema.sql`
5. Set `DATABASE_URL` in Netlify

**Option B: Neon**
1. Go to https://neon.tech
2. Create PostgreSQL database
3. Copy connection string
4. Run migrations
5. Set `DATABASE_URL` in Netlify

### Step 5: Deploy
```bash
# Netlify auto-deploys when you push to GitHub
# Watch build logs at https://app.netlify.com/sites/your-site/deploys

# After first deploy, verify scheduled function is active
```

### Step 6: Verify Scheduled Function (5 min)
1. Go to Netlify **Functions** → **Logs**
2. Wait 15-30 seconds for first scheduled invocation
3. Should see successful execution logs
4. Check for "Dispatch tick executed" message

---

## 🔧 Environment Variable Generator

Generate secure values:
```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Generate ENCRYPTION_KEY
openssl rand -hex 32
```

---

## ✅ Production Readiness Checklist

- [ ] Database URL set and verified (PostgreSQL required)
- [ ] All OAuth credentials configured
- [ ] JWT_SECRET and ENCRYPTION_KEY generated and set
- [ ] FRONTEND_ORIGIN and TRACKING_BASE_URL set correctly
- [ ] Scheduled function logs show activity
- [ ] Email sending works end-to-end
- [ ] Error tracking (Sentry/Rollbar) configured
- [ ] Backup strategy for database
