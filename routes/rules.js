/**
 * routes/rules.js — Campaign automation rules and workflow management.
 *
 * Endpoints:
 *   GET    /api/rules           → List all rules for current user
 *   POST   /api/rules           → Create new rule
 *   GET    /api/rules/:id       → Get single rule
 *   PUT    /api/rules/:id       → Update rule
 *   DELETE /api/rules/:id       → Delete rule
 *   POST   /api/rules/:id/toggle → Enable/disable rule
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const logger = require('../logger');

/**
 * List all rules for current user.
 */
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const uid = req.userId;
    const workspace_id = req.workspaceId;

    const rules = await db.prepare(`
      SELECT id, name, trigger_type, trigger_condition, action_type, action_target, enabled, priority, created_at, user_id, workspace_id
      FROM campaign_rules
      WHERE user_id = ? AND (workspace_id = ? OR workspace_id IS NULL)
      ORDER BY priority ASC, created_at DESC
    `).all(uid, workspace_id);

    res.json(rules || []);
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to list rules');
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create new rule.
 */
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const uid = req.userId;
    const workspace_id = req.workspaceId;
    const { name, trigger_type, trigger_condition, action_type, action_target, priority } = req.body;

    if (!name || !trigger_type || !action_type) {
      return res.status(400).json({ error: 'name, trigger_type, and action_type are required.' });
    }

    const result = await db.prepare(`
      INSERT INTO campaign_rules (name, trigger_type, trigger_condition, action_type, action_target, priority, user_id, workspace_id, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      name,
      trigger_type,
      trigger_condition || null,
      action_type,
      action_target || null,
      priority || 0,
      uid,
      workspace_id
    );

    const newRule = await db.prepare('SELECT * FROM campaign_rules WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, rule: newRule });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to create rule');
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get single rule.
 */
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const uid = req.userId;
    const workspace_id = req.workspaceId;
    const rule_id = req.params.id;

    const rule = await db.prepare(`
      SELECT * FROM campaign_rules
      WHERE id = ? AND user_id = ? AND (workspace_id = ? OR workspace_id IS NULL)
    `).get(rule_id, uid, workspace_id);

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found.' });
    }

    res.json(rule);
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to get rule');
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update rule.
 */
router.put('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const uid = req.userId;
    const workspace_id = req.workspaceId;
    const rule_id = req.params.id;
    const { name, trigger_type, trigger_condition, action_type, action_target, priority } = req.body;

    const existing = await db.prepare(`
      SELECT id FROM campaign_rules
      WHERE id = ? AND user_id = ? AND (workspace_id = ? OR workspace_id IS NULL)
    `).get(rule_id, uid, workspace_id);

    if (!existing) {
      return res.status(404).json({ error: 'Rule not found.' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (trigger_type !== undefined) {
      updates.push('trigger_type = ?');
      values.push(trigger_type);
    }
    if (trigger_condition !== undefined) {
      updates.push('trigger_condition = ?');
      values.push(trigger_condition);
    }
    if (action_type !== undefined) {
      updates.push('action_type = ?');
      values.push(action_type);
    }
    if (action_target !== undefined) {
      updates.push('action_target = ?');
      values.push(action_target);
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      values.push(priority);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    values.push(rule_id);
    await db.prepare(`UPDATE campaign_rules SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = await db.prepare('SELECT * FROM campaign_rules WHERE id = ?').get(rule_id);
    res.json({ success: true, rule: updated });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to update rule');
    res.status(500).json({ error: err.message });
  }
});

/**
 * Delete rule.
 */
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const uid = req.userId;
    const workspace_id = req.workspaceId;
    const rule_id = req.params.id;

    const existing = await db.prepare(`
      SELECT id FROM campaign_rules
      WHERE id = ? AND user_id = ? AND (workspace_id = ? OR workspace_id IS NULL)
    `).get(rule_id, uid, workspace_id);

    if (!existing) {
      return res.status(404).json({ error: 'Rule not found.' });
    }

    await db.prepare('DELETE FROM campaign_rules WHERE id = ?').run(rule_id);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to delete rule');
    res.status(500).json({ error: err.message });
  }
});

/**
 * Toggle rule enabled/disabled status.
 */
router.post('/:id/toggle', async (req, res) => {
  try {
    const db = await getDb();
    const uid = req.userId;
    const workspace_id = req.workspaceId;
    const rule_id = req.params.id;

    const rule = await db.prepare(`
      SELECT enabled FROM campaign_rules
      WHERE id = ? AND user_id = ? AND (workspace_id = ? OR workspace_id IS NULL)
    `).get(rule_id, uid, workspace_id);

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found.' });
    }

    const newState = rule.enabled ? 0 : 1;
    await db.prepare('UPDATE campaign_rules SET enabled = ? WHERE id = ?').run(newState, rule_id);

    const updated = await db.prepare('SELECT * FROM campaign_rules WHERE id = ?').get(rule_id);
    res.json({ success: true, rule: updated });
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to toggle rule');
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
