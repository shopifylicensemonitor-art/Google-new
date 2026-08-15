# Netlify Deployment Checklist

## Pre-Deployment (Local Testing)

- [ ] All campaign tests passing locally (`npm test`)
- [ ] Email sending workflow verified locally
- [ ] Database schema initialized
- [ ] `.env` file configured with test values
- [ ] No syntax errors in code (`npm run lint`)
- [ ] Frontend builds without errors (`cd gfg-main && npm run build`)
- [ ] Git repository is clean and committed

## Database Setup (Supabase)

- [ ] Supabase project created
- [ ] Database schema imported (`supabase_schema.sql`)
- [ ] All tables verified (users, campaigns, accounts, contacts, etc.)
- [ ] Connection string copied (DATABASE_URL)
- [ ] Database backups configured
- [ ] RLS policies configured (if required)

## Google Cloud Console Setup

- [ ] Google Cloud project created
- [ ] Gmail API enabled
- [ ] Google+ API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 credentials created
- [ ] Client ID copied
- [ ] Client Secret copied
- [ ] Localhost redirect URI added: `http://localhost:3000/api/accounts/callback`

## Netlify Setup

- [ ] Netlify account created
- [ ] GitHub repository connected
- [ ] Site created and named (note Netlify domain)
- [ ] Build command set: `cd gfg-main && npm install && npm run build`
- [ ] Publish directory set: `gfg-main/dist`
- [ ] Functions directory configured: `netlify/functions`

## Environment Variables (Netlify Dashboard)

Set in **Site Settings → Build & Deploy → Environment**:

### Database & Auth
- [ ] `DATABASE_URL` = Supabase connection string
- [ ] `JWT_SECRET` = 32+ character random string (KEEP SECURE)
- [ ] `NETLIFY` = `true`

### Google OAuth
- [ ] `GOOGLE_CLIENT_ID` = From Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` = From Google Cloud Console
- [ ] `GOOGLE_REDIRECT_URI` = `https://your-netlify-domain.netlify.app/api/accounts/callback`
- [ ] `GOOGLE_LOGIN_REDIRECT_URI` = `https://your-netlify-domain.netlify.app/auth/google/callback`

### API & Frontend
- [ ] `TRACKING_BASE_URL` = `https://your-netlify-domain.netlify.app`
- [ ] `BACKEND_ORIGIN` = `https://your-netlify-domain.netlify.app`
- [ ] `FRONTEND_ORIGIN` = `https://your-netlify-domain.netlify.app`

### Email (Optional - for testing)
- [ ] `SMTP_USER` = Your test Gmail address
- [ ] `SMTP_PASSWORD` = Gmail app-specific password

## Post-Deployment Verification

### API Health Check
- [ ] Visit: `https://your-netlify-domain.netlify.app/api/health`
- [ ] Expected response: `{ "status": "ok" }`

### Authentication
- [ ] Frontend loads without errors
- [ ] Sign up form works
- [ ] Email verification works (check spam)
- [ ] Sign in works with verified email
- [ ] JWT token stored in localStorage

### Gmail Account Integration
- [ ] Connect Gmail account via OAuth
- [ ] Account appears in accounts list
- [ ] Account can be selected in campaign setup

### Campaign Creation & Sending
- [ ] Can create campaign
- [ ] Can add campaign steps
- [ ] Can edit campaign in draft mode
- [ ] Can add recipients/contacts
- [ ] Can launch campaign
- [ ] Campaign status changes to "sending"
- [ ] Campaign status changes to "completed" after sending

### Scheduled Functions
- [ ] Netlify Functions dashboard shows scheduler invocations
- [ ] Function runs approximately every 15 seconds
- [ ] Function logs show successful queue processing
- [ ] Queue items processed and status updated in database

### Email Delivery
- [ ] Emails received in test inbox
- [ ] Email from correct sender account
- [ ] Subject and body match campaign content
- [ ] Email tracking links work (if configured)

## Production Optimization

- [ ] Custom domain configured (if applicable)
- [ ] DNS records updated (if custom domain)
- [ ] SSL/TLS certificate active (automatic on Netlify)
- [ ] Database backups verified and scheduled
- [ ] Monitoring enabled (Netlify analytics + custom logging)
- [ ] Error tracking configured (optional: Sentry, etc.)
- [ ] Performance optimized (bundle size, images, etc.)

## Security Checklist

- [ ] JWT_SECRET is 32+ characters and truly random
- [ ] GOOGLE_CLIENT_SECRET kept in environment variables (never in code)
- [ ] Database credentials stored in Netlify secrets, not code
- [ ] HTTPS enforced on all routes
- [ ] CORS properly configured (FRONTEND_ORIGIN)
- [ ] Rate limiting enabled on auth endpoints
- [ ] No console logs in production code containing sensitive data
- [ ] RLS policies configured on Supabase tables
- [ ] OAuth scopes limited to required permissions

## Monitoring & Logs

- [ ] Set up error notifications (Netlify alerts or email)
- [ ] Monitor function execution times
- [ ] Track database query performance
- [ ] Set up scheduled uptime checks
- [ ] Review Netlify logs weekly
- [ ] Monitor email sending success rate

## Google Cloud Console Updates

After Netlify deployment, return to Google Cloud Console:

- [ ] Update OAuth authorized redirect URI:
  - Remove: `http://localhost:3000/api/accounts/callback`
  - Add: `https://your-netlify-domain.netlify.app/api/accounts/callback`
- [ ] Verify consent screen has updated domain
- [ ] Test OAuth flow in production

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| 502/503 errors | Check database connection, verify DATABASE_URL, check function logs |
| Emails not sending | Verify Gmail account authorized, check queue table, check scheduler logs |
| Cannot login | Verify JWT_SECRET, check email verification working |
| OAuth fails | Verify GOOGLE_CLIENT_ID/SECRET, check redirect URIs updated |
| Cannot find module | Check netlify.toml, verify dependencies in package.json |

## Rollback Plan

If deployment fails:
1. Go to Netlify dashboard
2. Click **Site Settings → Build & Deploy → Deploys**
3. Select previous successful deploy
4. Click **Publish deploy**
5. Investigate error in new deploy's logs
6. Fix code and redeploy

## Post-Launch Tasks

- [ ] Send test email campaign to verify workflow
- [ ] Onboard first users with email guidance
- [ ] Create usage documentation for users
- [ ] Set up feedback mechanism (email/Slack)
- [ ] Plan maintenance window procedures
- [ ] Document critical incident response plan
- [ ] Schedule weekly review of logs and performance

---

## Status: Ready for Deployment

When all boxes are checked, your application is ready for production use on Netlify!

**Last Updated**: 2024
**Deployment Target**: Netlify with Supabase PostgreSQL
**Email Queue Processing**: Netlify Scheduled Functions (every 15 seconds)
