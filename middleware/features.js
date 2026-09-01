const { getDb } = require('../db');

const FEATURE_FLAG_DEFAULTS = {
  'new-three-pane-layout': false,
  'keyboard-shortcuts': false,
  'automation-rules': false,
  'workspace-management': false,
  'shared-inbox': false,
  delegation: false,
  'advanced-filters': false,
};

const FEATURE_FLAG_CACHE_TTL_MS = 30 * 1000;
const featureFlagCache = new Map();

function normalizeFeatureFlagName(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, '-');
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
  return false;
}

function invalidateFeatureFlagCache() {
  featureFlagCache.clear();
}

async function initializeFeatureFlags() {
  const db = await getDb();

  const entries = Object.entries(FEATURE_FLAG_DEFAULTS).map(([name, enabled]) => [
    normalizeFeatureFlagName(name), toBoolean(enabled) ? 1 : 0,
    new Date().toISOString(),
    new Date().toISOString(),
  ]);

  if (!db || !db.prepare) return;

  for (const [name, enabled, createdAt, updatedAt] of entries) {
    try {
      await db.prepare(`
        INSERT INTO feature_flags (name, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at
      `).run(name, enabled, createdAt, updatedAt);
    } catch (_) {
      try {
        await db.prepare('INSERT OR IGNORE INTO feature_flags (name, enabled, created_at, updated_at) VALUES (?, ?, ?, ?)')
          .run(name, enabled, createdAt, updatedAt);
      } catch (err) {
        console.warn('Failed to initialize feature flag:', name, err.message);
      }
    }
  }
}

async function listFeatureFlagsForUser(userId = null) {
  const db = await getDb();
  await initializeFeatureFlags();

  const cacheKey = userId ? `user:${userId}` : 'global';
  const cached = featureFlagCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const rows = await db.prepare(`
    SELECT ff.id, ff.name, ff.enabled AS default_enabled,
           fo.enabled AS override_enabled,
           fo.user_id AS override_user_id
    FROM feature_flags ff
    LEFT JOIN feature_flag_overrides fo
      ON fo.feature_flag_id = ff.id
     AND (? IS NULL OR fo.user_id = ?)
    ORDER BY ff.name ASC
  `).all(userId, userId);

  const flags = Object.keys(FEATURE_FLAG_DEFAULTS).map((name) => {
    const normalized = normalizeFeatureFlagName(name);
    const row = rows.find((item) => normalizeFeatureFlagName(item.name) === normalized) || {
      default_enabled: FEATURE_FLAG_DEFAULTS[name] ? 1 : 0,
      override_enabled: null,
    };
    const defaultEnabled = toBoolean(row.default_enabled);
    const overrideEnabled = row.override_enabled === null || row.override_enabled === undefined ? null : toBoolean(row.override_enabled);
    const enabled = overrideEnabled !== null ? overrideEnabled : defaultEnabled;

    return {
      name: normalized,
      default_enabled: defaultEnabled,
      enabled,
      override_enabled: overrideEnabled,
      user_override: overrideEnabled !== null,
    };
  });

  featureFlagCache.set(cacheKey, {
    expiresAt: Date.now() + FEATURE_FLAG_CACHE_TTL_MS,
    value: flags,
  });

  return flags;
}

async function getFeatureFlagsForUser(userId = null) {
  const flags = await listFeatureFlagsForUser(userId);
  return flags.reduce((acc, flag) => {
    acc[flag.name] = flag.enabled;
    return acc;
  }, {});
}

async function attachFeatures(req, res, next) {
  try {
    const userId = req.userId ?? req.user?.id ?? null;
    const featureMap = await getFeatureFlagsForUser(userId);

    req.featureFlags = featureMap;
    req.features = featureMap;
    req.isFeatureEnabled = (featureName) => {
      const normalized = normalizeFeatureFlagName(featureName);
      if (!normalized) return false;
      return Boolean(featureMap[normalized]);
    };

    next();
  } catch (err) {
    console.error('Failed to attach feature flags to request:', err);
    res.status(500).json({ error: 'Unable to load feature flags.' });
  }
}

module.exports = {
  FEATURE_FLAG_DEFAULTS,
  FEATURE_FLAG_CACHE_TTL_MS,
  featureFlagCache,
  initializeFeatureFlags,
  listFeatureFlagsForUser,
  getFeatureFlagsForUser,
  attachFeatures,
  invalidateFeatureFlagCache,
  normalizeFeatureFlagName,
  toBoolean,
};
