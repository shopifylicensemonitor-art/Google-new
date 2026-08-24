/**
 * routes/tracking.js — Open & Click tracking redirectors.
 *
 * Exposes:
 *   GET /api/track/open/:queue_item_id   → Serve 1x1 pixel and increment opens_count
 *   GET /api/track/click/:queue_item_id  → Redirect and increment clicks_count
 *
 * NOTE: These endpoints must be unprotected so external email clients can reach them.
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const logger = require('../logger');

// Transparent 1x1 GIF tracking pixel
const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

/**
 * Detect security scanner crawlers, image proxies, and prefetch bots
 * (e.g. Barracuda, Proofpoint, GoogleImageProxy, Outlook SafeLinks, Headless Chrome)
 */
function isSecurityScannerOrBot(req) {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const purpose = (req.headers['purpose'] || req.headers['x-purpose'] || '').toLowerCase();
  const secPurpose = (req.headers['sec-purpose'] || '').toLowerCase();

  if (purpose === 'prefetch' || purpose === 'preview' || secPurpose === 'prefetch') {
    return true;
  }

  const botSignatures = [
    'googleimageproxy',
    'barracuda',
    'proofpoint',
    'mimecast',
    'symantec',
    'safelinks',
    'outlookcrawler',
    'headlesschrome',
    'phantomjs',
    'bot',
    'spider',
    'crawler',
    'wget',
    'curl'
  ];

  return botSignatures.some(sig => ua.includes(sig));
}

/** Track Email Open. */
router.get('/open/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    await db.prepare('UPDATE queue SET opens_count = opens_count + 1 WHERE id = ?').run(id);
  } catch (err) {
    logger.error({ err, queueItemId: id }, 'Error registering open on queue item');
  }

  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  });
  res.end(pixel);
});

/** Track Link Click. */
router.get('/click/:id', async (req, res) => {
  const { id } = req.params;
  const { url } = req.query;

  if (!url) {
    return res.status(400).send('Missing redirect URL parameter (?url=...).');
  }

  // Prevent open redirect attacks — only allow http(s) URLs
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return res.status(400).send('Invalid redirect URL. Only http and https URLs are allowed.');
  }

  const isBot = isSecurityScannerOrBot(req);
  if (!isBot) {
    try {
      const db = await getDb();
      await db.prepare('UPDATE queue SET clicks_count = clicks_count + 1 WHERE id = ?').run(id);
    } catch (err) {
      logger.error({ err, queueItemId: id, url }, 'Error registering click on queue item');
    }
  } else {
    logger.info({ queueItemId: id, ua: req.headers['user-agent'] }, 'Ignored prefetch/bot security scanner link click');
  }

  res.redirect(url);
});

/**
 * RFC 8058 & Web Unsubscribe handler (GET & POST).
 * Supports token query parameter or email/campaign_id body/params.
 */
const handleUnsubscribe = async (req, res) => {
  try {
    const db = await getDb();
    let email = req.query.email || req.body?.email;
    let campaignId = req.query.campaign_id || req.body?.campaign_id;
    let userId = req.query.user_id || req.body?.user_id;
    const token = req.query.token || req.body?.token;

    if (token) {
      try {
        const decoded = Buffer.from(token, 'base64url').toString('utf-8');
        const [tokEmail, tokCampId, tokUserId] = decoded.split('|');
        if (tokEmail) email = tokEmail;
        if (tokCampId) campaignId = tokCampId;
        if (tokUserId) userId = tokUserId;
      } catch (_) {
        // Fallback
      }
    }

    if (!email || !email.includes('@')) {
      if (req.method === 'POST') {
        return res.status(400).send('Invalid email or token');
      }
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Unsubscribe Error</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family:sans-serif; text-align:center; padding:50px; background:#0f172a; color:#f8fafc;">
          <h2 style="color:#f43f5e;">Unsubscribe Request Error</h2>
          <p style="color:#94a3b8;">No valid email or token was provided. Please check the link in your email.</p>
        </body>
        </html>
      `);
    }

    email = email.trim().toLowerCase();

    // Resolve user_id from campaign if not present in token
    if (!userId && campaignId) {
      try {
        const camp = await db.prepare('SELECT user_id FROM campaigns WHERE id = ?').get(campaignId);
        if (camp && camp.user_id) userId = camp.user_id;
      } catch (_) {}
    }

    // 1. Add email to suppression list scoped by user
    try {
      await db.prepare(`
        INSERT INTO suppression_list (type, value, reason, user_id)
        VALUES ('email', ?, 'unsubscribed', ?)
      `).run(email, userId || null);
    } catch (_) {
      // Already suppressed
    }

    // 2. Mark recipient status as unsubscribed across campaigns
    if (campaignId) {
      await db.prepare(`
        UPDATE campaign_recipients 
        SET status = 'unsubscribed' 
        WHERE LOWER(recipient_email) = ? AND campaign_id = ?
      `).run(email, campaignId);
    } else if (userId) {
      await db.prepare(`
        UPDATE campaign_recipients 
        SET status = 'unsubscribed' 
        WHERE LOWER(recipient_email) = ? AND campaign_id IN (SELECT id FROM campaigns WHERE user_id = ?)
      `).run(email, userId);
    } else {
      await db.prepare(`
        UPDATE campaign_recipients 
        SET status = 'unsubscribed' 
        WHERE LOWER(recipient_email) = ?
      `).run(email);
    }

    // 3. Cancel any pending queue items for this recipient
    if (userId) {
      await db.prepare(`
        UPDATE queue 
        SET status = 'cancelled', error = 'Unsubscribed by recipient' 
        WHERE LOWER(recipient_email) = ? AND status = 'pending' AND campaign_id IN (SELECT id FROM campaigns WHERE user_id = ?)
      `).run(email, userId);
    } else {
      await db.prepare(`
        UPDATE queue 
        SET status = 'cancelled', error = 'Unsubscribed by recipient' 
        WHERE LOWER(recipient_email) = ? AND status = 'pending'
      `).run(email);
    }

    logger.info({ email, campaignId, userId }, 'Recipient unsubscribed successfully');

    // RFC 8058 One-Click Unsubscribe via HTTP POST
    if (req.method === 'POST') {
      return res.status(200).send('Unsubscribed successfully');
    }

    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({ success: true, message: `Successfully unsubscribed ${email}.` });
    }

    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Successfully Unsubscribed</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 40px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
          .icon-badge { width: 64px; height: 64px; background: rgba(99,91,255,0.15); border: 1px solid rgba(99,91,255,0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: #635bff; font-size: 28px; }
          h1 { font-size: 22px; font-weight: 700; margin: 0 0 10px; color: #ffffff; }
          p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px; }
          .email-chip { display: inline-block; background: #0f172a; border: 1px solid #334155; color: #38bdf8; font-family: monospace; font-size: 13px; padding: 6px 14px; border-radius: 8px; margin-bottom: 20px; }
          .footer { font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #334155; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-badge">✓</div>
          <h1>You Have Been Unsubscribed</h1>
          <p>Your email address has been added to our master suppression list. You will not receive any further automated emails from us.</p>
          <div class="email-chip">${email}</div>
          <div class="footer">Peak Xender Outreach System &bull; Compliance Verified</div>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    logger.error({ err }, 'Error handling unsubscribe request');
    res.status(500).send('An error occurred while processing your unsubscribe request.');
  }
};

router.get('/unsubscribe', handleUnsubscribe);
router.post('/unsubscribe', handleUnsubscribe);

module.exports = router;
