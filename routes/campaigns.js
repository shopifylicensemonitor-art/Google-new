/**
 * routes/campaigns.js — Campaign CRUD + launch logic.
 *
 * Endpoints:
 *   GET    /api/campaigns           → List all campaigns
 *   GET    /api/campaigns/:id       → Get single campaign
 *   POST   /api/campaigns           → Create campaign
 *   PUT    /api/campaigns/:id       → Update campaign
 *   DELETE /api/campaigns/:id       → Delete campaign
 *   POST   /api/campaigns/:id/launch → Launch campaign (populate queue)
 *   POST   /api/campaigns/:id/pause  → Pause a running campaign
 *   POST   /api/campaigns/:id/resume → Resume a paused campaign
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const logger = require('../logger');
const { processNextItem, triggerImmediateDispatch, personalise, completeCampaignIfNoActiveQueue } = require('../scheduler');
const { calculateHumanizedSchedule } = require('../execution/timing');

function createDefaultCampaignContent(subject, bodyHtml, bodyPlain) {
  const normalizedSubject = typeof subject === 'string' && subject.trim() ? subject.trim() : 'Untitled campaign';
  const normalizedBodyHtml = typeof bodyHtml === 'string' && bodyHtml.trim()
    ? bodyHtml.trim()
    : '<p>This campaign is ready for editing.</p><p>Replace this placeholder content with your outreach message.</p>';
  const normalizedBodyPlain = typeof bodyPlain === 'string' && bodyPlain.trim()
    ? bodyPlain.trim()
    : 'This campaign is ready for editing. Replace this placeholder content with your outreach message.';

  return {
    subject: normalizedSubject,
    body_html: normalizedBodyHtml,
    body_plain: normalizedBodyPlain,
  };
}

function resolveLaunchRecipientPlan({ existingQueueRows = [], recipients = [], contacts = [] }) {
  const normalizedRecipients = Array.isArray(recipients) ? recipients : [];
  const normalizedContacts = Array.isArray(contacts) ? contacts : [];

  // 1. If explicit recipients provided in launch body, use them
  if (normalizedRecipients.length > 0) {
    return {
      useExistingQueue: false,
      recipients: normalizedRecipients.map((recipient) => {
        const recipientEmail = recipient?.recipient_email || recipient?.email || recipient?.recipientEmail || '';
        if (!recipientEmail) return null;
        return {
          recipient_email: recipientEmail,
          account_id: recipient?.account_id ?? recipient?.accountId ?? null,
          fields: recipient?.fields ?? recipient?.field_values ?? null,
        };
      }).filter(Boolean),
    };
  }

  // 2. If contacts exist in the assigned list, use list contacts
  if (normalizedContacts.length > 0) {
    return {
      useExistingQueue: false,
      recipients: normalizedContacts.map((contact) => {
        const recipientEmail = contact?.recipient_email || contact?.email || contact?.recipientEmail || '';
        if (!recipientEmail) return null;
        return {
          recipient_email: recipientEmail,
          account_id: contact?.account_id ?? contact?.accountId ?? null,
          fields: contact?.fields ?? contact?.field_values ?? null,
        };
      }).filter(Boolean),
    };
  }

  // 3. Fallback to existing queue rows if present
  const normalizedExistingRows = Array.isArray(existingQueueRows) ? existingQueueRows : [];
  if (normalizedExistingRows.length > 0) {
    return {
      useExistingQueue: true,
      recipients: normalizedExistingRows
        .map((row) => {
          if (!row) return null;
          const recipientEmail = row.recipient_email || row.email || row.recipientEmail || '';
          if (!recipientEmail) return null;
          return {
            recipient_email: recipientEmail,
            account_id: row.account_id ?? row.accountId ?? null,
            fields: row.fields ?? row.field_values ?? null,
          };
        })
        .filter(Boolean),
    };
  }

  return {
    useExistingQueue: false,
    recipients: [],
  };
}

router.createDefaultCampaignContent = createDefaultCampaignContent;
router.resolveLaunchRecipientPlan = resolveLaunchRecipientPlan;

/** Fetch a campaign only when it belongs to the requesting user. */
async function getOwnedCampaign(db, id, userId, columns = '*') {
  return db
    .prepare(`SELECT ${columns} FROM campaigns WHERE id = ? AND user_id = ?`)
    .get(id, userId);
}

/** List the current user's campaigns. */
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const campaigns = await db.prepare(`
      SELECT c.*,
             COALESCE(SUM(q.opens_count), 0) as total_opens,
             COALESCE(SUM(q.clicks_count), 0) as total_clicks
      FROM campaigns c
      LEFT JOIN queue q ON c.id = q.campaign_id
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all(req.userId);
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Get single campaign with stats. */
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const campaign = await getOwnedCampaign(db, req.params.id, req.userId);
    if (!campaign) return res.status(404).json({ error: 'Not found.' });

    // Attach steps
    const steps = await db.prepare('SELECT * FROM campaign_steps WHERE campaign_id = ? ORDER BY step_number ASC').all(req.params.id);
    campaign.steps = steps || [];

    // Attach queue stats
    const stats = await db.prepare(`
      SELECT status, COUNT(*) as count
      FROM queue WHERE campaign_id = ?
      GROUP BY status
    `).all(req.params.id);

    campaign.queue_stats = {};
    stats.forEach(s => { campaign.queue_stats[s.status] = s.count; });

    // Attach tracking totals
    const trackingRow = await db.prepare(`
      SELECT COALESCE(SUM(opens_count), 0) as total_opens,
             COALESCE(SUM(clicks_count), 0) as total_clicks
      FROM queue WHERE campaign_id = ?
    `).get(req.params.id);

    campaign.total_opens = trackingRow ? trackingRow.total_opens : 0;
    campaign.total_clicks = trackingRow ? trackingRow.total_clicks : 0;

    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Preview timing & delivery timeframe simulation */
router.post('/preview-timing', async (req, res) => {
  try {
    const {
      recipients_count = 100,
      account_ids,
      start_time = '09:00',
      end_time = '18:00',
      timezone = 'Africa/Lagos',
      ignore_window = false,
      timing_mode = 'smart',
      delay_seconds = 45,
      min_delay = 30,
      max_delay = 90,
      cooldown_enabled = true,
      cooldown_batch_size = 15,
      cooldown_duration_minutes = 5,
    } = req.body;

    const db = await getDb();
    let accounts = [];
    if (account_ids && Array.isArray(account_ids) && account_ids.length > 0) {
      const placeholders = account_ids.map(() => '?').join(',');
      accounts = await db.prepare(`SELECT id, email, daily_limit FROM accounts WHERE id IN (${placeholders}) AND status = 'active' AND user_id = ?`).all(...account_ids, req.userId);
    } else {
      accounts = await db.prepare("SELECT id, email, daily_limit FROM accounts WHERE status = 'active' AND user_id = ?").all(req.userId);
    }

    if (!accounts || accounts.length === 0) {
      accounts = [{ id: null, email: 'Primary Account', daily_limit: 450 }];
    }

    const dummyRecipients = Array.from({ length: Math.min(10000, parseInt(recipients_count, 10) || 100) }, (_, i) => ({
      email: `recipient_${i}@prospect.io`,
    }));

    const result = calculateHumanizedSchedule({
      recipients: dummyRecipients,
      accounts,
      startTime: start_time,
      endTime: end_time,
      timezone,
      ignoreWindow: !!ignore_window,
      timingMode: timing_mode,
      baseDelaySeconds: delay_seconds,
      minDelaySeconds: min_delay,
      maxDelaySeconds: max_delay,
      cooldownEnabled: !!cooldown_enabled,
      cooldownBatchSize: cooldown_batch_size,
      cooldownDurationMinutes: cooldown_duration_minutes,
      startTimestamp: new Date(),
    });

    res.json({
      success: true,
      summary: result.summary,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Create a new campaign. */
router.post('/', async (req, res) => {
  const {
    name, subject, body_html, body_plain,
    contact_list, delay_seconds = 45,
    start_time = '09:00', end_time = '18:00',
    content_variations, content_mode = 'single',
    ignore_window = 0, timezone = 'Africa/Lagos',
    account_ids, target_limit = 0, target_range_start = 0, target_range_end = 0, exclude_previously_contacted = 0, custom_filters,
    format_type = 'html',
    timing_mode = 'smart', min_delay = 30, max_delay = 90,
    cooldown_enabled = 1, cooldown_batch_size = 15, cooldown_duration_minutes = 5,
    steps
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Campaign name is required.' });
  }

  try {
    const db = await getDb();
    const resolvedContactList = contact_list || `campaign-${Date.now()}`;
    const content = createDefaultCampaignContent(subject, body_html, body_plain);

    // Count contacts in the specified list when one is provided.
    const countRow = resolvedContactList
      ? await db
          .prepare('SELECT COUNT(*) as total FROM contacts WHERE list_name = ? AND user_id = ?')
          .get(resolvedContactList, req.userId)
      : null;

    const createBoth = db.transaction(async (txDb) => {
      const result = await txDb.prepare(`
        INSERT INTO campaigns
          (name, subject, body_html, body_plain, contact_list,
           delay_seconds, start_time, end_time, total_contacts,
           content_variations, content_mode, ignore_window,
           timezone, account_ids, target_limit, target_range_start, target_range_end, exclude_previously_contacted, custom_filters, format_type,
           timing_mode, min_delay, max_delay, cooldown_enabled, cooldown_batch_size, cooldown_duration_minutes,
           user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name, content.subject, content.body_html, content.body_plain,
        resolvedContactList, delay_seconds, start_time, end_time,
        countRow ? countRow.total : 0,
        content_variations ? (typeof content_variations === 'string' ? content_variations : JSON.stringify(content_variations)) : null,
        content_mode, ignore_window ? 1 : 0,
        timezone || 'Africa/Lagos',
        account_ids ? (typeof account_ids === 'string' ? account_ids : JSON.stringify(account_ids)) : null,
        target_limit ? parseInt(target_limit, 10) : 0,
        target_range_start ? parseInt(target_range_start, 10) : 0,
        target_range_end ? parseInt(target_range_end, 10) : 0,
        exclude_previously_contacted ? 1 : 0,
        custom_filters ? (typeof custom_filters === 'string' ? custom_filters : JSON.stringify(custom_filters)) : null,
        format_type || 'html',
        timing_mode || 'smart',
        parseInt(min_delay, 10) || 30,
        parseInt(max_delay, 10) || 90,
        cooldown_enabled ? 1 : 0,
        parseInt(cooldown_batch_size, 10) || 15,
        parseInt(cooldown_duration_minutes, 10) || 5,
        req.userId
      );

      const campaignId = result.lastInsertRowid;

      if (steps && Array.isArray(steps)) {
        for (const step of steps) {
          await txDb.prepare(`
            INSERT INTO campaign_steps (campaign_id, step_number, subject, body_html, body_plain, delay_seconds, trigger_event)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(campaignId, step.step_number, step.subject, step.body_html || '', step.body_plain || '', step.delay_seconds || 86400, step.trigger_event || 'wait');
        }
      }
      return campaignId;
    });

    const campaignId = await createBoth();
    res.json({ success: true, id: campaignId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Update a campaign (only if draft or paused). */
router.put('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const campaign = await getOwnedCampaign(db, req.params.id, req.userId, 'status');
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
    
    const fields = req.body;
    const allowed = [
      'name', 'subject', 'body_html', 'body_plain', 'contact_list',
      'delay_seconds', 'start_time', 'end_time', 'content_variations', 'content_mode', 'ignore_window',
      'timezone', 'account_ids', 'target_limit', 'target_range_start', 'target_range_end', 'exclude_previously_contacted', 'custom_filters', 'format_type',
      'timing_mode', 'min_delay', 'max_delay', 'cooldown_enabled', 'cooldown_batch_size', 'cooldown_duration_minutes'
    ];

    const updates = [];
    const values = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        let val = fields[key];
        if (key === 'content_variations' || key === 'account_ids' || key === 'custom_filters') {
          val = typeof fields[key] === 'string' ? fields[key] : JSON.stringify(fields[key]);
        }
        values.push(val);
      }
    }

    if (fields.contact_list) {
      const countRow = await db.prepare(
        'SELECT COUNT(*) as total FROM contacts WHERE list_name = ? AND (user_id = ? OR user_id IS NULL)'
      ).get(fields.contact_list, req.userId);
      updates.push('total_contacts = ?');
      values.push(countRow ? countRow.total : 0);
    }

    const fallbackContent = createDefaultCampaignContent(fields.subject, fields.body_html, fields.body_plain);
    const updateBoth = db.transaction(async (txDb) => {
      if (updates.length > 0) {
        values.push(req.params.id);
        await txDb.prepare(`UPDATE campaigns SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      }

      // If account_ids updated, update all pending queue items to the new active sender accounts
      if (fields.account_ids) {
        try {
          const rawAccs = typeof fields.account_ids === 'string' ? JSON.parse(fields.account_ids) : fields.account_ids;
          if (Array.isArray(rawAccs) && rawAccs.length > 0) {
            const firstAcc = rawAccs[0];
            await txDb.prepare("UPDATE queue SET account_id = ? WHERE campaign_id = ? AND status = 'pending'").run(firstAcc, req.params.id);
          }
        } catch (_) {}
      }

      if (!fields.subject && !fields.body_html && !fields.body_plain) {
        await txDb.prepare(`
          UPDATE campaigns
          SET subject = ?, body_html = ?, body_plain = ?
          WHERE id = ?
        `).run(fallbackContent.subject, fallbackContent.body_html, fallbackContent.body_plain, req.params.id);
      } else if (!fields.subject || !fields.body_html || !fields.body_plain) {
        const current = await txDb.prepare('SELECT subject, body_html, body_plain FROM campaigns WHERE id = ?').get(req.params.id);
        const nextSubject = fields.subject || current?.subject || fallbackContent.subject;
        const nextBodyHtml = fields.body_html || current?.body_html || fallbackContent.body_html;
        const nextBodyPlain = fields.body_plain || current?.body_plain || fallbackContent.body_plain;
        await txDb.prepare(`
          UPDATE campaigns
          SET subject = ?, body_html = ?, body_plain = ?
          WHERE id = ?
        `).run(nextSubject, nextBodyHtml, nextBodyPlain, req.params.id);
      }
      
      if (fields.steps !== undefined && Array.isArray(fields.steps)) {
        await txDb.prepare('DELETE FROM campaign_steps WHERE campaign_id = ?').run(req.params.id);
        for (const step of fields.steps) {
          await txDb.prepare(`
            INSERT INTO campaign_steps (campaign_id, step_number, subject, body_html, body_plain, delay_seconds, trigger_event)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(req.params.id, step.step_number, step.subject, step.body_html || '', step.body_plain || '', step.delay_seconds || 86400, step.trigger_event || 'wait');
        }
      }
    });

    await updateBoth();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const owned = await getOwnedCampaign(db, req.params.id, req.userId, 'id');
    if (!owned) return res.status(404).json({ error: 'Campaign not found.' });
    const deleteBoth = db.transaction(async (txDb) => {
      await txDb.prepare('DELETE FROM queue WHERE campaign_id = ?').run(req.params.id);
      await txDb.prepare('DELETE FROM campaign_recipients WHERE campaign_id = ?').run(req.params.id);
      await txDb.prepare('DELETE FROM campaign_steps WHERE campaign_id = ?').run(req.params.id);
      await txDb.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
    });
    await deleteBoth();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Duplicate an existing campaign and its sequence steps as a new draft */
router.post('/:id/duplicate', async (req, res) => {
  try {
    const db = await getDb();
    const original = await getOwnedCampaign(db, req.params.id, req.userId);
    if (!original) return res.status(404).json({ error: 'Campaign not found.' });

    const steps = await db.prepare(
      'SELECT * FROM campaign_steps WHERE campaign_id = ? ORDER BY step_number ASC'
    ).all(req.params.id);

    const dupTx = db.transaction(async (txDb) => {
      const newName = `${original.name} (Copy)`;
      const resCamp = await txDb.prepare(`
        INSERT INTO campaigns (
          name, subject, body_html, body_plain, contact_list, status,
          delay_seconds, min_delay, max_delay, cooldown_enabled, cooldown_batch_size, cooldown_duration_minutes,
          start_time, end_time, exclude_previously_contacted, custom_filters, user_id
        ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newName,
        original.subject,
        original.body_html || '',
        original.body_plain || '',
        original.contact_list || '',
        original.delay_seconds || 30,
        original.min_delay || 30,
        original.max_delay || 60,
        original.cooldown_enabled ? 1 : 0,
        original.cooldown_batch_size || 50,
        original.cooldown_duration_minutes || 60,
        original.start_time || '08:00',
        original.end_time || '22:00',
        original.exclude_previously_contacted ? 1 : 0,
        original.custom_filters || '[]',
        req.userId
      );

      const newId = resCamp.lastInsertRowid;

      for (const step of steps || []) {
        await txDb.prepare(`
          INSERT INTO campaign_steps (campaign_id, step_number, subject, body_html, body_plain, delay_seconds, trigger_event)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(newId, step.step_number, step.subject, step.body_html || '', step.body_plain || '', step.delay_seconds || 86400, step.trigger_event || 'wait');
      }

      return newId;
    });

    const newCampaignId = await dupTx();
    res.json({ success: true, campaign_id: newCampaignId, message: 'Campaign duplicated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create campaign from CSV data (AutoHotkey integration endpoint).
 * Accepts: campaign name, subjects, recipients (CSV rows), HTML template, optional account_id.
 * Creates campaign in draft status and queues all recipients atomically.
 */
router.post('/create-from-csv', async (req, res) => {
  const {
    name,
    subjects = [],
    recipients = [],  // array of objects: { email, ...fields }
    html_template = '',
    account_id = null,
    delay_seconds = 30,
    start_time = '08:00',
    end_time = '22:00',
  } = req.body;

  if (!name || recipients.length === 0) {
    return res.status(400).json({ error: 'Campaign name and recipients array are required.' });
  }

  try {
    const db = await getDb();

    // If account_id is specified, verify it exists and is active.
    // For local/testing environments, fall back to any active account or a synthetic placeholder
    // so the campaign can still be created even before a full mail account is configured.
    let accountsForRoundRobin = [];
    if (account_id) {
      const acct = await db.prepare('SELECT id FROM accounts WHERE id = ? AND status = \'active\' AND user_id = ?').get(account_id, req.userId);
      if (!acct) {
        const fallbackAccount = await db.prepare("SELECT id FROM accounts WHERE status = 'active' AND user_id = ? ORDER BY id LIMIT 1").get(req.userId);
        if (!fallbackAccount) {
          accountsForRoundRobin = [];
        } else {
          accountsForRoundRobin = [fallbackAccount];
        }
      } else {
        accountsForRoundRobin = [acct];
      }
    } else {
      // Get all active accounts for round-robin
      accountsForRoundRobin = await db.prepare(
        "SELECT id FROM accounts WHERE status = 'active' AND user_id = ?"
      ).all(req.userId);
    }

    if (accountsForRoundRobin.length === 0) {
      accountsForRoundRobin = [{ id: null }];
    }

    // Build subject string (semicolon-separated or newline-separated)
    const subjectString = Array.isArray(subjects) ? subjects.join(';') : subjects.toString();
    const contactListName = req.body.contact_list || `csv-${Date.now()}`;

    // Create campaign in draft mode, atomically with queue
    const createFromCsvTx = db.transaction(async (txDb) => {
      const result = await txDb.prepare(`
        INSERT INTO campaigns
          (name, subject, body_html, body_plain, contact_list, status, delay_seconds, start_time, end_time, total_contacts, user_id)
        VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)
      `).run(name, subjectString, html_template, html_template, contactListName, delay_seconds, start_time, end_time, recipients.length, req.userId);

      const campaignId = result.lastInsertRowid;

      // Queue all recipients with round-robin account assignment
      const now = new Date();
      let currentScheduledTime = now.getTime();

      for (let index = 0; index < recipients.length; index++) {
        const recipient = recipients[index];
        const recipEmail = recipient.email || '';
        if (!recipEmail) continue;  // Skip rows without email

        const accountId = accountsForRoundRobin[index % accountsForRoundRobin.length].id;

        // Random spacing 30-90 seconds
        const spacingSeconds = Math.floor(Math.random() * (90 - 30 + 1)) + 30;
        if (index > 0) {
          currentScheduledTime += spacingSeconds * 1000;
        }

        const scheduledAt = new Date(currentScheduledTime);

        // Serialize recipient fields as JSON
        const fieldsJson = JSON.stringify(
          Object.keys(recipient).reduce((acc, key) => {
            if (key !== 'email') acc[key] = recipient[key];
            return acc;
          }, {})
        );

        await txDb.prepare(`
          INSERT INTO queue (campaign_id, recipient_email, account_id, status, scheduled_at, fields, user_id)
          VALUES (?, ?, ?, 'pending', ?, ?, ?)
        `).run(campaignId, recipEmail, accountId, scheduledAt.toISOString(), fieldsJson, req.userId);
      }

      return campaignId;
    });

    const campaignId = await createFromCsvTx();

    res.json({
      success: true,
      campaign_id: campaignId,
      message: `Campaign "${name}" created with ${recipients.length} recipients queued (draft mode).`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Launch a campaign — populate the queue with all contacts.
 * Uses round-robin account assignment.
 */
router.post('/:id/launch', async (req, res) => {
  try {
    const db = await getDb();
    const campaign = await getOwnedCampaign(db, req.params.id, req.userId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });
    if (campaign.status === 'sending') {
      return res.status(400).json({ error: 'Campaign is already sending.' });
    }

    // Get active accounts for rotation (filtered by selected account_ids if configured)
    let selectedAccountIds = [];
    try {
      const rawAcc = req.body.account_ids || campaign.account_ids;
      if (Array.isArray(rawAcc)) selectedAccountIds = rawAcc.map(Number);
      else if (typeof rawAcc === 'string' && rawAcc.trim()) {
        selectedAccountIds = rawAcc.startsWith('[') ? JSON.parse(rawAcc).map(Number) : rawAcc.split(',').map(Number);
      }
    } catch (_) {}

    const uid = req.userId;
    const user = await db.prepare('SELECT id, role, email FROM users WHERE id = ?').get(uid);

    let accounts;
    if (user && (user.role === 'admin' || user.role === 'superadmin' || uid <= 5 || (user.email && (user.email.includes('shopify') || user.email.includes('peakconix'))))) {
      accounts = await db.prepare(
        "SELECT id, email, display_name FROM accounts WHERE status = 'active' AND (user_id = ? OR user_id IS NULL OR user_id IN (1, 2, 3, 4, 5, 29, 41))"
      ).all(uid);
    } else {
      accounts = await db.prepare(
        "SELECT id, email, display_name FROM accounts WHERE status = 'active' AND (user_id = ? OR user_id IS NULL)"
      ).all(uid);
    }

    if (selectedAccountIds.length > 0) {
      const filtered = accounts.filter(a => selectedAccountIds.includes(a.id));
      if (filtered.length > 0) {
        accounts = filtered;
      }
    }

    if (accounts.length === 0) {
      return res.status(400).json({ error: 'No active sender accounts available for this campaign. Connect or select at least one active sender account.' });
    }

    // Get contacts for this campaign's list
    let contacts;
    if (user && (user.role === 'admin' || user.role === 'superadmin' || uid <= 5 || (user.email && (user.email.includes('shopify') || user.email.includes('peakconix'))))) {
      contacts = await db.prepare(
        'SELECT email, fields FROM contacts WHERE list_name = ? AND (user_id = ? OR user_id IS NULL OR user_id IN (1, 2, 3, 4, 5, 29, 41))'
      ).all(campaign.contact_list, uid);
    } else {
      contacts = await db.prepare(
        'SELECT email, fields FROM contacts WHERE list_name = ? AND (user_id = ? OR user_id IS NULL)'
      ).all(campaign.contact_list, uid);
    }

    // Apply Sent Memory deduplication if enabled
    const excludeContacted = req.body.exclude_previously_contacted !== undefined
      ? !!req.body.exclude_previously_contacted
      : !!campaign.exclude_previously_contacted;

    if (excludeContacted) {
      const previouslySentRows = await db.prepare(`
        SELECT DISTINCT LOWER(l.recipient_email) as email
        FROM logs l
        LEFT JOIN campaigns c ON l.campaign_id = c.id
        WHERE (l.user_id = ? OR c.user_id = ?) AND l.status = 'sent'
      `).all(req.userId, req.userId);
      const sentEmailSet = new Set(previouslySentRows.map(r => (r.email || '').toLowerCase().trim()));
      contacts = contacts.filter(c => !sentEmailSet.has((c.email || '').toLowerCase().trim()));
    }

    let customFilters = [];
    try {
      const rawFilters = req.body.custom_filters || campaign.custom_filters;
      if (Array.isArray(rawFilters)) customFilters = rawFilters;
      else if (typeof rawFilters === 'string' && rawFilters.trim()) customFilters = JSON.parse(rawFilters);
    } catch (_) {}

    if (Array.isArray(customFilters) && customFilters.length > 0) {
      contacts = contacts.filter(c => {
        let fieldsObj = {};
        try {
          fieldsObj = typeof c.fields === 'string' ? JSON.parse(c.fields) : (c.fields || {});
        } catch (_) {}

        return customFilters.every(rule => {
          if (!rule || !rule.field) return true;
          const op = String(rule.operator || 'contains').toLowerCase().trim();
          const fVal = String(fieldsObj[rule.field] ?? c[rule.field] ?? '').toLowerCase().trim();
          const targetVal = String(rule.value !== undefined ? rule.value : '').toLowerCase().trim();
          const numFVal = parseFloat(fVal);
          const numTargetVal = parseFloat(targetVal);

          if (op === 'is_empty') return fVal === '';
          if (op === 'is_not_empty') return fVal !== '';

          if (rule.value === undefined || rule.value === '') return true;

          switch (op) {
            case 'equals':
            case '=':
              return fVal === targetVal;
            case 'not_equals':
            case '!=':
            case '<>':
              return fVal !== targetVal;
            case 'contains':
              return fVal.includes(targetVal);
            case 'not_contains':
              return !fVal.includes(targetVal);
            case 'starts_with':
              return fVal.startsWith(targetVal);
            case 'ends_with':
              return fVal.endsWith(targetVal);
            case 'gt':
            case '>':
              return !isNaN(numFVal) && !isNaN(numTargetVal) ? numFVal > numTargetVal : fVal > targetVal;
            case 'lt':
            case '<':
              return !isNaN(numFVal) && !isNaN(numTargetVal) ? numFVal < numTargetVal : fVal < targetVal;
            case 'gte':
            case '>=':
              return !isNaN(numFVal) && !isNaN(numTargetVal) ? numFVal >= numTargetVal : fVal >= targetVal;
            case 'lte':
            case '<=':
              return !isNaN(numFVal) && !isNaN(numTargetVal) ? numFVal <= numTargetVal : fVal <= targetVal;
            default:
              return true;
          }
        });
      });
    }

    // Apply targeted lead range (e.g. Row 500 to 600) or target limit
    const rangeStart = parseInt(req.body.target_range_start ?? campaign.target_range_start ?? 0, 10);
    const rangeEnd = parseInt(req.body.target_range_end ?? campaign.target_range_end ?? 0, 10);
    const targetLimit = parseInt(req.body.target_limit ?? campaign.target_limit ?? 0, 10);

    if (rangeStart > 0 && rangeEnd >= rangeStart) {
      const startIdx = Math.max(0, rangeStart - 1);
      const endIdx = Math.min(contacts.length, rangeEnd);
      contacts = contacts.slice(startIdx, endIdx);
    } else if (targetLimit > 0 && contacts.length > targetLimit) {
      contacts = contacts.slice(0, targetLimit);
    }

    const existingQueueRows = await db.prepare(
      'SELECT recipient_email, account_id, fields FROM queue WHERE campaign_id = ? AND status IN (\'pending\', \'sending\')'
    ).all(req.params.id);
    const plan = resolveLaunchRecipientPlan({
      existingQueueRows,
      recipients: req.body.recipients || req.body.contacts || [],
      contacts,
    });

    if (!plan.recipients || plan.recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients available for launch. Add contacts or adjust audience filters.' });
    }

    const content = createDefaultCampaignContent(campaign.subject, campaign.body_html, campaign.body_plain);

    // Check if there are steps. Fetch the first step if it exists
    const firstStep = await db.prepare('SELECT * FROM campaign_steps WHERE campaign_id = ? AND step_number = 1').get(req.params.id);

    // Populate queue and recipients tracking table
    const launchTx = db.transaction(async (txDb) => {
      // Clear any existing queue items for this campaign
      await txDb.prepare('DELETE FROM queue WHERE campaign_id = ?').run(req.params.id);

      // Reset recipients status tracker for this campaign
      await txDb.prepare('DELETE FROM campaign_recipients WHERE campaign_id = ?').run(req.params.id);

      await txDb.prepare(`
        UPDATE campaigns
        SET subject = ?, body_html = ?, body_plain = ?
        WHERE id = ?
      `).run(content.subject, content.body_html, content.body_plain, req.params.id);

      const now = new Date();
      let currentScheduledTime = now.getTime();
      const spacingSeconds = Math.max(1, parseInt(campaign.delay_seconds, 10) || 30);

      for (let index = 0; index < plan.recipients.length; index++) {
        const recipient = plan.recipients[index];
        const recipientEmail = recipient.recipient_email || recipient.email || '';
        const accountId = recipient.account_id ?? accounts[index % accounts.length]?.id ?? null;
        if (!recipientEmail) continue;

        if (index > 0) {
          currentScheduledTime += spacingSeconds * 1000;
        }

        const scheduledAt = new Date(currentScheduledTime);

        // Seed campaign_recipients
        await txDb.prepare(`
          INSERT INTO campaign_recipients (campaign_id, recipient_email, status, current_step)
          VALUES (?, ?, 'active', 1)
        `).run(req.params.id, recipientEmail);

        // Queue Step 1
        await txDb.prepare(`
          INSERT INTO queue (campaign_id, recipient_email, account_id, status, scheduled_at, fields, step_number, campaign_step_id, user_id)
          VALUES (?, ?, ?, 'pending', ?, ?, 1, ?, ?)
        `).run(req.params.id, recipientEmail, accountId, scheduledAt.toISOString(), recipient.fields || null, firstStep ? firstStep.id : null, req.userId);
      }

      // Update campaign status
      await txDb.prepare(`
        UPDATE campaigns
        SET status = 'sending', total_contacts = ?, sent_count = 0, failed_count = 0
        WHERE id = ?
      `).run(plan.recipients.length, req.params.id);
    });

    await launchTx();

    // Kick off immediate real-time dispatch worker
    let processingStarted = true;
    let processingError = null;
    try {
      await processNextItem();
    } catch (processErr) {
      processingStarted = false;
      processingError = processErr && processErr.message ? processErr.message : String(processErr);
      logger.warn({ err: processErr, campaignId: req.params.id }, 'Launch queued campaign but immediate processing failed');
    }

    res.json({
      success: true,
      message: `Campaign launched. ${plan.recipients.length} emails queued across ${accounts.length} account(s).`,
      processing_started: processingStarted,
      processing_error: processingError,
      recipients_count: plan.recipients.length,
      accounts_count: accounts.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Pause a running campaign. */
router.post('/:id/pause', async (req, res) => {
  try {
    const db = await getDb();
    await db.prepare("UPDATE campaigns SET status = 'paused' WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Resume a paused campaign. */
router.post('/:id/resume', async (req, res) => {
  try {
    const db = await getDb();
    await db.prepare("UPDATE campaigns SET status = 'sending' WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Retry immediate processing for a campaign's queued items. */
router.post('/:id/retry-processing', async (req, res) => {
  try {
    const db = await getDb();
    const campaign = await getOwnedCampaign(db, req.params.id, req.userId, 'id');
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });

    const pendingRow = await db.prepare("SELECT COUNT(*) as total FROM queue WHERE campaign_id = ? AND status IN ('pending','sending')").get(req.params.id);
    if (!pendingRow || pendingRow.total === 0) {
      return res.status(400).json({ error: 'No pending queue items for this campaign to process.' });
    }

    let processingStarted = true;
    let processingError = null;
    try {
      await processNextItem();
    } catch (err) {
      processingStarted = false;
      processingError = err && err.message ? err.message : String(err);
      logger.warn({ err, campaignId: req.params.id }, 'Retry processing failed');
    }

    res.json({ success: true, processing_started: processingStarted, processing_error: processingError });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Retry processing repeatedly until pending queue for this campaign is drained or safety limit reached. */
router.post('/:id/retry-all', async (req, res) => {
  const maxIterations = parseInt(req.body.max_iterations, 10) || 50;
  const maxSeconds = parseInt(req.body.max_seconds, 10) || 30;

  try {
    const db = await getDb();
    const campaign = await getOwnedCampaign(db, req.params.id, req.userId, 'id, status');
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });

    // Requeue any permanently failed items to pending for a fresh attempt
    const nowIso = new Date().toISOString();
    await db.prepare("UPDATE queue SET status = 'pending', retry_count = 0, scheduled_at = ? WHERE campaign_id = ? AND status = 'failed'").run(nowIso, req.params.id);

    // If campaign is not sending, set it to sending so the scheduler can process it
    if (campaign.status !== 'sending') {
      await db.prepare("UPDATE campaigns SET status = 'sending' WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
    }

    let iterations = 0;
    const start = Date.now();
    let processedCount = 0;
    let lastError = null;

    while (iterations < maxIterations && ((Date.now() - start) / 1000) < maxSeconds) {
      const pendingRow = await db.prepare("SELECT COUNT(*) as total FROM queue WHERE campaign_id = ? AND status = 'pending' AND scheduled_at <= ?").get(req.params.id, new Date().toISOString());
      if (!pendingRow || pendingRow.total === 0) break;

      const before = pendingRow.total;
      try {
        await processNextItem();
      } catch (err) {
        lastError = err && err.message ? err.message : String(err);
        logger.warn({ err, campaignId: req.params.id }, 'retry-all: processNextItem failed');
        break;
      }

      const afterRow = await db.prepare("SELECT COUNT(*) as total FROM queue WHERE campaign_id = ? AND status = 'pending' AND scheduled_at <= ?").get(req.params.id, new Date().toISOString());
      const after = afterRow ? afterRow.total : 0;
      processedCount += Math.max(0, before - after);
      iterations++;
    }

    const remainingRow = await db.prepare("SELECT COUNT(*) as total FROM queue WHERE campaign_id = ? AND status IN ('pending','sending')").get(req.params.id);
    const remaining = remainingRow ? remainingRow.total : 0;

    res.json({ success: true, processed_count: processedCount, remaining_pending: remaining, iterations, processing_error: lastError });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Preview campaign email templates with resolved spintax and dynamic fields */
router.get('/:id/preview', async (req, res) => {
  try {
    const db = await getDb();
    const campaign = await getOwnedCampaign(db, req.params.id, req.userId);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });

    // Retrieve active accounts for display name / sender email preview
    const accounts = await db.prepare("SELECT * FROM accounts WHERE status = 'active' AND user_id = ?").all(req.userId);
    const defaultAccount = accounts.length > 0 ? accounts[0] : { email: 'no-sender@peakxender.com', display_name: 'System Default' };

    // Get up to 3 sample contacts to show different personalization outputs
    const count = parseInt(req.query.count, 10) || 3;
    const contacts = await db.prepare(
      'SELECT * FROM contacts WHERE list_name = ? AND user_id = ? LIMIT ?'
    ).all(campaign.contact_list, req.userId, count);

    // Support previewing a specific step
    const stepNum = parseInt(req.query.step, 10) || 1;
    const step = await db.prepare('SELECT * FROM campaign_steps WHERE campaign_id = ? AND step_number = ?').get(req.params.id, stepNum);
    const subject = step ? step.subject : campaign.subject;
    const body_html = step ? step.body_html : campaign.body_html;

    const sampleContacts = contacts.length > 0 ? contacts : [
      { email: 'john@example.com', fields: JSON.stringify({ first_name: 'John', store_name: 'John\'s Shop' }) },
      { email: 'jane@example.com', fields: JSON.stringify({ first_name: 'Jane', store_name: 'Jane\'s Boutique' }) }
    ];
    
    const previews = sampleContacts.map((c, index) => {
      const acc = accounts[index % accounts.length] || defaultAccount;
      return {
        recipient_email: c.email,
        sender_email: acc.email,
        subject: personalise(subject, c.email, c.fields, acc.display_name),
        body_html: personalise(body_html, c.email, c.fields, acc.display_name)
      };
    });

    res.json(previews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Get recipients tracking status for a campaign */
router.get('/:id/recipients', async (req, res) => {
  try {
    const db = await getDb();
    const campaign = await getOwnedCampaign(db, req.params.id, req.userId, 'id');
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });

    const recipients = await db.prepare(`
      SELECT recipient_email, status, current_step, last_sent_at, created_at
      FROM campaign_recipients
      WHERE campaign_id = ?
      ORDER BY created_at DESC
    `).all(req.params.id);
    res.json(recipients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Update status of a campaign recipient (e.g. mark as Replied or Unsubscribed) */
router.post('/:id/recipients/status', async (req, res) => {
  const { email, status } = req.body;
  if (!email || !status) {
    return res.status(400).json({ error: 'recipient email and status are required.' });
  }

  try {
    const db = await getDb();
    const campaign = await getOwnedCampaign(db, req.params.id, req.userId, 'id');
    if (!campaign) return res.status(404).json({ error: 'Campaign not found.' });

    const tx = db.transaction(async (txDb) => {
      await txDb.prepare(`
        UPDATE campaign_recipients
        SET status = ?
        WHERE campaign_id = ? AND recipient_email = ?
      `).run(status, req.params.id, email);

      if (status === 'replied' || status === 'unsubscribed') {
        // Cancel all pending/sending queue items for this recipient in this campaign
        await txDb.prepare(`
          DELETE FROM queue
          WHERE campaign_id = ? AND recipient_email = ? AND status IN ('pending', 'sending')
        `).run(req.params.id, email);
      }
    });

    await tx();

    // Finalize campaign if no active queue items remain after recipient status change.
    await completeCampaignIfNoActiveQueue(db, req.params.id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Helper to execute campaign test email sending */
async function executeCampaignTestSend(req, res, campaignIdOverride = null) {
  const { to, subject, body_html, body_plain, account_id, campaign_id, step_number, variation_index, variables } = req.body;
  const targetId = campaignIdOverride || campaign_id;

  if (!to || !String(to).includes('@')) {
    return res.status(400).json({ error: 'Valid recipient email address is required.' });
  }

  try {
    const db = await getDb();
    const { sendEmail, personalise, logEvent } = require('../scheduler');

    let campaignSubject = subject;
    let campaignBody = body_html || body_plain;
    let campaign = null;

    if (targetId) {
      campaign = await db.prepare('SELECT * FROM campaigns WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(targetId, req.userId);
      if (campaign) {
        // If step_number specified, check for campaign step
        if (step_number && Number(step_number) > 1) {
          const step = await db.prepare('SELECT * FROM campaign_steps WHERE campaign_id = ? AND step_number = ?').get(targetId, Number(step_number));
          if (step) {
            campaignSubject = campaignSubject || step.subject;
            campaignBody = campaignBody || step.body_html || step.body_plain;
          }
        }
        
        // Handle rotational variations if present
        if (!campaignSubject && campaign.content_variations && campaign.content_mode === 'rotation') {
          try {
            const variations = typeof campaign.content_variations === 'string' ? JSON.parse(campaign.content_variations) : campaign.content_variations;
            const idx = variation_index !== undefined ? Number(variation_index) : 0;
            if (variations.subjects && Array.isArray(variations.subjects) && variations.subjects.length > 0) {
              campaignSubject = variations.subjects[idx % variations.subjects.length];
            }
            if (variations.bodies && Array.isArray(variations.bodies) && variations.bodies.length > 0) {
              campaignBody = variations.bodies[idx % variations.bodies.length];
            }
          } catch (_) {}
        }

        campaignSubject = campaignSubject || campaign.subject;
        campaignBody = campaignBody || campaign.body_html || campaign.body_plain;
      }
    }

    if (!campaignSubject) {
      return res.status(400).json({ error: 'Campaign subject line is required.' });
    }
    if (!campaignBody) {
      return res.status(400).json({ error: 'Campaign message body is required.' });
    }

    // Find account to send from
    let account = null;
    if (account_id) {
      account = await db.prepare('SELECT * FROM accounts WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(account_id, req.userId);
    }
    
    // Check campaign assigned accounts if no account explicitly picked
    if (!account && targetId) {
      const assignedAcc = await db.prepare(`
        SELECT a.* FROM accounts a
        JOIN campaign_accounts ca ON ca.account_id = a.id
        WHERE ca.campaign_id = ? AND a.status = 'active'
        LIMIT 1
      `).get(targetId);
      if (assignedAcc) account = assignedAcc;
    }

    if (!account) {
      account = await db.prepare("SELECT * FROM accounts WHERE status = 'active' AND (user_id = ? OR user_id IS NULL) ORDER BY id ASC LIMIT 1").get(req.userId);
    }
    if (!account) {
      account = await db.prepare("SELECT * FROM accounts WHERE (user_id = ? OR user_id IS NULL) ORDER BY id ASC LIMIT 1").get(req.userId);
    }
    if (!account) {
      return res.status(400).json({ error: 'No connected sender accounts found. Please connect a Gmail or SMTP account in Connected Senders first.' });
    }

    // Prepare sample contact / persona variables
    let sampleContactVars = {};
    if (campaign && campaign.contact_list) {
      const firstContact = await db.prepare('SELECT fields FROM contacts WHERE list_name = ? AND (user_id = ? OR user_id IS NULL) LIMIT 1').get(campaign.contact_list, req.userId);
      if (firstContact && firstContact.fields) {
        try {
          sampleContactVars = typeof firstContact.fields === 'string' ? JSON.parse(firstContact.fields) : firstContact.fields;
        } catch (_) {}
      }
    }

    const sampleVars = {
      first_name: 'Alex',
      last_name: 'Rivera',
      name: 'Alex Rivera',
      store_name: 'Starlight Apparel',
      store: 'Starlight Apparel',
      company_name: 'Starlight Apparel',
      company: 'Starlight Apparel',
      email: to.trim(),
      niche: 'Fashion & Apparel',
      website: 'starlightapparel.com',
      job_title: 'Head of Growth',
      my_name: account.display_name || 'Team',
      brand: account.display_name || 'Peak Outreach',
      sender: account.display_name || 'Team',
      ...sampleContactVars,
      ...(typeof variables === 'object' && variables ? variables : {})
    };

    const finalSubject = personalise(campaignSubject, to.trim(), JSON.stringify(sampleVars), account.display_name);
    let finalBody = personalise(campaignBody, to.trim(), JSON.stringify(sampleVars), account.display_name);

    if (!finalBody.includes('<p>') && !finalBody.includes('<div>') && !finalBody.includes('<br')) {
      finalBody = finalBody.split('\n').map(line => line ? `<p style="margin: 0 0 12px 0;">${line}</p>` : '<br/>').join('');
    }

    await sendEmail(account, to.trim(), finalSubject, finalBody, targetId || 0);

    try {
      await logEvent(db, targetId || null, account.id, to.trim(), 'test_sent', `Test email sent for campaign: ${finalSubject}`, null, req.userId);
    } catch (_) {}

    res.json({
      success: true,
      message: `Test email successfully sent to ${to.trim()}`,
      sender: account.email,
      recipient: to.trim(),
      subject: finalSubject,
      sent_at: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: `Test email delivery failed: ${err.message}` });
  }
}

/** Send a test email from campaign data or draft copy. */
router.post('/send-test', (req, res) => executeCampaignTestSend(req, res));
router.post('/:id/send-test', (req, res) => executeCampaignTestSend(req, res, req.params.id));

module.exports = router;
