# Google-new Deployment Configuration Checklist

**Status**: Ready for Production Deployment  
**Build**: ✅ Complete with patches applied  
**Dist folder**: ✅ Latest (8/14/2026 11:58 PM)  

---

## 📋 Pre-Deployment Requirements

### ✅ Already Complete
- [x] Docker Dockerfile created
- [x] railway.json configured  
- [x] render.yaml configured
- [x] .dockerignore configured
- [x] package.json updated with production scripts
- [x] Environment variable template (.env.example)
- [x] Database schema (supabase_schema.sql)
- [x] Frontend build complete (gfg-main/dist)
- [x] Patches applied and tested

### ⏳ Still Need to Configure

#### 1. **Choose Deployment Platform** 
Choose ONE:
- [ ] **Railway** (⭐ Recommended - 5-10 min, easiest)
- [ ] **Render** (10-15 min, includes PostgreSQL database)
- [ ] **Docker** (Self-hosted, full control)

#### 2. **PostgreSQL Database Setup**
Choose ONE:
- [ ] **Supabase** (Managed PostgreSQL + auth + storage)
  - Go to: https://supabase.com
  - Create project → copy connection string
  - Save as `DATABASE_URL`
  
- [ ] **Neon** (Serverless PostgreSQL)
  - Go to: https://neon.tech
  - Create database → copy connection string
  - Save as `DATABASE_URL`
  
- [ ] **Local/Self-hosted PostgreSQL**
  - Ensure PostgreSQL 12+ installed
  - Create database and user
  - Save connection string as `DATABASE_URL`

#### 3. **Generate Security Keys**
Run these commands (in Terminal/PowerShell):
```powershell
# Generate JWT Secret (32 hex chars)
[Convert]::ToHexString((Get-Random -Count 32))
# Save as: JWT_SECRET

# Generate Encryption Key (32 hex chars)  
[Convert]::ToHexString((Get-Random -Count 32))
# Save as: ENCRYPTION_KEY
```

Or use online tool: https://www.random.org/strings/

#### 4. **Configure OAuth Providers**

**Google OAuth** (Recommended):
- [ ] Go to: https://console.cloud.google.com
- [ ] Create new project "Peak Xender"
- [ ] Enable APIs: Google+ API, Gmail API (if needed)
- [ ] Go to Credentials → Create OAuth 2.0 Client ID
- [ ] Select "Web application"
- [ ] Add Authorized Redirect URIs:
  - `https://your-app-domain/api/auth/callback`
  - `https://your-app-domain/api/accounts/callback` (for email account linking)
- [ ] Copy: Client ID → `GOOGLE_CLIENT_ID`
- [ ] Copy: Client Secret → `GOOGLE_CLIENT_SECRET`

**Microsoft Outlook** (Optional):
- [ ] Go to: https://entra.microsoft.com
- [ ] App registrations → New registration
- [ ] Name: "Peak Xender"
- [ ] Redirect URI: `https://your-app-domain/api/accounts/microsoft/callback`
- [ ] In Certificates & secrets: Create client secret
- [ ] Copy: Application (client) ID → `MICROSOFT_CLIENT_ID`
- [ ] Copy: Client secret value → `MICROSOFT_CLIENT_SECRET`

#### 5. **Domain Configuration**
- [ ] Decide on production domain (e.g., `app.yourdomain.com`)
- [ ] Set `FRONTEND_ORIGIN=https://your-app-domain`
- [ ] Set `TRACKING_BASE_URL=https://your-app-domain`
- [ ] For Railway/Render: note the auto-generated domain URL

#### 6. **Environment Variables Summary**

Create a `.env` file locally with these values:

```env
# Node Configuration
NODE_ENV=production
PORT=3000

# Database (REQUIRED)
DATABASE_URL=postgresql://user:pass@host:5432/database?sslmode=require

# Security (Generate with: openssl rand -hex 32)
JWT_SECRET=<generated_32_char_hex>
ENCRYPTION_KEY=<generated_32_char_hex>

# Domain Configuration
FRONTEND_ORIGIN=https://your-app-domain
TRACKING_BASE_URL=https://your-app-domain

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxxx
GOOGLE_LOGIN_REDIRECT_URI=https://your-app-domain/api/auth/callback
GOOGLE_ACCOUNT_REDIRECT_URI=https://your-app-domain/api/accounts/callback

# Microsoft Outlook (Optional)
MICROSOFT_CLIENT_ID=xxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxx
MICROSOFT_REDIRECT_URI=https://your-app-domain/api/accounts/microsoft/callback

# Admin & Logging
ADMIN_EMAIL=admin@yourcompany.com
LOG_LEVEL=info
DISABLE_SCHEDULER=false
SCHEDULER_BATCH_SIZE=10
```

---

## 🚀 DEPLOYMENT PLATFORMS

### Option 1: Railway (⭐ RECOMMENDED)

**Why Railway?**
- ✅ Fastest setup (5-10 minutes)
- ✅ Easiest to use
- ✅ Auto-deploys on git push
- ✅ Built-in monitoring
- ✅ Pay-as-you-go pricing ($5-15/month typical)

**Railway Setup Steps:**

1. **Create Account**
   - Go to: https://railway.app
   - Sign up with GitHub (recommended)

2. **Create Project**
   - Click "Create new project"
   - Select "Deploy from GitHub"
   - Search for your repository
   - Select `peak/Google-new` branch
   - Click "Deploy"

3. **Railway Auto-Detects**
   - Railway reads `railway.json`
   - Detects `Dockerfile`
   - Sets up Node.js web service

4. **Add Environment Variables**
   - In Railway dashboard → Project → Variables
   - Add all variables from checklist above:
     - `NODE_ENV=production`
     - `JWT_SECRET=<your_secret>`
     - `ENCRYPTION_KEY=<your_key>`
     - `DATABASE_URL=postgresql://...`
     - `GOOGLE_CLIENT_ID=...`
     - etc.

5. **Configure Postgres Database** (Optional - use Supabase/Neon instead)
   - In Railway: Click "+ Add"
   - Select "Postgres"
   - Railway creates PostgreSQL for you
   - Database URL auto-populated

6. **Deploy**
   - Make sure all variables are set
   - Click "Deploy" button
   - Railway builds Docker image and starts server
   - Monitor logs in real-time

7. **Get Your URL**
   - Railway assigns URL: `https://xxx.railway.app`
   - Update OAuth redirect URIs to this domain
   - Test: `curl https://xxx.railway.app/api/health`

---

### Option 2: Render.com

**Why Render?**
- ✅ Includes managed PostgreSQL database
- ✅ YAML-based configuration (render.yaml)
- ✅ Free SSL certificates
- ✅ Good for production workloads
- ✅ ~$7/month starter plan

**Render Setup Steps:**

1. **Create Account**
   - Go to: https://render.com
   - Sign up with GitHub

2. **Import Blueprint**
   - Click "New +" → "Blueprint"
   - Select your GitHub repository
   - Render auto-detects `render.yaml`
   - Review services:
     - peak-xender-web (Node.js API)
     - peak-xender-worker (Background jobs)
     - peak-xender-db (PostgreSQL)

3. **Set Environment Variables**
   - Render form shows all variables from render.yaml
   - Fill in:
     - `JWT_SECRET`
     - `ENCRYPTION_KEY`
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - etc.

4. **Deploy**
   - Click "Deploy Blueprint"
   - Render provisions:
     - Web service
     - Worker service  
     - PostgreSQL database
   - Automatically runs migrations (if configured)

5. **Get Your URL**
   - Render assigns: `https://xxxx.onrender.com`
   - Update OAuth redirect URIs
   - Test health check

---

### Option 3: Docker (Self-Hosted)

**Why Docker?**
- ✅ Full control over infrastructure
- ✅ Can run anywhere (VPS, bare metal, K8s)
- ✅ Better for custom requirements
- ✅ No vendor lock-in

**Docker Setup Steps:**

1. **Build Image**
   ```bash
   cd Google-new
   docker build -t peak-xender:latest .
   ```

2. **Run Web Server**
   ```bash
   docker run -d \
     -p 3000:3000 \
     --env-file .env \
     --name peak-web \
     peak-xender:latest \
     node server.js
   ```

3. **Run Worker**
   ```bash
   docker run -d \
     --env-file .env \
     --name peak-worker \
     peak-xender:latest \
     node worker.js
   ```

4. **Test**
   ```bash
   curl http://localhost:3000/api/health
   docker logs peak-web
   docker logs peak-worker
   ```

---

## ✅ DEPLOYMENT READINESS CHECKLIST

Before deploying, ensure:

### Code & Build
- [x] Frontend built successfully (gfg-main/dist)
- [x] Patches applied to source code
- [x] No TypeScript/compilation errors
- [x] Dockerfile ready
- [x] railway.json/render.yaml configured

### Database
- [ ] PostgreSQL created (Supabase/Neon/local)
- [ ] Connection string obtained
- [ ] Migrations file ready: `supabase_schema.sql`
- [ ] Backup strategy planned

### Security
- [ ] JWT_SECRET generated
- [ ] ENCRYPTION_KEY generated
- [ ] .env file created locally (never commit!)
- [ ] OAuth credentials ready

### OAuth
- [ ] Google OAuth app created
- [ ] Client ID & Secret obtained
- [ ] Redirect URIs configured in Google Console
- [ ] [Optional] Microsoft OAuth app created
- [ ] [Optional] Client ID & Secret obtained

### Configuration
- [ ] Production domain decided
- [ ] FRONTEND_ORIGIN set
- [ ] TRACKING_BASE_URL set
- [ ] All environment variables prepared
- [ ] ADMIN_EMAIL configured

### Monitoring (Post-Deploy)
- [ ] Error tracking service ready (Sentry/Rollbar/DataDog)
- [ ] Logging aggregation ready (if applicable)
- [ ] Backup notifications configured
- [ ] Alert rules created

---

## 📋 NEXT STEPS

### Immediate (Choose One)
1. **Railway**: Go to https://railway.app and create project
2. **Render**: Go to https://render.com and create blueprint
3. **Docker**: Set up your VPS/server

### After Deployment
1. Run migrations: `psql $DATABASE_URL < supabase_schema.sql`
2. Test health: `curl https://your-domain/api/health`
3. Test OAuth: Visit login page, click "Sign in with Google"
4. Test campaign creation: Create test campaign
5. Monitor logs for scheduler activity: "Dispatch tick executed"

---

## 🆘 TROUBLESHOOTING

### "Can't find railway.json"
- Ensure file exists: `Google-new/railway.json`
- Verify path is correct
- Make sure you pushed to GitHub

### "Database connection failed"
- Check `DATABASE_URL` format: `postgresql://user:pass@host:port/db`
- Ensure IP whitelist allows deployment server
- For Supabase: Check Security → Database settings
- Test locally first

### "OAuth redirect error"
- Verify redirect URIs match EXACTLY (case-sensitive, trailing slash matters)
- Ensure OAuth app uses same domain as deployment
- For local testing: add `localhost:3000` to allowed URIs

### "Build fails"
- Check Docker build logs
- Verify all dependencies are in package.json
- Ensure node_modules was properly installed

---

**Ready to deploy? Choose your platform above and start deployment!** 🚀
