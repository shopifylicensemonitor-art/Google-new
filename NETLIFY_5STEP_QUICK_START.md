# Netlify Deployment: 5-Step Quick Start

**Total Time**: ~20 minutes  
**Difficulty**: Easy  
**Cost**: Free (up to 125k function calls/month)

---

## 🚀 5 Steps to Production

### ⏱️ Step 1: Push Code (2 minutes)

```bash
cd Google-new

# Commit with patches applied
git add .
git commit -m "Deploy to Netlify: everything serverless"
git push origin main
```

---

### ⏱️ Step 2: Set Up Database (5 minutes)

**Choose ONE:**

#### Option A: Supabase (Recommended)
1. Go to: https://supabase.com/projects
2. Sign in or create account
3. Click "New project"
4. Wait for database to initialize (~1 min)
5. Go to Settings → Database → Connection string → URI
6. Copy the full connection string (starts with `postgresql://`)
7. **Save as `DATABASE_URL`** (you'll use this in Step 4)

#### Option B: Neon
1. Go to: https://console.neon.tech
2. Create new project
3. Go to Connection strings
4. Copy "Connection string" (URI)
5. **Save as `DATABASE_URL`**

---

### ⏱️ Step 3: Generate Security Keys (2 minutes)

**In PowerShell/Terminal, run these commands:**

```powershell
# Generate JWT_SECRET (copy the entire output)
-join ((0..9) + ('a'..'f') | Get-Random -Count 64 | % {[char]$_})

# Generate ENCRYPTION_KEY (copy the entire output)
-join ((0..9) + ('a'..'f') | Get-Random -Count 64 | % {[char]$_})
```

**You'll use these in Step 4**

**Alternative**: Use https://generate.plus/en/hash to generate 64-character hex strings

---

### ⏱️ Step 4: Deploy to Netlify (5 minutes)

1. **Go to Netlify**
   - https://app.netlify.com
   - Sign in with GitHub

2. **Create Site**
   - Click "Add new site" → "Import an existing project"
   - Select your GitHub repository (`peak/Google-new`)
   - Branch: `main`
   - Click "Deploy site"
   - **Wait for build to complete** (~2-3 min)

3. **Add Environment Variables**
   - After build completes, go to: Site Settings → Build & Deploy → Environment
   - Click "Edit variables"
   - Add these:

   ```
   DATABASE_URL=<paste_from_step_2>
   DISABLE_SCHEDULER=true
   ENCRYPTION_KEY=<paste_from_step_3_second_key>
   FRONTEND_ORIGIN=<your_netlify_domain>
   JWT_SECRET=<paste_from_step_3_first_key>
   LOG_LEVEL=info
   NODE_ENV=production
   PORT=3000
   TRACKING_BASE_URL=<your_netlify_domain>
   ```

   **Where to find your_netlify_domain**:
   - Netlify dashboard → Deployments tab
   - Look for URL like: `https://xxx-yyy-zzz.netlify.app`
   - Use the full URL (with https://)

4. **Trigger New Build**
   - Click "Save"
   - Netlify automatically rebuilds
   - Go to "Deployments" tab
   - Wait for ✅ green checkmark

---

### ⏱️ Step 5: Test & Verify (2 minutes)

**Test health check:**
```bash
curl https://your-netlify-domain.netlify.app/.netlify/functions/api/health
# Should return: {"status":"ok"}
```

**Or visit in browser:**
- Frontend: `https://your-netlify-domain.netlify.app/login`
- Should see login page with "Sign in with Google" button

**Check scheduler:**
- Netlify dashboard → Functions → Logs
- Look for `scheduler` function
- Should see executions every 15 minutes

---

## ✅ You're Done! 🎉

Your app is now **live on Netlify**:
- ✅ Frontend: Served globally on CDN
- ✅ API: Serverless functions auto-scale
- ✅ Scheduler: Runs every 15 minutes automatically
- ✅ Database: Connected to Supabase/Neon

---

## 🎯 Next: Configure OAuth (Optional but Recommended)

To allow users to log in with Google:

1. **Create Google OAuth Credentials**
   - https://console.cloud.google.com
   - Create new project: "Peak Xender"
   - Credentials → Create OAuth 2.0 Client ID (Web app)
   - Authorized redirect URIs:
     - `https://your-netlify-domain.netlify.app/.netlify/functions/api/auth/callback`
   - Copy Client ID and Secret

2. **Add to Netlify Environment**
   - Netlify site → Environment → Add variables:
     ```
     GOOGLE_CLIENT_ID=<your_client_id>
     GOOGLE_CLIENT_SECRET=<your_secret>
     GOOGLE_LOGIN_REDIRECT_URI=https://your-netlify-domain.netlify.app/.netlify/functions/api/auth/callback
     GOOGLE_ACCOUNT_REDIRECT_URI=https://your-netlify-domain.netlify.app/.netlify/functions/api/accounts/callback
     ```

3. **Redeploy**
   - Save variables → Netlify auto-rebuilds
   - Wait for deployment
   - Test login with Google

---

## 🆘 Troubleshooting

### Build Failed
```bash
# Rebuild locally first
cd Google-new/gfg-main
npm install
npm run build

# If successful, push
git add .
git push
```

### Database Connection Error
- Check `DATABASE_URL` format: `postgresql://user:pass@host:5432/db?sslmode=require`
- Test locally:
  ```bash
  psql "$DATABASE_URL" -c "SELECT 1;"
  ```

### API Not Responding
- Check Functions logs: Netlify dashboard → Functions → Logs
- Look for error messages
- Verify all environment variables are set

### OAuth Not Working
- Verify redirect URL in Google Console matches EXACTLY
- Must include: `https://` and `.netlify.app`
- No trailing slashes

---

## 📊 After Deployment

### Monitor Emails
1. Netlify Functions → Logs → `scheduler`
2. Should see "Dispatch tick executed" every 15 min
3. Check `api/queue/process` logs for email sends

### View Metrics
- Dashboard → Analytics (if enabled)
- Check campaign statistics in your app

### Scale If Needed
- Netlify automatically scales functions
- Free tier: 125k invocations/month
- Paid tier: More invocations + advanced features

---

## 💡 Pro Tips

✅ **Auto-deploy on git push** - Just push code, Netlify rebuilds automatically  
✅ **Free SSL/HTTPS** - Automatic for all domains  
✅ **Global CDN** - Frontend loads fast everywhere  
✅ **No servers to manage** - Netlify handles everything  
✅ **See logs instantly** - Netlify dashboard in real-time  

---

**Done? Your app is live!** 🚀

Visit: `https://your-netlify-domain.netlify.app` to see it running!
