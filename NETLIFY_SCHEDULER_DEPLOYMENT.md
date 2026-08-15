# Netlify Deployment & Scheduler Guide

This guide explains the current Netlify deployment setup and documents three approaches to handle automatic email sending (the scheduler) in production.

---

## Current Architecture

### Frontend + API on Netlify
- **Frontend**: Static React/Vite app served from `gfg-main/dist`
- **API**: Express.js routes wrapped in serverless functions via `netlify/functions/api.js`
- **Build**: `netlify.toml` runs `cd gfg-main && npm install && npm run build`

### The Problem: Scheduler Cannot Run on Netlify Alone
Netlify Functions are stateless and ephemeral. They spin up to handle a request and shut down when done. The `scheduler.js` worker (which runs every 15 seconds via `node-cron`) cannot persist in a serverless environment.

**Current `scheduler.js` implementation**:
```javascript
// Cron: every 15 seconds (Continuous Server-Side Background Worker)
const schedulerEnabled = process.env.DISABLE_SCHEDULER !== 'true';
if (schedulerEnabled) {
  sendTask = cron.schedule('*/15 * * * * *', async () => {
    try {
      lastTickAt = new Date().toISOString();
      await processNextItem();
    } catch (err) {
      logger.error({ err }, 'Unexpected error in cron send task');
    }
  });
  logger.info('Email worker started (every 15s continuous background dispatch)');
}
```

When deployed **only to Netlify**, this cron task will never run because the Node process terminates immediately after handling HTTP requests.

---

## Solution: Three Options

### Option 1: Separate Always-On Node Host (Recommended for Production)

Deploy the entire backend (`server.js` + `scheduler.js`) to a separate always-on host:
- **Render.io** (Standard tier, ~$7/month)
- **Railway.app** (Usage-based, ~$5/month)
- **Fly.io**
- **AWS EC2**

**Setup**:
1. Push the root directory (with `server.js`, `scheduler.js`, routes, etc.) to a separate repo.
2. Deploy to Render/Railway.
3. Set `FRONTEND_ORIGIN` and API base URLs to point to the backend host.
4. Keep the Netlify frontend-only build for the React app.

**Pros**:
- Full control over scheduler behavior
- Best performance and reliability
- Can scale backend independently

**Cons**:
- Requires two deployments/hosts

---

### Option 2: External Scheduler Service (Netlify + IFTTT/Zapier)

Keep Netlify as-is and use a free external scheduler to trigger the existing `/api/queue/worker/trigger` endpoint every 15 seconds.

**Trigger endpoint** (already exists in `routes/queue.js`):
```javascript
router.post('/worker/trigger', async (req, res) => {
  try {
    processNextItem().catch(() => {});
    res.json({ success: true, message: 'Worker dispatch tick triggered manually.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

**Setup** using **Zapier** (free tier):
1. Create a "Schedule by Zapier" trigger (every 15 minutes)
2. Add a "Webhooks" action: `POST https://your-netlify-app/.netlify/functions/api/queue/worker/trigger`
3. Test and enable

**Setup** using **EasyCron.com** (free tier):
1. Create a cron job: `https://your-netlify-app/.netlify/functions/api/queue/worker/trigger`
2. Set frequency to every 15 minutes
3. Webhook method: POST

**Pros**:
- No additional hosting cost
- Simple to set up
- Netlify handles everything

**Cons**:
- External dependency (Zapier/EasyCron availability)
- 15-min frequency may be too coarse (batches may send slower)
- Less control over retry logic

---

### Option 3: Netlify Scheduled Functions (Current Setup)

Use Netlify's native scheduled functions feature to invoke a function every N minutes.

**Setup**:
```toml
# netlify.toml
[functions]
  name = "scheduler"
  schedule = "@every 15m"
```

The function (e.g., `netlify/functions/scheduler.js`) manually calls `db.processNextItem()`.

**Pros**:
- No external dependency
- Simple setup
- Free (included in Netlify plan)

**Cons**:
- Less flexible than a dedicated worker
- Can't run faster than Netlify's minimum (~1 minute)
- Cold starts add latency

---

## 🎯 Recommendation for Peak Xender

For production, **use Option 1** (Separate Always-On Node Host):

1. **Why**: Email campaigns require responsive, continuous processing. Serverless cold starts and 15-minute intervals are too slow for user expectations.

2. **How**:
   - Deploy the root directory to **Render.io** or **Railway.app** using the `Dockerfile` and `railway.json` configs.
   - Keep the frontend on Netlify for static hosting (CDN speed).
   - Or keep both frontend + backend on the same host (Render/Railway) for simplicity.

3. **Cost**: ~$7/month for always-on Node.js on Render, which covers the scheduler + email processing.

---

## Migration Path

### Phase 1: Current State
- Everything on Netlify
- Scheduler doesn't work (cron runs on closed Node process)

### Phase 2: Add Backend (Render/Railway)
- Deploy `server.js`, `worker.js`, `scheduler.js`, routes, etc. to Render
- Keep frontend on Netlify (or add to Render too)
- Set API URLs to point to Render backend

### Phase 3: Monitor & Optimize
- Verify emails send on schedule
- Monitor Render logs for errors
- Adjust scheduler batch size if needed

---

## Local Development

All three options work the same locally:

```bash
# Install dependencies
npm install

# Run backend + scheduler + frontend dev server
npm run dev

# Watch logs
npm run backend:dev  # Terminal 1
npm run worker      # Terminal 2
npm run frontend:dev # Terminal 3
```

---

## Files to Review

- [Dockerfile](./Dockerfile) — Production container config
- [railway.json](./railway.json) — Railway deployment config
- [render.yaml](./render.yaml) — Render deployment config
- [netlify.toml](./netlify.toml) — Netlify frontend + API config
- [scheduler.js](./scheduler.js) — Email scheduler logic
- [server.js](./server.js) — Express API server
- [worker.js](./worker.js) — Background job processor
