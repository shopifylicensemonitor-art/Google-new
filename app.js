/**
 * app.js — Express application setup for Peak Xender.
 *
 * Exported for use by server.js (local Node) and netlify/functions/api.js (Netlify Functions).
 */

require('dotenv').config();

// Ensure AI_ENCRYPTION_KEY and JWT_SECRET are available with fallbacks
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'peak-xender-jwt-secret-key-32chars';
  console.warn('Warning: JWT_SECRET not set; using default fallback.');
}
if (!process.env.AI_ENCRYPTION_KEY) {
  process.env.AI_ENCRYPTION_KEY = process.env.JWT_SECRET;
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./db');
const { requireAuth } = require('./middleware/session');
const { attachTenant } = require('./middleware/tenant');
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

// Auth routes are PUBLIC
app.use('/api/auth', strictLimiter, require('./routes/auth'));

// Protected routes (JWT or PIN)
app.use('/api/accounts', generalLimiter, requireAuth, attachTenant, require('./routes/accounts'));
app.use('/api/campaigns', generalLimiter, requireAuth, attachTenant, require('./routes/campaigns'));
app.use('/api/contacts', generalLimiter, requireAuth, attachTenant, require('./routes/contacts'));
app.use('/api/queue', generalLimiter, requireAuth, attachTenant, require('./routes/queue'));
app.use('/api/templates', generalLimiter, requireAuth, attachTenant, require('./routes/templates'));
app.use('/api/ai', generalLimiter, requireAuth, attachTenant, require('./routes/ai'));
app.use('/api/inbox', generalLimiter, requireAuth, attachTenant, require('./routes/inbox'));
app.use('/api/suppression', generalLimiter, requireAuth, attachTenant, require('./routes/suppression'));
app.use('/api/notifications', generalLimiter, requireAuth, attachTenant, require('./routes/notifications'));
app.use('/api/domains', generalLimiter, requireAuth, attachTenant, require('./routes/domains'));

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

    const accountsRow = await db.prepare("SELECT SUM(daily_sent) as today_sent, COUNT(*) as total FROM accounts WHERE status = 'active' AND (user_id = ? OR user_id IS NULL OR user_id IN (1, 2, 3, 4, 5, 29, 41))").get(uid) || { today_sent: 0, total: 0 };
    const queueRow = await db.prepare("SELECT COUNT(*) as pending FROM queue q JOIN campaigns c ON q.campaign_id = c.id WHERE q.status = 'pending' AND c.user_id = ?").get(uid) || { pending: 0 };
    const campaignsRow = await db.prepare("SELECT COUNT(*) as active FROM campaigns WHERE status = 'sending' AND user_id = ?").get(uid) || { active: 0 };
    const failedRow = await db.prepare("SELECT SUM(failed_count) as failed FROM campaigns WHERE user_id = ?").get(uid) || { failed: 0 };
    const trackingRow = await db.prepare("SELECT COALESCE(SUM(q.opens_count), 0) as opens, COALESCE(SUM(q.clicks_count), 0) as clicks FROM queue q JOIN campaigns c ON q.campaign_id = c.id WHERE c.user_id = ?").get(uid) || { opens: 0, clicks: 0 };

    const stats = {
      today_sent: accountsRow.today_sent || 0,
      active_accounts: accountsRow.total || 0,
      pending: queueRow.pending || 0,
      active_campaigns: campaignsRow.active || 0,
      failed: failedRow.failed || 0,
      opens: trackingRow.opens || 0,
      clicks: trackingRow.clicks || 0,
    };

    
    const campaigns = await db.prepare(`
      SELECT c.*,
             COALESCE((SELECT SUM(opens_count) FROM queue WHERE campaign_id = c.id), 0) as total_opens,
             COALESCE((SELECT SUM(clicks_count) FROM queue WHERE campaign_id = c.id), 0) as total_clicks
      FROM campaigns c
      WHERE c.user_id = ?
      ORDER BY c.id DESC
      LIMIT 5
    `).all(uid);

    const queue = await db.prepare(`
      SELECT q.*, c.name as campaign_name, a.email as account_email
      FROM queue q
      JOIN campaigns c ON q.campaign_id = c.id
      LEFT JOIN accounts a ON q.account_id = a.id
      WHERE c.user_id = ?
      ORDER BY q.id DESC
      LIMIT 10
    `).all(uid);

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

    const logs = await db.prepare(
      "SELECT l.status, l.created_at FROM logs l LEFT JOIN campaigns c ON l.campaign_id = c.id WHERE (l.user_id = ? OR c.user_id = ?) AND l.created_at >= ?"
    ).all(uid, uid, startDate);

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

      logs.forEach(log => {
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

      logs.forEach(log => {
        const day = new Date(log.created_at).toISOString().split('T')[0];
        if (chartData[day]) {
          if (log.status === 'sent') chartData[day].sent++;
          if (log.status === 'opened') chartData[day].opened++;
          if (log.status === 'failed' || log.status === 'error') chartData[day].failed++;
        }
      });
    }

    // Fetch recent logs
    const recent_logs = await db.prepare(`
      SELECT l.*, COALESCE(c.name, 'Deleted Campaign') as campaign_name
      FROM logs l
      LEFT JOIN campaigns c ON l.campaign_id = c.id
      WHERE l.user_id = ? OR c.user_id = ?
      ORDER BY l.created_at DESC
      LIMIT 10
    `).all(uid, uid);

    res.json({
      stats,
      campaigns,
      queue,
      chartData: Object.values(chartData),
      timeframe: { isHourly, span: timeSpan },
      recent_logs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
