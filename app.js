/**
 * app.js — Express application setup for Peak Xender.
 *
 * Exported for use by server.js (local Node) and netlify/functions/api.js (Netlify Functions).
 */

require('dotenv').config();

// Ensure critical secrets are present in production. In development allow safe fallbacks with warnings.
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET must be set in production. Aborting startup.');
    throw new Error('JWT_SECRET is required in production');
  }
  // Development fallback (clear warning)
  process.env.JWT_SECRET = 'peak-xender-jwt-secret-key-32chars';
  console.warn('Warning: JWT_SECRET not set; using development fallback. Do NOT use in production.');
}

// AI encryption key MUST be explicitly set in production; otherwise fall back to JWT_SECRET in dev
if (!process.env.AI_ENCRYPTION_KEY && !process.env.ENCRYPTION_KEY) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: ENCRYPTION_KEY or AI_ENCRYPTION_KEY must be set in production. Aborting startup.');
    throw new Error('ENCRYPTION_KEY or AI_ENCRYPTION_KEY is required in production');
  }
  process.env.AI_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  console.warn('Warning: AI_ENCRYPTION_KEY/ENCRYPTION_KEY not set; using fallback for development only.');
}

// If a dedicated ENCRYPTION_KEY exists prefer it for token/credential encryption
if (process.env.ENCRYPTION_KEY && !process.env.AI_ENCRYPTION_KEY) {
  process.env.AI_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./db');
const { requireAuth } = require('./middleware/session');
const { attachTenant } = require('./middleware/tenant');
const { attachWorkspaceContext, requireWorkspaceAccess } = require('./middleware/workspace');
const { initializeFeatureFlags } = require('./middleware/features');
const logger = require('./logger');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);

const isLocalhost = (req) => {
  const ip = req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || '';
  const normalizedIp = ip.replace(/^::ffff:/, '');

  return (
    normalizedIp === '127.0.0.1' ||
    normalizedIp === '::1'
  );
};

// Rate limiting middleware
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isLocalhost,
  message: { error: 'Too many requests, please try again later.' }
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: isLocalhost,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

// ---------------------------------------------------------------------------
// Rate limiter specifically for email dispatching endpoints (prevents spam abuse)
const emailTriggerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: isLocalhost,
  message: { error: 'Too many email requests. Please wait a few minutes before requesting another email.' }
});

// ---------------------------------------------------------------------------
// Security Middleware & Headers
// ---------------------------------------------------------------------------
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'https://send.peakconix.site';
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);
    const isLocalNetwork = /^http:\/\/(?:192\.168|10|172\.(?:1[6-9]|2\d|3[0-1])|169\.254)\.\d+\.\d+(:\d+)?$/.test(origin);
    const isAllowedWeb = origin === 'https://send.peakconix.site' || origin === 'https://peak-x-sender-v3-test.netlify.app' || origin === allowedOrigin;
    
    if (isLocalhost || isLocalNetwork || isAllowedWeb || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));

// HTTP Security Headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static frontend files if present
app.use(express.static(path.join(__dirname, 'gfg-main', 'dist')));

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------

initializeFeatureFlags().catch((err) => {
  console.warn('Feature flag initialization failed on startup:', err.message);
});

// Auth routes are PUBLIC
app.use('/api/auth', strictLimiter, require('./routes/auth'));

// Feature flags require auth
app.use('/api/features', generalLimiter, requireAuth, attachTenant, require('./routes/features'));

app.use('/api/workspaces', generalLimiter, requireAuth, attachTenant, attachWorkspaceContext, require('./routes/workspaces'));

// Protected routes (JWT or PIN)
app.use('/api/accounts', generalLimiter, requireAuth, attachTenant, attachWorkspaceContext, requireWorkspaceAccess, require('./routes/accounts'));
app.use('/api/campaigns', generalLimiter, requireAuth, attachTenant, attachWorkspaceContext, requireWorkspaceAccess, require('./routes/campaigns'));
app.use('/api/contacts', generalLimiter, requireAuth, attachTenant, attachWorkspaceContext, requireWorkspaceAccess, require('./routes/contacts'));
app.use('/api/queue', generalLimiter, requireAuth, attachTenant, attachWorkspaceContext, requireWorkspaceAccess, require('./routes/queue'));
app.use('/api/templates', generalLimiter, requireAuth, attachTenant, attachWorkspaceContext, requireWorkspaceAccess, require('./routes/templates'));
app.use('/api/ai', generalLimiter, requireAuth, attachTenant, attachWorkspaceContext, requireWorkspaceAccess, require('./routes/ai'));
app.use('/api/inbox', generalLimiter, requireAuth, attachTenant, attachWorkspaceContext, requireWorkspaceAccess, require('./routes/inbox'));
app.use('/api/suppression', generalLimiter, requireAuth, attachTenant, attachWorkspaceContext, requireWorkspaceAccess, require('./routes/suppression'));
app.use('/api/notifications', generalLimiter, requireAuth, attachTenant, attachWorkspaceContext, requireWorkspaceAccess, require('./routes/notifications'));
app.use('/api/domains', generalLimiter, requireAuth, attachTenant, attachWorkspaceContext, requireWorkspaceAccess, require('./routes/domains'));
app.use('/api/rules', generalLimiter, requireAuth, attachTenant, attachWorkspaceContext, requireWorkspaceAccess, require('./routes/rules'));

// Tracking & Unsubscribe routes are PUBLIC
app.use('/api/track', require('./routes/tracking'));
app.use('/api/unsubscribe', require('./routes/tracking'));

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    const db = await getDb();
    const row = await db.prepare('SELECT COUNT(*) as count FROM accounts').get();
    res.json({
      status: 'ok',
      accounts: row ? row.count : 0,
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Dashboard stats aggregator
app.get('/api/dashboard', generalLimiter, requireAuth, attachTenant, async (req, res) => {
  try {
    const db = await getDb();
    const uid = req.userId;

    const hoursParam = req.query.hours ? parseInt(req.query.hours, 10) : null;
    const daysParam = req.query.days ? parseInt(req.query.days, 10) : null;

    const isHourly = hoursParam !== null && !isNaN(hoursParam) && hoursParam > 0;
    const timeSpan = isHourly ? hoursParam : (daysParam && !isNaN(daysParam) && daysParam > 0 ? daysParam : 7);

    const d = new Date();
    if (isHourly) {
      d.setHours(d.getHours() - timeSpan);
    } else {
      d.setDate(d.getDate() - timeSpan);
    }
    const startDate = d.toISOString();

    // Execute all dashboard queries in parallel for high-performance sub-second response
    const [accountsRow, queueRow, campaignsRow, failedRow, trackingRow, campaigns, queue, logs, recent_logs] = await Promise.all([
      db.prepare("SELECT COALESCE(SUM(daily_sent), 0) as today_sent, COUNT(*) as total FROM accounts WHERE status = 'active' AND user_id = ?").get(uid) || { today_sent: 0, total: 0 },
      db.prepare("SELECT COUNT(*) as pending FROM queue q JOIN campaigns c ON q.campaign_id = c.id WHERE q.status = 'pending' AND (q.user_id = ? OR c.user_id = ?)").get(uid, uid) || { pending: 0 },
      db.prepare("SELECT COUNT(*) as active FROM campaigns WHERE status = 'sending' AND user_id = ?").get(uid) || { active: 0 },
      db.prepare("SELECT COALESCE(SUM(failed_count), 0) as failed FROM campaigns WHERE user_id = ?").get(uid) || { failed: 0 },
      db.prepare("SELECT COALESCE(SUM(q.opens_count), 0) as opens, COALESCE(SUM(q.clicks_count), 0) as clicks FROM queue q JOIN campaigns c ON q.campaign_id = c.id WHERE q.user_id = ? OR c.user_id = ?").get(uid, uid) || { opens: 0, clicks: 0 },
      db.prepare(`
        SELECT c.*,
               COALESCE((SELECT SUM(opens_count) FROM queue WHERE campaign_id = c.id), 0) as total_opens,
               COALESCE((SELECT SUM(clicks_count) FROM queue WHERE campaign_id = c.id), 0) as total_clicks
        FROM campaigns c
        WHERE c.user_id = ?
        ORDER BY c.id DESC
        LIMIT 5
      `).all(uid),
      db.prepare(`
        SELECT q.*, c.name as campaign_name, a.email as account_email
        FROM queue q
        JOIN campaigns c ON q.campaign_id = c.id
        LEFT JOIN accounts a ON q.account_id = a.id
        WHERE q.user_id = ? OR c.user_id = ?
        ORDER BY q.id DESC
        LIMIT 10
      `).all(uid, uid),
      db.prepare(
        "SELECT l.status, l.created_at FROM logs l LEFT JOIN campaigns c ON l.campaign_id = c.id WHERE (l.user_id = ? OR c.user_id = ?) AND l.created_at >= ?"
      ).all(uid, uid, startDate),
      db.prepare(`
        SELECT l.*, COALESCE(c.name, 'Direct Campaign') as campaign_name
        FROM logs l
        LEFT JOIN campaigns c ON l.campaign_id = c.id
        WHERE l.user_id = ? OR c.user_id = ?
        ORDER BY l.created_at DESC
        LIMIT 10
      `).all(uid, uid)
    ]);

    const stats = {
      today_sent: parseInt(accountsRow?.today_sent || 0, 10),
      active_accounts: parseInt(accountsRow?.total || 0, 10),
      pending: parseInt(queueRow?.pending || 0, 10),
      active_campaigns: parseInt(campaignsRow?.active || 0, 10),
      failed: parseInt(failedRow?.failed || 0, 10),
      opens: parseInt(trackingRow?.opens || 0, 10),
      clicks: parseInt(trackingRow?.clicks || 0, 10),
    };

    // Group logs by hour or day
    const chartData = {};
    if (isHourly) {
      for (let i = timeSpan - 1; i >= 0; i--) {
        const date = new Date();
        date.setHours(date.getHours() - i, 0, 0, 0);
        const isoKey = date.toISOString().slice(0, 13) + ':00';
        const displayLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        chartData[isoKey] = { date: isoKey, label: displayLabel, sent: 0, failed: 0, opened: 0 };
      }

      (logs || []).forEach(log => {
        const logDate = new Date(log.created_at);
        const isoKey = logDate.toISOString().slice(0, 13) + ':00';
        if (chartData[isoKey]) {
          if (log.status === 'sent') chartData[isoKey].sent++;
          if (log.status === 'opened') chartData[isoKey].opened++;
          if (log.status === 'failed' || log.status === 'error') chartData[isoKey].failed++;
        }
      });
    } else {
      for (let i = timeSpan - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const label = date.toISOString().split('T')[0];
        chartData[label] = { date: label, label, sent: 0, failed: 0, opened: 0 };
      }

      (logs || []).forEach(log => {
        const day = new Date(log.created_at).toISOString().split('T')[0];
        if (chartData[day]) {
          if (log.status === 'sent') chartData[day].sent++;
          if (log.status === 'opened') chartData[day].opened++;
          if (log.status === 'failed' || log.status === 'error') chartData[day].failed++;
        }
      });
    }

    res.json({
      stats,
      campaigns: campaigns || [],
      queue: queue || [],
      chartData: Object.values(chartData),
      timeframe: { isHourly, span: timeSpan },
      recent_logs: recent_logs || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
