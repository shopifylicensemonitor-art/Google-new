/**
 * routes/templates.js — Email template CRUD.
 *
 * Endpoints:
 *   GET    /api/templates      → List all templates
 *   GET    /api/templates/:id  → Get single template
 *   POST   /api/templates      → Create template
 *   PUT    /api/templates/:id  → Update template
 *   DELETE /api/templates/:id  → Delete template
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

/** List the current user's templates. */
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const templates = await db
      .prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY created_at DESC')
      .all(req.userId);
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Get single template. */
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const template = await db
      .prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId);
    if (!template) return res.status(404).json({ error: 'Not found.' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Create a template. */
router.post('/', async (req, res) => {
  const { name, subject, body_html, body_plain } = req.body;
  if (!name || !subject) {
    return res.status(400).json({ error: 'name and subject are required.' });
  }

  try {
    const db = await getDb();
    const result = await db.prepare(`
      INSERT INTO templates (name, subject, body_html, body_plain, user_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, subject, body_html || '', body_plain || '', req.userId);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Update a template. */
router.put('/:id', async (req, res) => {
  const { name, subject, body_html, body_plain } = req.body;
  try {
    const db = await getDb();
    const result = await db.prepare(`
      UPDATE templates SET name = ?, subject = ?, body_html = ?, body_plain = ?
      WHERE id = ? AND user_id = ?
    `).run(name, subject, body_html || '', body_plain || '', req.params.id, req.userId);
    if (!result.changes) return res.status(404).json({ error: 'Not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Delete a template. */
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db
      .prepare('DELETE FROM templates WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.userId);
    if (!result.changes) return res.status(404).json({ error: 'Not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Helper to execute template test email sending */
async function executeTemplateTestSend(req, res, templateIdOverride = null) {
  const { to, subject, body_html, body_plain, account_id, template_id, variables } = req.body;
  const targetId = templateIdOverride || template_id;

  if (!to || !String(to).includes('@')) {
    return res.status(400).json({ error: 'Valid recipient email address is required.' });
  }

  try {
    const db = await getDb();
    const logger = require('../logger');
    const { sendEmail, personalise, logEvent } = require('../scheduler');

    let templateSubject = subject;
    let templateBody = body_html || body_plain;

    if (targetId) {
      const t = await db.prepare('SELECT * FROM templates WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(targetId, req.userId);
      if (t) {
        templateSubject = templateSubject || t.subject;
        templateBody = templateBody || t.body_html || t.body_plain;
      }
    }

    if (!templateSubject) {
      return res.status(400).json({ error: 'Email subject is required.' });
    }
    if (!templateBody) {
      return res.status(400).json({ error: 'Email body content is required.' });
    }

    // Find active account
    let account = null;
    if (account_id) {
      account = await db.prepare('SELECT * FROM accounts WHERE id = ? AND (user_id = ? OR user_id IS NULL)').get(account_id, req.userId);
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

    // Merge sample persona variables
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
      ...(typeof variables === 'object' && variables ? variables : {})
    };

    const finalSubject = personalise(templateSubject, to.trim(), JSON.stringify(sampleVars), account.display_name);
    let finalBody = personalise(templateBody, to.trim(), JSON.stringify(sampleVars), account.display_name);

    if (!finalBody.includes('<p>') && !finalBody.includes('<div>') && !finalBody.includes('<br')) {
      finalBody = finalBody.split('\n').map(line => line ? `<p style="margin: 0 0 12px 0;">${line}</p>` : '<br/>').join('');
    }

    await sendEmail(account, to.trim(), finalSubject, finalBody, 0);

    try {
      await logEvent(db, null, account.id, to.trim(), 'test_sent', `Test email sent from template: ${finalSubject}`, null, req.userId);
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

/** Send a test email from template data or draft copy. */
router.post('/send-test', (req, res) => executeTemplateTestSend(req, res));
router.post('/:id/send-test', (req, res) => executeTemplateTestSend(req, res, req.params.id));

module.exports = router;
