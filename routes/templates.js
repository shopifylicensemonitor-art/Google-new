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
    // RLS automatically filters by user_id = auth.uid()
    const templates = await db
      .prepare('SELECT * FROM templates ORDER BY created_at DESC')
      .all();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Get single template. */
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    // RLS ensures this is the user's template
    const template = await db
      .prepare('SELECT * FROM templates WHERE id = ?')
      .get(req.params.id);
    if (!template) return res.status(404).json({ error: 'Not found or access denied.' });
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
    // user_id is set by DEFAULT auth.uid() in the database
    const result = await db.prepare(`
      INSERT INTO templates (name, subject, body_html, body_plain)
      VALUES (?, ?, ?, ?)
    `).run(name, subject, body_html || '', body_plain || '');
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
    // RLS ensures only the user's templates can be updated
    const result = await db.prepare(`
      UPDATE templates SET name = ?, subject = ?, body_html = ?, body_plain = ?
      WHERE id = ?
    `).run(name, subject, body_html || '', body_plain || '', req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Not found or access denied.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Delete a template. */
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    // RLS ensures only the user's templates can be deleted
    const result = await db
      .prepare('DELETE FROM templates WHERE id = ?')
      .run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Not found or access denied.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
