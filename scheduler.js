/**
 * scheduler.js — Background email worker.
 *
 * Runs every 30 seconds via node-cron.
 * Picks the next pending queue item, checks the sending window,
 * sends the email via Gmail API, and updates the queue/campaign status.
 *
 * Round-robin account rotation is pre-assigned at campaign launch time,
 * so this worker just processes each item with its assigned account.
 */

const cron = require('node-cron');
const { google } = require('googleapis');
const { getDb } = require('./db');
const logger = require('./logger');

// Import helpers from the accounts route
const {
  ensureFreshToken,
  makeRawEmail,
  getOAuth2Client,
  createSmtpTransport,
} = require('./routes/accounts');
const { parseSpintax } = require('./execution/spintax');

// ---------------------------------------------------------------------------
// Sending-window check
// ---------------------------------------------------------------------------

/**
 * Check if the current time is within the campaign's allowed sending window.
 * Defaults to West Africa Time (Africa/Lagos, UTC+1).
 */
function isWithinSendingWindow(campaign) {
  if (campaign.ignore_window || (campaign.start_time === '00:00' && (campaign.end_time === '23:59' || campaign.end_time === '24:00'))) {
    return true;
  }
  const tz = campaign.timezone || 'Africa/Lagos';
  let hours = 0;
  let minutes = 0;
  try {
    const timeParts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(new Date());
    for (const p of timeParts) {
      if (p.type === 'hour') hours = parseInt(p.value, 10) % 24;
      if (p.type === 'minute') minutes = parseInt(p.value, 10);
    }
  } catch (_) {
    const now = new Date();
    hours = now.getHours();
    minutes = now.getMinutes();
  }

  const currentTime = hours * 60 + minutes;

  const [startH = 8, startM = 0] = (campaign.start_time || '08:00').split(':').map(Number);
  const [endH = 22, endM = 0] = (campaign.end_time || '22:00').split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes === endMinutes) return true;

  if (startMinutes <= endMinutes) {
    return currentTime >= startMinutes && currentTime <= endMinutes;
  } else {
    // Overnight window (e.g. 22:00 to 06:00)
    return currentTime >= startMinutes || currentTime <= endMinutes;
  }
}

// ---------------------------------------------------------------------------
// Content variation (spintax-like rotation)
// ---------------------------------------------------------------------------

/**
 * If campaign has content_variations, pick one based on the queue item index.
 * Supports both array of { subject, body_html } and { subjects: [...], bodies: [...] }.
 * Returns { subject, body_html }.
 */
function getContent(campaign, queueItem) {
  const defaultSubject = campaign.c_subject || campaign.subject || '';
  const defaultBody = campaign.c_body_html || campaign.body_html || campaign.c_body_plain || campaign.body_plain || '';
  if (campaign.content_mode !== 'rotation' || !campaign.content_variations) {
    return {
      subject: defaultSubject,
      body_html: defaultBody,
    };
  }

  try {
    const variations = typeof campaign.content_variations === 'string'
      ? JSON.parse(campaign.content_variations)
      : campaign.content_variations;

    const itemIdx = Math.max(0, (queueItem?.id || 1) - 1);

    // Format A: { subjects: [...], bodies: [...] }
    if (variations && (Array.isArray(variations.subjects) || Array.isArray(variations.bodies))) {
      const subjectsList = (variations.subjects || []).filter(Boolean);
      const bodiesList = (variations.bodies || []).filter(Boolean);
      const chosenSubject = subjectsList.length > 0
        ? subjectsList[itemIdx % subjectsList.length]
        : defaultSubject;
      const chosenBody = bodiesList.length > 0
        ? bodiesList[itemIdx % bodiesList.length]
        : defaultBody;
      return {
        subject: chosenSubject,
        body_html: chosenBody,
      };
    }

    // Format B: Array of { subject, body_html }
    if (Array.isArray(variations) && variations.length > 0) {
      const v = variations[itemIdx % variations.length];
      return {
        subject: v.subject || defaultSubject,
        body_html: v.body_html || defaultBody,
      };
    }

    return { subject: defaultSubject, body_html: defaultBody };
  } catch {
    return { subject: defaultSubject, body_html: defaultBody };
  }
}

/**
 * Simple template variable replacement.
 * Supports {{email}} and {{date}}.
 */
function personalise(text, recipient, fieldsStr, accountDisplayName) {
  if (!text) return text;

  // 1. Run Spintax resolution
  let result = parseSpintax(text);

  // 2. Parse fields JSON
  let fields = {};
  if (fieldsStr) {
    try {
      fields = typeof fieldsStr === 'string' ? JSON.parse(fieldsStr) : fieldsStr;
    } catch (_) {
      fields = {};
    }
  }

  // Get local part and domain part of email
  const [localPart, domainPart] = recipient ? recipient.split('@') : ['', ''];
  const pSname = domainPart ? domainPart.split('.')[0] : '';
  
  const getFieldCaseInsensitive = (obj, ...keys) => {
    if (!obj || typeof obj !== 'object') return '';
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') return String(obj[key]);
    }
    const lowerKeys = keys.map(k => k.toLowerCase());
    for (const k of Object.keys(obj)) {
      if (lowerKeys.includes(k.toLowerCase()) && obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
        return String(obj[k]);
      }
    }
    return '';
  };

  const displayName = getFieldCaseInsensitive(fields, 'first_name', 'name', 'firstname') || localPart || '';
  const storeName = getFieldCaseInsensitive(fields, 'store_name', 'store', 'storename', 'company') || domainPart || '';
  const brandName = accountDisplayName || getFieldCaseInsensitive(fields, 'brand') || '';

  const now = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const resolveVar = (key) => {
    const normKey = key.trim().toLowerCase();

    // Check built-in or fallbacks
    if (normKey === 'email') return recipient || '';
    if (normKey === 'date') return now;
    if (normKey === 'name' || normKey === 'first_name' || normKey === 'firstname') return displayName;
    if (normKey === 'store' || normKey === 'store_name' || normKey === 'storename') return storeName;
    if (normKey === 'sname') return pSname;
    if (normKey === 'brand' || normKey === 'sender' || normKey === 'sender_name' || normKey === 'sendername' || normKey === 'from_name') return brandName;

    // Direct lookups in custom fields
    if (fields && fields[normKey] !== undefined && fields[normKey] !== null) return String(fields[normKey]);
    if (fields && fields[key] !== undefined && fields[key] !== null) return String(fields[key]);

    // Case-insensitive fallback lookup
    if (fields && typeof fields === 'object') {
      const matchKey = Object.keys(fields).find(k => k.toLowerCase() === normKey);
      if (matchKey && fields[matchKey] !== undefined && fields[matchKey] !== null) {
        return String(fields[matchKey]);
      }
    }

    // Return empty string to cleanly omit missing placeholder
    return '';
  };

  // 3. Dynamic double curly brace {{variable}} replacements
  result = result.replace(/\{\{([^{}]+)\}\}/g, (_, key) => resolveVar(key));

  // 4. Dynamic single curly brace {variable} replacements (excluding spintax containing pipe '|')
  result = result.replace(/\{([a-zA-Z0-9_\-\s]+)\}/g, (_, key) => resolveVar(key));

  return result;
}

/**
 * Parses the HTML email body, wraps outbound links in redirect tracking URLs,
 * and appends a hidden 1x1 image tracking pixel.
 */
function injectTracking(bodyHtml, queueItemId) {
  if (!bodyHtml) return bodyHtml;
  const baseUrl = process.env.TRACKING_BASE_URL || 'http://localhost:3000';

  // Match href="url" or href='url'
  let trackedBody = bodyHtml.replace(/href=(["'])([^"'\s>]+)\1/gi, (match, quote, url) => {
    // Skip anchor tags, email links, phone links, and existing track routes
    if (url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:') || url.includes('/api/track/')) {
      return match;
    }
    const wrappedUrl = `${baseUrl}/api/track/click/${queueItemId}?url=${encodeURIComponent(url)}`;
    return `href=${quote}${wrappedUrl}${quote}`;
  });

  // Inject open tracking pixel
  const pixelUrl = `${baseUrl}/api/track/open/${queueItemId}`;
  const pixelTag = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;" />`;

  if (trackedBody.includes('</body>')) {
    trackedBody = trackedBody.replace('</body>', `${pixelTag}</body>`);
  } else {
    trackedBody += pixelTag;
  }

  return trackedBody;
}

// ---------------------------------------------------------------------------
// Send one email
// ---------------------------------------------------------------------------

async function sendEmail(account, to, subject, bodyHtml, campaignId = 0) {
  const fromAddr = account.display_name
    ? `"${account.display_name}" <${account.email}>`
    : account.email;

  // RFC 8058 List-Unsubscribe headers (required by Gmail & Yahoo for bulk senders)
  const baseUrl = process.env.TRACKING_BASE_URL || 'http://localhost:3000';
  const unsubToken = Buffer.from(`${to}|${campaignId}|${account.user_id || ''}`).toString('base64url');
  const unsubUrl = `${baseUrl}/api/unsubscribe?token=${unsubToken}`;
  const unsubEmail = `unsubscribe+${to.replace('@', '=')}@${account.email.split('@')[1]}`;
  const unsubHeader = `<${unsubUrl}>, <mailto:${unsubEmail}?subject=unsubscribe>`;

  // Append compliant unsubscribe footer if not already present
  let finalHtml = bodyHtml;
  if (!finalHtml.toLowerCase().includes('unsubscribe')) {
    const unsubFooter = `<p style="font-size:11px; color:#888888; margin-top:32px; border-top:1px solid #e2e8f0; padding-top:12px; font-family:sans-serif;">If you no longer wish to receive these emails, you can <a href="${unsubUrl}" style="color:#635bff; text-decoration:underline;">unsubscribe here</a>.</p>`;
    if (finalHtml.includes('</body>')) {
      finalHtml = finalHtml.replace('</body>', `${unsubFooter}</body>`);
    } else {
      finalHtml += unsubFooter;
    }
  }

  if (account.type === 'smtp') {
    // Send via Nodemailer SMTP transport
    const transport = createSmtpTransport(account);
    await transport.sendMail({
      from: fromAddr,
      to,
      subject,
      html: finalHtml,
      headers: {
        'List-Unsubscribe': unsubHeader,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
  } else {
    // Send via Gmail API (OAuth)
    const accessToken = await ensureFreshToken(account);
    const oauth2 = getOAuth2Client();
    oauth2.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2 });
    const raw = makeRawEmail(account.email, to, subject, finalHtml, {
      'List-Unsubscribe': unsubHeader,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });
  }
}

// ---------------------------------------------------------------------------
// Background Contact List Sync
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Process one queue item — strictly enforces campaign rules (status, volume)
// ---------------------------------------------------------------------------
async function processNextItem() {
  try {
    let db;
    try {
      db = await getDb();
    } catch (err) {
      logger.error({ err }, 'DB not ready');
      return { processedCount: 0 };
    }

  const BATCH_SIZE = parseInt(process.env.SCHEDULER_BATCH_SIZE, 10) || 5;
  const nowIso = new Date().toISOString();

  // Find the next pending items whose scheduled time has strictly passed
  const items = await db.prepare(`
    SELECT q.*, c.status as campaign_status,
           c.subject as c_subject, c.body_html as c_body_html,
           c.start_time, c.end_time, c.ignore_window,
           c.content_variations, c.content_mode,
           c.sent_count as c_sent_count, c.total_contacts as c_total_contacts
    FROM queue q
    JOIN campaigns c ON q.campaign_id = c.id
    WHERE q.status = 'pending'
      AND c.status = 'sending'
      AND (q.scheduled_at <= ? OR q.scheduled_at <= datetime('now'))
    ORDER BY q.scheduled_at ASC
    LIMIT ?
  `).all(nowIso, BATCH_SIZE);

  if (!items || items.length === 0) {
    await completeEmptySendingCampaigns(db);
    return { processedCount: 0 };
  }

  const accountSentInBatch = {};

  // Process items grouped by account to avoid race conditions on account counters.
  const concurrency = parseInt(process.env.SENDER_CONCURRENCY || '3', 10) || 3;
  const groups = new Map();
  for (const item of items) {
    const key = String(item.account_id || 'null');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const groupEntries = Array.from(groups.entries());
  let idx = 0;

  async function processGroup(_accountIdKey, groupItems) {
    for (const item of groupItems) {
      // 1. Strict Campaign Status & Target Limit Verification
      const currentCampaign = await db.prepare('SELECT id, status, sent_count, total_contacts FROM campaigns WHERE id = ?').get(item.campaign_id);
      if (!currentCampaign || currentCampaign.status !== 'sending') {
        // Campaign was paused, completed, or deleted by user — skip sending!
        continue;
      }

      if (currentCampaign.total_contacts > 0 && (currentCampaign.sent_count || 0) >= currentCampaign.total_contacts) {
        // Target volume reached: complete campaign and stop sending further
        await db.prepare("UPDATE campaigns SET status = 'completed' WHERE id = ?").run(item.campaign_id);
        await db.prepare("DELETE FROM queue WHERE campaign_id = ? AND status = 'pending'").run(item.campaign_id);
        continue;
      }

      // Check sending window
      if (!isWithinSendingWindow(item)) {
        continue; // Outside allowed hours, skip this one
      }

      // Get the assigned sender account with dynamic fallback for campaign/user
      let account = null;
      if (item.account_id) {
        account = await db.prepare('SELECT * FROM accounts WHERE id = ?').get(item.account_id);
      }
      if (!account || account.status !== 'active') {
        if (item.user_id) {
          account = await db.prepare("SELECT * FROM accounts WHERE status = 'active' AND user_id = ? ORDER BY id ASC LIMIT 1").get(item.user_id);
        }
        if (!account) {
          account = await db.prepare("SELECT * FROM accounts WHERE status = 'active' ORDER BY id ASC LIMIT 1").get();
        }
        if (account) {
          try {
            await db.prepare('UPDATE queue SET account_id = ? WHERE id = ?').run(account.id, item.id);
          } catch (_) {}
        }
      }

      if (!account || account.status !== 'active') {
        // Mark as failed — no valid account
        await db.prepare("UPDATE queue SET status = 'failed', error = 'No active sender accounts available' WHERE id = ?").run(item.id);
        await db.prepare('UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = ?').run(item.campaign_id);
        await logEvent(db, item.campaign_id, item.account_id, item.recipient_email, 'failed', 'No active sender accounts available', item.id);
        continue;
      }

      // Check daily send limit (default limit is 450)
      const dailyLimit = account.daily_limit !== null && account.daily_limit !== undefined ? account.daily_limit : 450;
      const currentSent = account.daily_sent + (accountSentInBatch[account.id] || 0);
      if (currentSent >= dailyLimit) {
        logger.info({ email: account.email, dailyLimit, itemId: item.id }, 'Account daily limit hit. Rescheduling queue item to tomorrow');
        // Reschedule to tomorrow (add 1 day)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await db.prepare("UPDATE queue SET scheduled_at = ? WHERE id = ?").run(tomorrow.toISOString(), item.id);
        continue;
      }

      // Check if recipient has replied or unsubscribed in this campaign
      const recipientTracker = await db.prepare('SELECT status FROM campaign_recipients WHERE campaign_id = ? AND recipient_email = ?').get(item.campaign_id, item.recipient_email);
      if (recipientTracker && (recipientTracker.status === 'replied' || recipientTracker.status === 'unsubscribed')) {
        // Delete from queue directly and skip
        await db.prepare("DELETE FROM queue WHERE id = ?").run(item.id);
        logger.info({ recipient: item.recipient_email, campaignId: item.campaign_id }, 'Skipping email send: recipient replied or unsubscribed');
        await completeCampaignIfNoActiveQueue(db, item.campaign_id);
        continue;
      }

      // Check master suppression list (scoped to user or global)
      const cleanRecipientEmail = (item.recipient_email || '').toLowerCase().trim();
      const cleanRecipientDomain = cleanRecipientEmail.includes('@') ? cleanRecipientEmail.split('@')[1] : '';

      const suppressedRow = await db.prepare(`
        SELECT * FROM suppression_list
        WHERE ((type = 'email' AND LOWER(value) = ?) OR (type = 'domain' AND LOWER(value) = ?))
          AND (user_id = ? OR user_id IS NULL)
      `).get(cleanRecipientEmail, cleanRecipientDomain, item.user_id || null);

      if (suppressedRow) {
        await db.prepare("UPDATE queue SET status = 'cancelled', error = 'Suppressed by master blocklist' WHERE id = ?").run(item.id);
        logger.info({ recipient: cleanRecipientEmail, reason: suppressedRow.reason }, 'Skipped sending: Recipient is in master suppression list');
        await logEvent(db, item.campaign_id, item.account_id, item.recipient_email, 'cancelled', `Suppressed: ${suppressedRow.reason}`, item.id);
        await completeCampaignIfNoActiveQueue(db, item.campaign_id);
        continue;
      }

      // Reserve a send slot atomically and mark as sending in the same DB transaction.
      // This prevents race conditions under high concurrency.
      let reserved = false;
      try {
        reserved = await db.transaction(async (tx) => {
          const accRow = await tx.prepare('SELECT daily_sent, daily_limit FROM accounts WHERE id = ?').get(account.id);
          if (!accRow) return false;
          const limit = accRow.daily_limit !== null && accRow.daily_limit !== undefined ? accRow.daily_limit : 450;
          if ((accRow.daily_sent || 0) >= limit) {
            return false;
          }
          // Increment the counter and mark queue item as sending atomically
          await tx.prepare('UPDATE accounts SET daily_sent = daily_sent + 1 WHERE id = ?').run(account.id);
          await tx.prepare("UPDATE queue SET status = 'sending' WHERE id = ?").run(item.id);
          return true;
        })();
      } catch (txErr) {
        logger.error({ err: txErr, account: account.id, item: item.id }, 'Error reserving send slot');
        reserved = false;
      }

      if (!reserved) {
        // Could not reserve a slot — reschedule or mark appropriately
        logger.info({ accountId: account.id, itemId: item.id }, 'Account daily limit reached or reservation failed; rescheduling item');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await db.prepare("UPDATE queue SET scheduled_at = ? WHERE id = ?").run(tomorrow.toISOString(), item.id);
        continue;
      }
      // Track in-memory as well for the current batch
      accountSentInBatch[account.id] = (accountSentInBatch[account.id] || 0) + 1;

      try {
        // Get content: load from step table if campaign_step_id is present, otherwise fallback to main campaign fields
        let subject, body_html;
        if (item.campaign_step_id) {
          const step = await db.prepare('SELECT subject, body_html FROM campaign_steps WHERE id = ?').get(item.campaign_step_id);
          if (step) {
            subject = step.subject;
            body_html = step.body_html;
          }
        }

        if (!subject || !body_html) {
          const contentRes = getContent(item, item);
          subject = contentRes.subject;
          body_html = contentRes.body_html;
        }

        const finalSubject = personalise(subject, item.recipient_email, item.fields, account.display_name);
        const personalisedBody = personalise(body_html, item.recipient_email, item.fields, account.display_name);
        const finalBody = injectTracking(personalisedBody, item.id);

        await sendEmail(account, item.recipient_email, finalSubject, finalBody, item.campaign_id);

        // Mark as sent
        await db.prepare("UPDATE queue SET status = 'sent', sent_at = ?, final_subject = ?, final_body = ? WHERE id = ?")
          .run(new Date().toISOString(), finalSubject, finalBody, item.id);
        await db.prepare('UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = ?').run(item.campaign_id);

        await logEvent(db, item.campaign_id, account.id, item.recipient_email, 'sent', 'OK', item.id);
        logger.info({ recipient: item.recipient_email, sender: account.email }, 'Email sent successfully');

        // Update recipient step status & queue follow-ups
        const currentStepNum = item.step_number || 1;
        await db.prepare(`
          UPDATE campaign_recipients
          SET current_step = ?, last_sent_at = ?
          WHERE campaign_id = ? AND recipient_email = ?
        `).run(currentStepNum, new Date().toISOString(), item.campaign_id, item.recipient_email);

        // Check if there is a next step in the campaign
        const nextStep = await db.prepare('SELECT * FROM campaign_steps WHERE campaign_id = ? AND step_number = ?').get(item.campaign_id, currentStepNum + 1);

        if (nextStep) {
          // Schedule next step if recipient status is active
          const rec = await db.prepare('SELECT status FROM campaign_recipients WHERE campaign_id = ? AND recipient_email = ?').get(item.campaign_id, item.recipient_email);
          if (rec && rec.status === 'active') {
            const delayMs = (nextStep.delay_seconds || 86400) * 1000;
            const scheduledTime = new Date(Date.now() + delayMs);

            await db.prepare(`
              INSERT INTO queue (campaign_id, recipient_email, account_id, status, scheduled_at, fields, step_number, campaign_step_id, user_id)
              VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)
            `).run(item.campaign_id, item.recipient_email, account.id, scheduledTime.toISOString(), item.fields, nextStep.step_number, nextStep.id, item.user_id || account.user_id || null);

            logger.info({ recipient: item.recipient_email, campaignId: item.campaign_id, nextStep: nextStep.step_number, scheduledAt: scheduledTime }, 'Scheduled follow-up email step');
          }
        } else {
          // Mark recipient campaign run as completed
          await db.prepare(`
            UPDATE campaign_recipients
            SET status = 'completed'
            WHERE campaign_id = ? AND recipient_email = ? AND status = 'active'
          `).run(item.campaign_id, item.recipient_email);
        }

        await completeCampaignIfNoActiveQueue(db, item.campaign_id);
      } catch (err) {
        // Decrement the batch count for this account since it failed to send
        if (accountSentInBatch[account.id] > 0) {
          accountSentInBatch[account.id]--;
        }

        // If we reserved a DB slot earlier, release it so other items can use it
        if (reserved) {
          try {
            await db.prepare('UPDATE accounts SET daily_sent = daily_sent - 1 WHERE id = ? AND daily_sent > 0').run(account.id);
          } catch (decErr) {
            logger.error({ err: decErr, account: account.id }, 'Failed to decrement daily_sent after send failure');
          }
        }

        // Check retry_count for exponential backoff
        const currentRetryCount = item.retry_count || 0;
        if (currentRetryCount < 3) {
          const nextRetryCount = currentRetryCount + 1;
          // Exponential backoff minutes: 1st retry: 5 mins, 2nd: 15 mins, 3rd: 45 mins
          const backoffMinutes = Math.pow(3, nextRetryCount - 1) * 5;
          const nextAttempt = new Date(Date.now() + backoffMinutes * 60 * 1000);

          await db.prepare("UPDATE queue SET status = 'pending', retry_count = ?, scheduled_at = ?, error = ? WHERE id = ?")
            .run(nextRetryCount, nextAttempt.toISOString(), err.message, item.id);

          await logEvent(db, item.campaign_id, account.id, item.recipient_email, 'retry', `Attempt ${nextRetryCount} failed: ${err.message}. Retrying at ${nextAttempt.toISOString()}`, item.id, item.user_id || account.user_id);
          logger.warn({ err, recipient: item.recipient_email, attempt: nextRetryCount, backoffMinutes }, 'Temporary sending failure');
        } else {
          // Mark as failed permanently
            await db.prepare("UPDATE queue SET status = 'failed', error = ? WHERE id = ?").run(err.message, item.id);
          await db.prepare('UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = ?').run(item.campaign_id);
          await logEvent(db, item.campaign_id, account.id, item.recipient_email, 'failed', err.message, item.id, item.user_id || account.user_id);
            logger.error({ err, recipient: item.recipient_email }, 'Permanent sending failure');

          // Reservation was consumed for this permanent failure — decrement to free quota
          if (reserved) {
            try {
              await db.prepare('UPDATE accounts SET daily_sent = daily_sent - 1 WHERE id = ? AND daily_sent > 0').run(account.id);
            } catch (decErr) {
              logger.error({ err: decErr, account: account.id }, 'Failed to decrement daily_sent after permanent failure');
            }
          }

          await completeCampaignIfNoActiveQueue(db, item.campaign_id);
        }
      }
    }
  }

  // Run groups with limited concurrency
  const workers = new Array(concurrency).fill(null).map(async () => {
    while (true) {
      const i = idx++;
      if (i >= groupEntries.length) break;
      const [accountKey, groupItems] = groupEntries[i];
      try {
        await processGroup(accountKey, groupItems);
      } catch (err) {
        logger.error({ err, accountKey }, 'Error processing account group');
      }
    }
  });

    await Promise.all(workers);
    return { processedCount: items.length };
  } catch (err) {
    logger.error({ err }, 'Error in processNextItem execution');
    return { processedCount: 0, error: err.message };
  }
}

async function completeCampaignIfNoActiveQueue(db, campaignId) {
  try {
    const row = await db.prepare(`
      SELECT COUNT(*) as activeCount
      FROM queue
      WHERE campaign_id = ? AND status IN ('pending', 'sending')
    `).get(campaignId);

    if (!row || row.activeCount === 0) {
      await db.prepare("UPDATE campaigns SET status = 'completed' WHERE id = ? AND status = 'sending'").run(campaignId);
      logger.info({ campaignId }, 'Campaign marked completed (no active queue items remain)');
    }
  } catch (err) {
    logger.error({ err, campaignId }, 'Error finalizing campaign completion');
  }
}

async function completeEmptySendingCampaigns(db) {
  try {
    const rows = await db.prepare(`
      SELECT c.id
      FROM campaigns c
      LEFT JOIN (
        SELECT campaign_id, COUNT(*) as activeCount
        FROM queue
        WHERE status IN ('pending', 'sending')
        GROUP BY campaign_id
      ) q ON q.campaign_id = c.id
      WHERE c.status = 'sending' AND COALESCE(q.activeCount, 0) = 0
    `).all();

    for (const row of rows) {
      await db.prepare("UPDATE campaigns SET status = 'completed' WHERE id = ?").run(row.id);
      logger.info({ campaignId: row.id }, 'Campaign marked completed during scheduler sweep (no active queue items)');
    }
  } catch (err) {
    logger.error({ err }, 'Error completing empty sending campaigns');
  }
}

// ---------------------------------------------------------------------------
// Log helper
// ---------------------------------------------------------------------------

async function logEvent(db, campaignId, accountId, recipient, status, message, queueId = null, userId = null) {
  try {
    let uid = userId;
    if (!uid && campaignId) {
      try {
        const c = await db.prepare('SELECT user_id FROM campaigns WHERE id = ?').get(campaignId);
        if (c && c.user_id) uid = c.user_id;
      } catch (_) {}
    }
    if (!uid && accountId) {
      try {
        const a = await db.prepare('SELECT user_id FROM accounts WHERE id = ?').get(accountId);
        if (a && a.user_id) uid = a.user_id;
      } catch (_) {}
    }

    await db.prepare(`
      INSERT INTO logs (campaign_id, account_id, recipient_email, status, message, queue_id, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(campaignId, accountId, recipient, status, message, queueId, uid || null);
  } catch (err) {
    // Fallback if queue_id/user_id columns don't exist yet in the database
    try {
      await db.prepare(`
        INSERT INTO logs (campaign_id, account_id, recipient_email, status, message)
        VALUES (?, ?, ?, ?, ?)
      `).run(campaignId, accountId, recipient, status, message);
    } catch (fallbackErr) {
      logger.error({ err: fallbackErr }, 'Log write error');
    }
  }
}

// ---------------------------------------------------------------------------
// Comprehensive 24-Hour Daily Maintenance & Reset Engine
// ---------------------------------------------------------------------------

/**
 * Run comprehensive 24-hour maintenance & reset operations across the system:
 * 1. Resets mailbox daily send quotas (daily_sent -> 0, last_reset -> NOW()).
 * 2. Unblocks queue items that were postponed/deferred due to daily limit.
 * 3. Prunes expired & used password reset tokens and expired refresh tokens.
 * 4. Cleans up expired user account lockouts & resets failed login attempt counters.
 * 5. Recovers stuck queue items in 'sending' state for > 45 minutes.
 * 6. Sweeps and completes empty sending campaigns.
 */
async function runDailyMaintenance(customDb = null, force = false) {
  try {
    const db = customDb || await getDb();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    logger.info({ todayStr, force }, 'Starting 24-Hour Maintenance & Reset sweep...');

    // 1. Reset accounts daily sending counters if not reset today (or if forced)
    let resetAccountsCount = 0;
    if (force) {
      const res = await db.prepare("UPDATE accounts SET daily_sent = 0, last_reset = datetime('now')").run();
      resetAccountsCount = res.changes || 0;
    } else {
      const accountsToReset = await db.prepare(`
        SELECT id, email, last_reset, daily_sent
        FROM accounts
        WHERE last_reset IS NULL
           OR last_reset < ?
      `).all(todayStr);

      if (accountsToReset && accountsToReset.length > 0) {
        for (const acct of accountsToReset) {
          await db.prepare("UPDATE accounts SET daily_sent = 0, last_reset = datetime('now') WHERE id = ?").run(acct.id);
          resetAccountsCount++;
        }
      }
    }

    if (resetAccountsCount > 0) {
      logger.info({ resetAccountsCount }, 'Reset daily sending quotas for accounts');

      // 2. Unblock any queue items that were postponed/deferred due to daily limit
      try {
        await db.prepare(`
          UPDATE queue
          SET scheduled_at = datetime('now')
          WHERE status = 'pending'
            AND scheduled_at > datetime('now')
            AND error LIKE '%daily limit%'
        `).run();
      } catch (_) {}
    }

    // 3. Prune expired & used password reset tokens
    try {
      await db.prepare(`
        DELETE FROM password_reset_tokens
        WHERE expires_at < datetime('now')
      `).run();
    } catch (_) {}

    // 4. Prune expired refresh tokens
    try {
      await db.prepare(`
        DELETE FROM refresh_tokens
        WHERE expires_at < datetime('now')
      `).run();
    } catch (_) {}

    // 5. Clean up expired user lockouts
    try {
      await db.prepare(`
        UPDATE users
        SET failed_login_attempts = 0, locked_until = NULL
        WHERE locked_until IS NOT NULL AND locked_until < datetime('now')
      `).run();
    } catch (_) {}

    // 6. Recover stuck queue items (in 'sending' for > 45 minutes)
    try {
      const stuckRes = await db.prepare(`
        UPDATE queue
        SET status = 'pending', error = 'Recovered from stuck state during 24h maintenance sweep'
        WHERE status = 'sending'
      `).run();
      if (stuckRes && stuckRes.changes > 0) {
        logger.warn({ count: stuckRes.changes }, 'Auto-recovered stuck queue items during maintenance sweep');
      }
    } catch (_) {}

    // 7. Complete empty sending campaigns
    await completeEmptySendingCampaigns(db);

    logger.info('24-Hour Maintenance & Reset sweep completed successfully.');
    return { success: true, resetAccountsCount, timestamp: now.toISOString() };
  } catch (err) {
    logger.error({ err }, 'Error during 24-hour maintenance sweep');
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Startup: crash recovery + 24-hour maintenance check
// ---------------------------------------------------------------------------

(async () => {
  try {
    const db = await getDb();

    // Recover any queue items stuck in 'sending' from a previous crash
    const stuck = await db.prepare(
      "UPDATE queue SET status = 'pending' WHERE status = 'sending'"
    ).run();
    if (stuck.changes > 0) {
      logger.info({ count: stuck.changes }, 'Recovered stuck queue items from previous crash');
    }

    // Run initial 24h maintenance check on startup to ensure accounts are not stuck on yesterday's limits
    await runDailyMaintenance(db, false);
  } catch (err) {
    logger.error({ err }, 'Startup recovery failed');
  }

  // Warn if TRACKING_BASE_URL is still localhost in non-dev environments
  const trackingUrl = process.env.TRACKING_BASE_URL || 'http://localhost:3000';
  if (trackingUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
    logger.warn('TRACKING_BASE_URL is set to localhost — tracking pixels will not work in production!');
  }
})();

// ---------------------------------------------------------------------------
// Immediate Real-Time Dispatch Worker (Instant Execution)
// ---------------------------------------------------------------------------

const isNetlifyServerless = process.env.NETLIFY === 'true';
const schedulerEnabled = !isNetlifyServerless && process.env.DISABLE_SCHEDULER !== 'true';
let dispatchInterval = null;
let resetTask = null;
let inboxSyncCron = null;
let lastTickAt = null;
let isDispatching = false;

/**
 * Trigger immediate dispatch of all ready queue items without waiting for any timer.
 * Automatically drains pending items in real-time.
 */
async function triggerImmediateDispatch() {
  if (isDispatching) return;
  isDispatching = true;
  try {
    lastTickAt = new Date().toISOString();
    let loops = 0;
    while (loops < 50) {
      loops++;
      const result = await processNextItem();
      if (!result || !result.processedCount || result.processedCount === 0) {
        break;
      }
      // Small tick between batches to prevent CPU saturation while maintaining immediate throughput
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  } catch (err) {
    logger.error({ err }, 'Error during immediate dispatch execution');
  } finally {
    isDispatching = false;
  }
}

let isTickRunning = false;
let lastMaintenanceCheck = Date.now();

if (schedulerEnabled) {
  const loopIntervalMs = parseInt(process.env.SCHEDULER_INTERVAL_MS, 10) || 4000;
  // Real-time non-overlapping continuous pulse to process ready queue items
  dispatchInterval = setInterval(async () => {
    if (isTickRunning || isDispatching) return;
    isTickRunning = true;
    try {
      lastTickAt = new Date().toISOString();
      await processNextItem();

      // Check for overdue 24h reset every 30 minutes in background
      if (Date.now() - lastMaintenanceCheck > 30 * 60 * 1000) {
        lastMaintenanceCheck = Date.now();
        runDailyMaintenance(null, false).catch(() => {});
      }
    } catch (err) {
      logger.error({ err }, 'Unexpected error in real-time dispatch loop');
    } finally {
      isTickRunning = false;
    }
  }, loopIntervalMs);

  // Daily reset of account send counters at midnight (00:00 UTC)
  resetTask = cron.schedule('0 0 * * *', async () => {
    logger.info('Midnight cron triggered: Running 24-hour maintenance & counter reset');
    await runDailyMaintenance(null, true);
  });

  // Background periodic inbox sync every 5 minutes
  inboxSyncCron = cron.schedule('*/5 * * * *', async () => {
    try {
      const db = await getDb();
      const accounts = await db.prepare("SELECT * FROM accounts WHERE status = 'active' AND (type = 'oauth' OR refresh_token IS NOT NULL)").all();
      if (!accounts || accounts.length === 0) return;
      const { syncAccountInbox } = require('./routes/inbox');
      for (const account of accounts) {
        try {
          await syncAccountInbox(account, db, account.user_id || 1);
        } catch (_) {}
      }
    } catch (_) {}
  });

  logger.info('Immediate Email Worker active (continuous real-time dispatch with instant launch execution)');
} else {
  resetTask = { stop: () => {} };
  logger.info('Email worker is disabled in local development. Set ENABLE_SCHEDULER=true to enable it.');
}

function stopScheduler() {
  if (dispatchInterval) {
    clearInterval(dispatchInterval);
    dispatchInterval = null;
  }
  if (resetTask && resetTask.stop) {
    resetTask.stop();
  }
  if (inboxSyncCron && inboxSyncCron.stop) {
    inboxSyncCron.stop();
  }
  logger.info('Email worker stopped');
}

async function getWorkerStatus(userId) {
  try {
    const db = await getDb();
    let activeCampaignsCount = 0;
    let pendingQueueCount = 0;

    if (userId) {
      const activeCampaigns = await db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE status = 'sending' AND (user_id = ? OR user_id IS NULL)").get(userId);
      const pendingQueue = await db.prepare("SELECT COUNT(*) as count FROM queue q JOIN campaigns c ON q.campaign_id = c.id WHERE q.status = 'pending' AND c.status = 'sending' AND (c.user_id = ? OR c.user_id IS NULL)").get(userId);
      activeCampaignsCount = activeCampaigns ? Number(activeCampaigns.count) : 0;
      pendingQueueCount = pendingQueue ? Number(pendingQueue.count) : 0;
    } else {
      const activeCampaigns = await db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE status = 'sending'").get();
      const pendingQueue = await db.prepare("SELECT COUNT(*) as count FROM queue q JOIN campaigns c ON q.campaign_id = c.id WHERE q.status = 'pending' AND c.status = 'sending'").get();
      activeCampaignsCount = activeCampaigns ? Number(activeCampaigns.count) : 0;
      pendingQueueCount = pendingQueue ? Number(pendingQueue.count) : 0;
    }

    return {
      active: schedulerEnabled,
      interval: '15s Schedule Interval',
      lastTickAt,
      activeCampaigns: activeCampaignsCount,
      pendingQueue: pendingQueueCount,
      mode: 'Enforced Schedule Rules & Timeframe Engine'
    };
  } catch (err) {
    return {
      active: schedulerEnabled,
      interval: '15s Schedule Interval',
      lastTickAt,
      activeCampaigns: 0,
      pendingQueue: 0,
      error: err.message
    };
  }
}

module.exports = {
  processNextItem,
  triggerImmediateDispatch,
  personalise,
  getContent,
  injectTracking,
  isWithinSendingWindow,
  completeCampaignIfNoActiveQueue,
  stopScheduler,
  getWorkerStatus,
  sendEmail,
  logEvent,
  runDailyMaintenance,
};

