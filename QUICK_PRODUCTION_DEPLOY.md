# Google-new: Quick Production Deployment Guide

**Status**: ✅ Ready for production  
**Time to Deploy**: 15-20 minutes  

---

## 🚀 5-Step Deployment (Choose Your Platform)

### Step 1: Prepare (2 minutes)
```bash
cd Google-new
git add .
git commit -m "Production deployment: Google-new"
git push origin main
```

### Step 2: Choose Your Platform

#### **Option A: Railway (Fastest ⚡)**

1. Go to https://railway.app
2. Login / Sign up
3. Click "Create Project"
4. Select "Deploy from GitHub"
5. Connect your repository
6. Railway auto-detects `railway.json`
7. Click "Deploy"
8. Go to "Variables" tab and add:
```env
NODE_ENV=production
JWT_SECRET=<run: openssl rand -hex 32>
ENCRYPTION_KEY=<run: openssl rand -hex 32>
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
DATABASE_URL=postgres://...
```

---

#### **Option B: Render.com**

1. Go to https://render.com
2. Login / Sign up
3. Click "New +" → "Blueprint"
4. Connect your GitHub repository
5. Render auto-detects `render.yaml`
6. Set branch to `main`
7. Review configuration
8. Click "Deploy"
9. Render will create web service + worker + database

---

#### **Option C: Docker (Self-Hosted)**

```bash
# Build
docker build -t peak-xender-prod .

# Run web server
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name peak-web \
  peak-xender-prod node server.js

# Run worker (separate terminal/container)
docker run -d \
  --env-file .env \
  --name peak-worker \
  peak-xender-prod node worker.js

# Check status
docker ps
docker logs peak-web
docker logs peak-worker
```

---

### Step 3: Set Up Database (3 minutes)

**Option A: Supabase (Recommended)**
1. Go to https://supabase.com
2. Create new project
3. Wait for database ready
4. Copy connection string: `postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require`
5. Run migrations:
```bash
psql "postgresql://[connection-string]" < supabase_schema.sql
```
6. Set `DATABASE_URL` in deployment platform

**Option B: Neon.tech**
1. Go to https://neon.tech
2. Create project
3. Copy connection string
4. Run migrations (same as above)
5. Set `DATABASE_URL` in deployment platform

---

### Step 4: Generate Security Keys (1 minute)

```bash
# In terminal, generate these:
openssl rand -hex 32  # Copy this for JWT_SECRET
openssl rand -hex 32  # Copy this for ENCRYPTION_KEY
```

Set both in your deployment platform's environment variables.

---

### Step 5: Configure OAuth (5 minutes)

#### Google OAuth
1. Go to https://console.cloud.google.com
2. Create new project
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credential" → "OAuth 2.0 Client ID"
5. Select "Web application"
6. Add authorized redirect URIs:
   - `https://your-app-domain.railway.app/.netlify/functions/api/auth/callback`
   - Or for Docker: `https://your-domain:3000/api/auth/callback`
7. Copy Client ID and Secret
8. Set environment variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_LOGIN_REDIRECT_URI=https://your-domain/api/auth/callback`

#### Microsoft Outlook (Optional)
1. Go to https://entra.microsoft.com
2. "App registrations" → "New registration"
3. Add redirect URI: `https://your-domain/api/accounts/microsoft/callback`
4. Create client secret
5. Set environment variables:
   - `MICROSOFT_CLIENT_ID`
   - `MICROSOFT_CLIENT_SECRET`
   - `MICROSOFT_REDIRECT_URI=https://your-domain/api/accounts/microsoft/callback`

---

### Step 6: Verify Deployment (3 minutes)

```bash
# Test health check
curl https://your-app-domain/api/health

# Should return:
# {"status":"ok"}

# Check dashboard
Visit: https://your-app-domain/dashboard
Login with test credentials

# Verify scheduler
Check deployment logs for: "Dispatch tick executed"
```

---

## 📋 Environment Variables Checklist

```env
# Required
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=<generated>
ENCRYPTION_KEY=<generated>

# Domain Configuration
FRONTEND_ORIGIN=https://your-domain.com
TRACKING_BASE_URL=https://your-domain.com

# OAuth - Google
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_LOGIN_REDIRECT_URI=https://your-domain/api/auth/callback
GOOGLE_ACCOUNT_REDIRECT_URI=https://your-domain/api/accounts/callback

# OAuth - Microsoft (Optional)
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_REDIRECT_URI=https://your-domain/api/accounts/microsoft/callback

# Optional
ADMIN_EMAIL=admin@yourcompany.com
SCHEDULER_BATCH_SIZE=10
LOG_LEVEL=info
```

---

## 🎯 Deployment Platform Comparison

| Feature | Railway | Render | Docker |
|---------|---------|--------|--------|
| **Setup Time** | 5 min | 10 min | 15 min |
| **Cost** | Pay-as-you-go | $7/month starter | Your infrastructure |
| **Scaling** | Automatic | Automatic | Manual |
| **Database** | External (Supabase/Neon) | Included (Postgres) | External |
| **Monitoring** | Good | Excellent | DIY |
| **SSL/TLS** | Automatic | Automatic | Manual |

**Recommendation for First Deploy**: **Railway** (fastest)

---

## ✅ Post-Deployment Verification

### 1. Check Health Status
```bash
curl https://your-app/api/health
# Expected: {"status":"ok"}
```

### 2. Verify Database Connection
```bash
# Check deployment logs for successful database connection
# Should see: "Database initialized" or "Connected to PostgreSQL"
```

### 3. Test Email Queue
```bash
curl -X POST https://your-app/api/queue/worker/trigger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 4. Monitor Scheduler
```bash
# Check logs for:
# "Email worker started"
# "Dispatch tick executed"
# These indicate the scheduler is running
```

### 5. Test Login Flow
1. Visit: `https://your-app/login`
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Should redirect back to dashboard

---

## 🚨 Troubleshooting

### "Database Connection Failed"
- Verify `DATABASE_URL` is correct
- Ensure IP whitelist allows deployment platform
- For Supabase: Check IP whitelist in settings
- Test locally: `npm run dev`

### "Health Check Failing"
- Check deployment logs for startup errors
- Verify `PORT=3000` is set
- Verify database is accessible
- Try: `curl -v https://your-app/api/health`

### "Scheduler Not Running"
- Verify `NODE_ENV=production`
- Check worker process is running
- Look for "Dispatch tick executed" in logs
- For Railway: Check if worker service started

### "OAuth Redirect Not Working"
- Verify redirect URI matches exactly (case-sensitive)
- Ensure domain is accessible
- Check OAuth provider's allowed URIs
- Test locally first with `localhost:3000`

---

## 📞 Still Need Help?

### Documentation
- Full Guide: [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md)
- Netlify: [NETLIFY_DEPLOY_CHECKLIST.md](./NETLIFY_DEPLOY_CHECKLIST.md)
- Scheduler: [NETLIFY_SCHEDULER_DEPLOYMENT.md](./NETLIFY_SCHEDULER_DEPLOYMENT.md)
- Patches: [PATCHES_REFERENCE.md](./PATCHES_REFERENCE.md)

### Resources
- Railway: https://docs.railway.app
- Render: https://render.com/docs
- Supabase: https://supabase.com/docs

---

## 🎉 Success!

Once deployed, you'll have:
- ✅ Live email campaign management platform
- ✅ Automated email scheduler
- ✅ User authentication (Google/Microsoft)
- ✅ Campaign analytics & tracking
- ✅ Multi-account email support
- ✅ Admin dashboard

**Next**: Start creating and sending campaigns from the dashboard!

---

**Estimated Total Time**: 20-30 minutes for full production deployment.

**Questions?** See [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) for comprehensive guide.
