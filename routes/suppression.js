/**
 * routes/suppression.js — Master Suppression & Do-Not-Contact (DNC) List.
 *
 * Exposes:
 *   GET    /api/suppression        → List suppressed emails/domains
 *   POST   /api/suppression        → Add a single email or domain to blocklist
 *   POST   /api/suppression/bulk   → Bulk import emails/domains (array or text)
 *   DELETE /api/suppression/:id    → Delete an entry from blocklist
 *   GET    /api/suppression/stats  → Summary statistics
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const logger = require('../logger');

/** List all suppressed items. */
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const uid = req.userId;
    const { q, type } = req.query;

    let sql = 'SELECT * FROM suppression_list WHERE 1=1';
    const params = [];

    if (uid) {
      sql += ' AND (user_id = ? OR user_id IS NULL)';
      params.push(uid);
    }

    if (type && (type === 'email' || type === 'domain')) {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (q) {
      sql += ' AND (LOWER(value) LIKE ? OR LOWER(reason) LIKE ?)';
      params.push(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`);
    }

    sql += ' ORDER BY id DESC LIMIT 500';

    const items = await db.prepare(sql).all(...params);
    res.json({ items });
  } catch (err) {
    logger.error({ err }, 'Error listing suppression items');
    res.status(500).json({ error: err.message });
  }
});

/** Summary stats for suppression list. */
router.get('/stats', async (req, res) => {
  try {
    const db = await getDb();
    const uid = req.userId;

    let sqlEmails = "SELECT COUNT(*) as count FROM suppression_list WHERE type = 'email'";
    let sqlDomains = "SELECT COUNT(*) as count FROM suppression_list WHERE type = 'domain'";
    const params = [];

    if (uid) {
      sqlEmails += ' AND (user_id = ? OR user_id IS NULL)';
      sqlDomains += ' AND (user_id = ? OR user_id IS NULL)';
      params.push(uid);
    }

    const emailRow = await db.prepare(sqlEmails).get(...params);
    const domainRow = await db.prepare(sqlDomains).get(...params);

    const emails = emailRow ? emailRow.count : 0;
    const domains = domainRow ? domainRow.count : 0;

    res.json({
      total: emails + domains,
      emails,
      domains
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Add single suppression entry. */
router.get('/add', async (req, res) => {
  res.status(405).json({ error: 'Use POST to add entries to suppression list' });
});

router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const uid = req.userId || null;
    let { value, type, reason } = req.body;

    if (!value || typeof value !== 'string') {
      return res.status(400).json({ error: 'Value is required (email or domain).' });
    }

    value = value.trim().toLowerCase();
    reason = reason ? reason.trim() : 'manual_block';

    if (!type) {
      type = value.includes('@') ? 'email' : 'domain';
    }

    if (type === 'email') {
      // Basic email validation
      if (!value.includes('.') || value.length < 5) {
        return res.status(400).json({ error: 'Invalid email address format.' });
      }
    } else {
      // Domain cleanup
      value = value.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
    }

    try {
      await db.prepare(`
        INSERT INTO suppression_list (type, value, reason, user_id)
        VALUES (?, ?, ?, ?)
      `).run(type, value, reason, uid);
    } catch (insertErr) {
      if (insertErr.message && insertErr.message.includes('UNIQUE')) {
        return res.status(409).json({ error: `${value} is already in the suppression list.` });
      }
      throw insertErr;
    }

    // Cancel any pending queue items for this email or domain in user's campaigns
    if (type === 'email') {
      await db.prepare("UPDATE queue SET status = 'cancelled', error = 'Suppressed by master blocklist' WHERE LOWER(recipient_email) = ? AND status = 'pending' AND campaign_id IN (SELECT id FROM campaigns WHERE user_id = ?)").run(value, uid);
    } else {
      await db.prepare("UPDATE queue SET status = 'cancelled', error = 'Suppressed by domain blocklist' WHERE LOWER(recipient_email) LIKE ? AND status = 'pending' AND campaign_id IN (SELECT id FROM campaigns WHERE user_id = ?)").run(`%@${value}`, uid);
    }

    res.status(201).json({ success: true, message: `Added ${value} to ${type} suppression list.`, type, value, reason });
  } catch (err) {
    logger.error({ err }, 'Error adding to suppression list');
    res.status(500).json({ error: err.message });
  }
});

/** Bulk import suppression entries. */
router.post('/bulk', async (req, res) => {
  try {
    const db = await getDb();
    const uid = req.userId || null;
    const { entries, defaultReason } = req.body;

    if (!entries) {
      return res.status(400).json({ error: 'Entries parameter is required (array or text).' });
    }

    let list = [];
    if (Array.isArray(entries)) {
      list = entries;
    } else if (typeof entries === 'string') {
      list = entries.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    }

    if (list.length === 0) {
      return res.status(400).json({ error: 'No valid entries found to import.' });
    }

    let addedCount = 0;
    let skippedCount = 0;
    const reason = defaultReason || 'bulk_import';

    for (let item of list) {
      if (typeof item !== 'string') continue;
      item = item.trim().toLowerCase();
      if (!item) continue;

      const type = item.includes('@') ? 'email' : 'domain';
      let cleanVal = item;

      if (type === 'domain') {
        cleanVal = item.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
      }

      if (!cleanVal) continue;

      try {
        await db.prepare(`
          INSERT INTO suppression_list (type, value, reason, user_id)
          VALUES (?, ?, ?, ?)
        `).run(type, cleanVal, reason, uid);
        addedCount++;

        if (type === 'email') {
          await db.prepare("UPDATE queue SET status = 'cancelled', error = 'Suppressed by master blocklist' WHERE LOWER(recipient_email) = ? AND status = 'pending' AND campaign_id IN (SELECT id FROM campaigns WHERE user_id = ?)").run(cleanVal, uid);
        } else {
          await db.prepare("UPDATE queue SET status = 'cancelled', error = 'Suppressed by domain blocklist' WHERE LOWER(recipient_email) LIKE ? AND status = 'pending' AND campaign_id IN (SELECT id FROM campaigns WHERE user_id = ?)").run(`%@${cleanVal}`, uid);
        }
      } catch (_) {
        skippedCount++;
      }
    }

    res.json({
      success: true,
      message: `Processed ${list.length} entries. Added: ${addedCount}, Skipped (duplicates): ${skippedCount}.`,
      addedCount,
      skippedCount
    });
  } catch (err) {
    logger.error({ err }, 'Error bulk importing suppression list');
    res.status(500).json({ error: err.message });
  }
});

/** Delete a suppression entry. */
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const uid = req.userId;

    const result = await db.prepare('DELETE FROM suppression_list WHERE id = ? AND (user_id = ? OR user_id IS NULL)').run(id, uid);
    if (!result.changes) return res.status(404).json({ error: 'Suppression entry not found or unauthorized.' });
    res.json({ success: true, message: 'Removed from suppression list.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
