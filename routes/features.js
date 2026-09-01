const express = require('express');
const { getDb } = require('../db');
const { 
  listFeatureFlagsForUser,
  getFeatureFlagsForUser,
  initializeFeatureFlags,
  invalidateFeatureFlagCache,
  FEATURE_FLAG_CACHE_TTL_MS,
  normalizeFeatureFlagName,
} = require('../middleware/features');

const router = express.Router();

function isAdminUser(req) {
  const role = String(req.user?.role || req.user?.user_metadata?.role || '').toLowerCase();
  return role === 'admin' || role === 'owner';
}

router.get('/', async (req, res) => {
  try {
    const userId = req.userId ?? req.user?.id ?? null;
    const flags = await listFeatureFlagsForUser(userId);

    res.json({
      success: true,
      userId,
      cache_ttl_ms: FEATURE_FLAG_CACHE_TTL_MS,
      flags,
    });
  } catch (err) {
    console.error('Failed to fetch feature flags:', err);
    res.status(500).json({ error: 'Unable to load feature flags.' });
  }
});

router.post('/:name/enable', async (req, res) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    const name = normalizeFeatureFlagName(req.params.name);
    if (!name) {
      return res.status(400).json({ error: 'Feature name is required.' });
    }

    const db = await getDb();
    const flag = await db.prepare('SELECT id FROM feature_flags WHERE name = ?').get(name);
    if (!flag) {
      await initializeFeatureFlags();
    }

    const current = await db.prepare('SELECT id FROM feature_flags WHERE name = ?').get(name);
    if (!current) {
      return res.status(404).json({ error: 'Feature flag not found.' });
    }

    await db.prepare('UPDATE feature_flags SET enabled = 1, updated_at = ? WHERE id = ?').run(new Date().toISOString(), current.id);
    invalidateFeatureFlagCache();

    const featureMap = await getFeatureFlagsForUser(req.userId ?? req.user?.id ?? null);
    return res.json({
      success: true,
      name,
      enabled: Boolean(featureMap[name]),
      flags: await listFeatureFlagsForUser(req.userId ?? req.user?.id ?? null),
    });
  } catch (err) {
    console.error('Failed to enable feature flag:', err);
    return res.status(500).json({ error: err.message || 'Unable to enable feature flag.' });
  }
});

router.post('/:name/disable', async (req, res) => {
  try {
    if (!isAdminUser(req)) {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    const name = normalizeFeatureFlagName(req.params.name);
    if (!name) {
      return res.status(400).json({ error: 'Feature name is required.' });
    }

    const db = await getDb();
    const row = await db.prepare('SELECT id FROM feature_flags WHERE name = ?').get(name);
    if (!row) {
      return res.status(404).json({ error: 'Feature flag not found.' });
    }

    await db.prepare('UPDATE feature_flags SET enabled = 0, updated_at = ? WHERE id = ?').run(new Date().toISOString(), row.id);
    invalidateFeatureFlagCache();

    const featureMap = await getFeatureFlagsForUser(req.userId ?? req.user?.id ?? null);
    return res.json({
      success: true,
      name,
      enabled: Boolean(featureMap[name]),
      flags: await listFeatureFlagsForUser(req.userId ?? req.user?.id ?? null),
    });
  } catch (err) {
    console.error('Failed to disable feature flag:', err);
    return res.status(500).json({ error: err.message || 'Unable to disable feature flag.' });
  }
});

router.post('/:name/override', async (req, res) => {
  try {
    const enabled = req.body?.enabled;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'A boolean enabled field is required.' });
    }

    const name = normalizeFeatureFlagName(req.params.name);
    const userId = req.userId ?? req.user?.id;
    if (!name || !userId) {
      return res.status(400).json({ error: 'Feature name and authenticated user are required.' });
    }

    const db = await getDb();
    const feature = await db.prepare('SELECT id FROM feature_flags WHERE name = ?').get(name);
    if (!feature) {
      return res.status(404).json({ error: 'Feature flag not found.' });
    }

    await db.prepare(`
      INSERT INTO feature_flag_overrides (feature_flag_id, user_id, enabled, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(feature_flag_id, user_id)
      DO UPDATE SET enabled = excluded.enabled, created_at = excluded.created_at
    `).run(feature.id, userId, enabled ? 1 : 0, new Date().toISOString());

    invalidateFeatureFlagCache();
    const flags = await listFeatureFlagsForUser(userId);
    const flagState = flags.find((flag) => flag.name === name) || { name, enabled };

    return res.json({
      success: true,
      name,
      enabled: flagState.enabled,
      override: enabled,
      flags,
    });
  } catch (err) {
    console.error('Failed to override feature flag:', err);
    return res.status(500).json({ error: err.message || 'Unable to override feature flag.' });
  }
});

module.exports = router;
