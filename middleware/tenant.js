/**
 * middleware/tenant.js — resolves the numeric application user that owns data.
 *
 * Every user-scoped table (accounts, contacts, campaigns, templates) carries a
 * `user_id`. This middleware turns the JWT payload into a real `users.id` and
 * exposes it as `req.userId`, creating the user row on first sight so PIN and
 * OAuth sessions both map onto a stable owner.
 */

const { getDb, TENANT_TABLES } = require('../db');
const logger = require('../logger');

/** Resolve (and lazily create) the users row for the current session. */
async function resolveUserId(user) {
  const db = await getDb();

  // JWTs issued after multi-tenancy carry the real numeric users.id.
  if (user && Number.isInteger(Number(user.id)) && String(Number(user.id)) === String(user.id)) {
    const row = await db.prepare('SELECT id FROM users WHERE id = ?').get(Number(user.id));
    if (row) return row.id;
  }

  const email = (user && user.email) || 'user@local';
  let existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return existing.id;

  await db
    .prepare('INSERT INTO users (email, name, picture, role, email_verified) VALUES (?, ?, ?, ?, true)')
    .run(email, (user && user.name) || email.split('@')[0], '', (user && user.role) || 'user');

  existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  const id = existing ? existing.id : 1;

  // First user ever: adopt any pre-multi-tenancy rows so nothing disappears.
  const count = await db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (count && Number(count.c) === 1) {
    for (const t of TENANT_TABLES) {
      try {
        await db.prepare(`UPDATE ${t} SET user_id = ? WHERE user_id IS NULL`).run(id);
      } catch (_) { /* non-fatal */ }
    }
  }
  return id;
}

/** Express middleware — must run after requireAuth. */
async function attachTenant(req, res, next) {
  try {
    req.userId = await resolveUserId(req.user);
    next();
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to resolve tenant user');
    res.status(500).json({ error: 'Could not resolve user context.' });
  }
}

module.exports = { attachTenant, resolveUserId };