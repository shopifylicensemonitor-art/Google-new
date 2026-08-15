# Netlify Deployment Guide for Peak Xender

## Overview
This guide provides step-by-step instructions to deploy Peak Xender to Netlify with full backend functionality, email sending, and automated campaign processing.

## Architecture

### Frontend
- React 18.x + TypeScript + Vite
- Deployed to Netlify's CDN
- Build output: `gfg-main/dist`

### Backend
- Express.js API wrapped with `serverless-http`
- Netlify Functions for API routes
- Scheduled Functions for email queue processing (runs every 15 seconds)

### Database
- **Production**: PostgreSQL via Supabase
- **Fallback**: SQLite (sql.js) for reduced dependencies

### Email Sending
- **Architecture**: Queue-based sending with scheduled processing
- **Automation**: Netlify Scheduled Functions trigger email processing every 15 seconds
- **Accounts**: Gmail OAuth2 for sender accounts
- **Features**: Auto-send campaigns, pause/resume, multi-step workflows

---

## Prerequisites

### Required Accounts
1. **Netlify** - Deployment platform
2. **Supabase** - Production database (PostgreSQL)
3. **Google Cloud Console** - OAuth2 for Gmail integration
4. **Gmail Account** - For testing sender account

### Required Tools
- Git
- Node.js 18+
- npm

---

## Step 1: Database Setup (Supabase)

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project:
   - Choose a name (e.g., "peak-xender")
   - Set password for postgres user
   - Choose region closest to your users
   - Wait 2-3 minutes for provisioning

### 1.2 Initialize Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the schema from `supabase_schema.sql`
4. Paste and click **Run**
5. Verify all tables created successfully

### 1.3 Get Connection Details

1. Go to **Settings → Database**
2. Copy the following (you'll need these later):
   - **Connection String**: Full PostgreSQL URL
   - **Host**: Database server address
   - **Port**: Usually 5432
   - **Database**: Database name
   - **User**: `postgres`
   - **Password**: What you set during creation

### 1.4 Create RLS Policies (Recommended for Security)

See `SUPABASE_RLS_MIGRATION_GUIDE.md` for detailed security configuration.

---

## Step 2: Google Cloud OAuth2 Setup

### 2.1 Create Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project:
   - Project name: "Peak Xender" (or similar)
   - Click **Create**
3. Wait for project to be created

### 2.2 Enable Gmail API

1. In Google Cloud Console, go to **APIs & Services → Library**
2. Search for "Gmail API"
3. Click on it and click **Enable**
4. Search for "Google+ API"
5. Click on it and click **Enable**

### 2.3 Create OAuth Credentials

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth 2.0 Client ID**
3. If prompted, first create an OAuth consent screen:
   - Choose **External** user type
   - Fill in required fields:
     - App name: "Peak Xender"
     - User support email: Your email
     - Developer contact: Your email
   - Click **Save and Continue**
   - Skip scopes, click **Save and Continue**
   - Click **Back to Dashboard**
4. Now create OAuth credentials again:
   - Choose **Web application** as application type
   - Name: "Peak Xender Netlify"
5. Add Authorized Redirect URIs:
   ```
   https://yourdomain.netlify.app/api/accounts/callback
   http://localhost:3000/api/accounts/callback
   ```
   - Replace `yourdomain` with your Netlify site name (you'll get this after first deploy)
   - Include localhost for local development
6. Click **Create**
7. Copy and save:
   - **Client ID**
   - **Client Secret**

---

## Step 3: Environment Variables Setup

### 3.1 Create `.env` File (Local Development)

Create `Google-new/.env`:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-this-for-production

# Google OAuth
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://localhost:3000/api/accounts/callback
GOOGLE_LOGIN_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Email
SMTP_USER=your-test-email@gmail.com
SMTP_PASSWORD=your-app-specific-password

# Tracking (set domain for production)
TRACKING_BASE_URL=http://localhost:3000

# API Base
BACKEND_ORIGIN=http://localhost:3000
FRONTEND_ORIGIN=http://localhost:8080

# SQLite (local development only)
USE_SQLITE=false
```

### 3.2 Configure Netlify Environment Variables

1. Push to GitHub first:
   ```bash
   git add .
   git commit -m "Setup for Netlify deployment"
   git push
   ```

2. In Netlify dashboard (after site creation):
   - Go to **Site Settings → Build & Deploy → Environment**
   - Click **Edit Variables**
   - Add each environment variable from above:
     - `DATABASE_URL`
     - `JWT_SECRET`
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `GOOGLE_REDIRECT_URI` - Set to your Netlify domain
     - `GOOGLE_LOGIN_REDIRECT_URI` - Set to your Netlify domain
     - `TRACKING_BASE_URL` - Set to your Netlify domain
     - `BACKEND_ORIGIN` - Set to your Netlify domain
     - `FRONTEND_ORIGIN` - Set to your Netlify domain
     - `NETLIFY=true` - This disables local cron scheduler in favor of Functions

3. For sensitive values (passwords, secrets):
   - Use Netlify's **Sensitive variable** feature
   - These won't be exposed in logs

---

## Step 4: Deploy to Netlify

### 4.1 Connect GitHub Repository

1. Go to [netlify.com](https://netlify.com)
2. Click **New site from Git**
3. Choose GitHub
4. Authorize Netlify with GitHub
5. Select your repository
6. Configure build settings:
   - **Base directory**: `Google-new` (or empty)
   - **Build command**: `cd gfg-main && npm install && npm run build`
   - **Publish directory**: `gfg-main/dist`
   - Click **Deploy site**

### 4.2 Wait for Initial Deployment

The site will build and deploy. This may take 5-10 minutes.

Once complete:
1. Note your Netlify domain (e.g., `zealous-goldwasser-abc123.netlify.app`)
2. Update environment variables with this domain

### 4.3 Update OAuth Redirect URIs

Return to Google Cloud Console and add your Netlify domain to OAuth credentials:
- **Authorized Redirect URIs**:
  ```
  https://your-netlify-domain.netlify.app/api/accounts/callback
  ```

---

## Step 5: Verify Deployment

### 5.1 Check API Health

Visit: `https://your-netlify-domain.netlify.app/api/health`

Expected response:
```json
{ "status": "ok" }
```

### 5.2 Test Authentication Workflow

1. Visit the frontend: `https://your-netlify-domain.netlify.app`
2. Sign up with a test email
3. Verify email (check spam folder)
4. Log in

### 5.3 Test Campaign Creation

1. Add a Gmail account via Google OAuth
2. Add some contacts
3. Create a campaign
4. Launch campaign
5. Check logs for email sending

### 5.4 Verify Scheduled Functions

Check Netlify Functions logs:
1. In Netlify dashboard: **Functions → scheduler**
2. Look for invocations every 15 seconds
3. Check logs for queue processing messages

---

## Step 6: Production Configuration

### 6.1 Update Frontend Configuration

In `gfg-main/src/config.ts` (or similar):
```typescript
export const API_BASE = process.env.VITE_API_BASE || 
  (window.location.origin.includes('localhost') 
    ? 'http://localhost:3000' 
    : window.location.origin);
```

### 6.2 SSL/TLS

Netlify automatically provisions SSL certificates. Your site will be HTTPS.

### 6.3 Custom Domain

1. Go to **Site Settings → Domain Management**
2. Click **Add domain**
3. Enter your domain
4. Follow DNS configuration instructions

### 6.4 Monitoring & Logging

**View function logs:**
- Netlify dashboard → **Functions**
- Select function → view invocation logs

**View database:**
- Supabase dashboard → **SQL Editor** or **Data Browser**

---

## Troubleshooting

### "Cannot find module" Errors

**Solution**: Ensure all dependencies are listed in `package.json`:
```bash
npm ls | grep "missing\|invalid"
```

### Functions Returning 502/503

**Check**:
1. Database connection working: `DATABASE_URL` correct?
2. All environment variables set in Netlify?
3. Check function logs for specific errors

### Emails Not Sending

**Check**:
1. Account added and authorized? (OAuth token valid?)
2. Queue has items? Check database queue table
3. Scheduled function running? Check function logs
4. Gmail account has SMTP enabled?

### "Error: connect ENOTFOUND db.*.supabase.co"

**Solution**: Database URL is incorrect. Verify:
- Connection string copied correctly from Supabase
- Database is running
- Firewall allows connections

---

## File Structure for Deployment

```
Google-new/
├── app.js                          # Express app
├── server.js                       # Local development entry
├── db.js                          # Database adapter (PostgreSQL + SQLite)
├── scheduler.js                   # Email queue processor
├── routes/
│   ├── auth.js                    # Authentication endpoints
│   ├── campaigns.js               # Campaign CRUD + launch/pause
│   ├── accounts.js                # Gmail account management
│   ├── contacts.js                # Contact management
│   ├── inbox.js                   # Inbox queries
│   └── ...
├── netlify/functions/
│   ├── api.js                     # Express serverless handler
│   └── scheduler.js               # Scheduled email processor
├── netlify.toml                   # Netlify configuration
├── package.json                   # Dependencies
├── supabase_schema.sql            # Database schema
└── gfg-main/                      # React frontend
    ├── src/
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── ...
    ├── dist/                      # Built frontend (generated)
    └── package.json
```

---

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT signing key (32+ chars) | Any secure random string |
| `GOOGLE_CLIENT_ID` | OAuth client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | Keep secure |
| `GOOGLE_REDIRECT_URI` | OAuth callback for accounts | `https://domain/api/accounts/callback` |
| `GOOGLE_LOGIN_REDIRECT_URI` | OAuth callback for login | `https://domain/auth/google/callback` |
| `TRACKING_BASE_URL` | Email tracking domain | `https://domain` (set to main domain) |
| `BACKEND_ORIGIN` | Backend API origin | `https://domain` |
| `FRONTEND_ORIGIN` | Frontend origin (CORS) | `https://domain` |
| `NETLIFY` | Enable Netlify mode | `true` |

---

## Performance Optimization

### Database Connection Pooling

For production with high email volume, consider:
1. **PgBouncer**: Connection pooler on Supabase
2. **Connection pooling**: Built into pg library
3. **Reduce function timeout**: Set to 10-30 seconds

### Scheduled Function Optimization

The scheduler runs every 15 seconds. For high volume:
- Increase frequency to every 5 seconds (edit netlify.toml)
- Process multiple queue items per function invocation
- Monitor function execution time

### Batch Operations

In `scheduler.js`, modify `processNextItem()` to:
```javascript
// Process up to 5 items per invocation
for (let i = 0; i < 5; i++) {
  await processNextItem();
}
```

---

## Disaster Recovery

### Database Backup

1. Supabase automatically backs up daily
2. Manual backup:
   ```bash
   pg_dump $DATABASE_URL > backup.sql
   ```

### Code Backup

Your GitHub repository is your backup. Netlify maintains deployment history.

---

## Next Steps

1. **Test thoroughly** before promoting to production
2. **Monitor logs** in first 24 hours after deployment
3. **Set up custom domain** for professional appearance
4. **Configure DNS** for email tracking (optional)
5. **Load test** if expecting high volume

---

## Support & References

- Netlify Docs: [docs.netlify.com](https://docs.netlify.com)
- Supabase Docs: [supabase.com/docs](https://supabase.com/docs)
- Express.js: [expressjs.com](https://expressjs.com)
- Vite: [vitejs.dev](https://vitejs.dev)

---

**Last Updated**: 2024
**Version**: 1.0
