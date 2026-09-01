const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { ensureUserWorkspace } = require('../middleware/workspace');

router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.prepare(`
      SELECT w.id, w.name, w.created_at, wm.role
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE wm.user_id = ?
      ORDER BY w.created_at ASC, w.id ASC
    `).all(req.userId || req.user?.id);
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/default', async (req, res) => {
  try {
    const db = await getDb();
    const workspace = await ensureUserWorkspace(db, req.userId || req.user?.id, req.user?.name ? `${req.user.name}'s Workspace` : 'My Workspace');
    res.json(workspace || { id: null, name: 'Personal Workspace' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const name = String(req.body?.name || 'My Workspace').trim() || 'My Workspace';
    const result = await db.prepare('INSERT INTO workspaces (name) VALUES (?)').run(name);
    const workspaceId = result && result.lastInsertRowid ? result.lastInsertRowid : null;
    if (!workspaceId) {
      return res.status(500).json({ error: 'Workspace creation failed.' });
    }

    await db.prepare('INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)')
      .run(workspaceId, req.userId || req.user?.id, 'admin');

    res.status(201).json({ id: workspaceId, name, role: 'admin' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { name, default_layout, default_role } = req.body || {};
    const safeName = String(name || '').trim();
    const updates = [];
    const params = [];

    if (safeName) {
      updates.push('name = ?');
      params.push(safeName);
    }
    if (default_layout) {
      updates.push('default_layout = ?');
      params.push(default_layout);
    }
    if (default_role) {
      updates.push('default_role = ?');
      params.push(default_role);
    }

    if (updates.length === 0) {
      return res.json({ success: true });
    }

    params.push(Number(req.params.id));
    await db.prepare(`UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/members', async (req, res) => {
  try {
    const db = await getDb();
    const userId = Number(req.body?.user_id || req.body?.id);
    const role = String(req.body?.role || 'member').trim() || 'member';
    if (!userId) {
      return res.status(400).json({ error: 'user_id is required.' });
    }

    await db.prepare(`
      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES (?, ?, ?)
      ON CONFLICT(workspace_id, user_id) DO UPDATE SET role = excluded.role
    `).run(Number(req.params.id), userId, role);

    res.json({ success: true, user_id: userId, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const db = await getDb();
    await db.prepare('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?').run(Number(req.params.id), Number(req.params.userId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
