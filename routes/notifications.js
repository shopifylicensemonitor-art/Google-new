/**
 * routes/notifications.js — In-App Notifications API
 *
 * Endpoints:
 *   GET    /api/notifications           → List notifications for current user
 *   POST   /api/notifications           → Create a notification
 *   POST   /api/notifications/:id/read  → Mark a notification as read
 *   POST   /api/notifications/read-all  → Mark all as read
 *   DELETE /api/notifications/:id       → Delete/dismiss a notification
 *   DELETE /api/notifications/clear-all → Delete all notifications for user
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const logger = require('../logger');

/** List notifications for the authenticated user. */
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const uid = req.userId;

    const items = await db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(uid, limit);

    const countRow = await db.prepare(`
      SELECT COUNT(*) as unread
      FROM notifications
      WHERE user_id = ? AND is_read = 0
    `).get(uid);

    res.json({
      items: items || [],
      unread_count: countRow ? Number(countRow.unread) : 0,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch notifications');
    res.status(500).json({ error: err.message });
  }
});

/** Create a notification for the current user. */
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const { title, message, type = 'info' } = req.body;
    const uid = req.userId;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    const result = await db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
      VALUES (?, ?, ?, ?, 0, datetime('now'))
    `).run(uid, type, title, message);

    res.status(201).json({
      success: true,
      id: result.lastInsertRowid,
      message: 'Notification created.',
    });
  } catch (err) {
    logger.error({ err }, 'Failed to create notification');
    res.status(500).json({ error: err.message });
  }
});

/** Mark a single notification as read. */
router.post('/:id/read', async (req, res) => {
  try {
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    const uid = req.userId;

    const result = await db.prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE id = ? AND user_id = ?
    `).run(id, uid);

    if (!result.changes) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Mark all notifications as read for current user. */
router.post('/read-all', async (req, res) => {
  try {
    const db = await getDb();
    const uid = req.userId;

    await db.prepare(`
      UPDATE notifications
      SET is_read = 1
      WHERE user_id = ? AND is_read = 0
    `).run(uid);

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Delete / dismiss a notification. */
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const id = parseInt(req.params.id, 10);
    const uid = req.userId;

    const result = await db.prepare(`
      DELETE FROM notifications
      WHERE id = ? AND user_id = ?
    `).run(id, uid);

    if (!result.changes) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    res.json({ success: true, message: 'Notification dismissed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Clear all notifications for the current user. */
router.delete('/clear-all', async (req, res) => {
  try {
    const db = await getDb();
    const uid = req.userId;

    await db.prepare(`
      DELETE FROM notifications
      WHERE user_id = ?
    `).run(uid);

    res.json({ success: true, message: 'All notifications cleared.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
