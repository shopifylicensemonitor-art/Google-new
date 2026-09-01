const { getDb } = require('../db');

async function ensureUserWorkspace(db, userId, label = 'My Workspace') {
  if (!db || !userId) return null;

  try {
    const existing = await db.prepare(`
      SELECT w.id, w.name
      FROM workspaces w
      INNER JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE wm.user_id = ?
      ORDER BY w.id ASC
      LIMIT 1
    `).get(userId);

    if (existing) {
      return existing;
    }

    const name = String(label || 'My Workspace').trim() || 'My Workspace';
    const created = await db.prepare('INSERT INTO workspaces (name) VALUES (?)').run(name);
    const workspaceId = created && created.lastInsertRowid ? created.lastInsertRowid : null;

    if (workspaceId) {
      await db.prepare('INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)')
        .run(workspaceId, userId, 'admin');
      return { id: workspaceId, name };
    }
  } catch (err) {
    // Graceful fallback for legacy installs or older schema snapshots.
  }

  return { id: Number(userId) || null, name: String(label || 'My Workspace').trim() || 'My Workspace' };
}

function applyWorkspaceScope(query, userId, workspaceId) {
  if (!query || typeof query !== 'string') return query;
  if (!userId) return query;

  const safeWorkspaceId = workspaceId == null || workspaceId === '' ? null : Number(workspaceId);

  if (safeWorkspaceId == null) {
    return query;
  }

  const scope = '((workspace_id IS NULL) OR (workspace_id = ?))';
  const normalized = query.trim();
  const withClause = /\bWHERE\b/i.test(normalized)
    ? `${normalized} AND ${scope}`
    : `${normalized} WHERE ${scope}`;

  return { sql: withClause, params: [safeWorkspaceId] };
}

async function attachWorkspaceContext(req, res, next) {
  try {
    const db = await getDb();
    const userId = req.userId || req.user?.id;

    if (!userId) {
      return next();
    }

    let workspaceId = req.headers['x-workspace-id'] || req.query?.workspace_id || req.workspaceId;
    let workspace = null;

    if (workspaceId) {
      workspace = await db.prepare(`
        SELECT w.id, w.name, wm.role
        FROM workspaces w
        INNER JOIN workspace_members wm ON wm.workspace_id = w.id
        WHERE w.id = ? AND wm.user_id = ?
      `).get(Number(workspaceId), userId);
    }

    if (!workspace) {
      workspace = await ensureUserWorkspace(db, userId, req.user?.name ? `${req.user.name}'s Workspace` : 'My Workspace');
      workspaceId = workspace && workspace.id;
    }

    req.workspace = workspace || { id: null, name: 'Personal Workspace' };
    req.workspaceId = workspaceId || req.workspaceId || (workspace && workspace.id) || null;
    req.workspaceRole = (workspace && workspace.role) || 'admin';

    if (req.query && req.query.workspace_id === undefined && req.workspaceId) {
      req.query.workspace_id = String(req.workspaceId);
    }

    return next();
  } catch (err) {
    req.workspace = { id: null, name: 'Personal Workspace' };
    req.workspaceId = req.workspaceId || req.userId || null;
    return next();
  }
}

async function requireWorkspaceAccess(req, res, next) {
  const userId = req.userId || req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const workspaceId = req.headers['x-workspace-id'] || req.query?.workspace_id || req.workspaceId;

  try {
    const db = await getDb();

    if (workspaceId) {
      const member = await db.prepare(`
        SELECT wm.workspace_id, wm.role
        FROM workspace_members wm
        WHERE wm.workspace_id = ? AND wm.user_id = ?
      `).get(Number(workspaceId), userId);

      if (!member) {
        return res.status(403).json({ error: 'You do not have access to this workspace.' });
      }

      req.workspaceId = Number(workspaceId);
      req.workspaceRole = member.role;
      return next();
    }

    const workspace = await ensureUserWorkspace(db, userId, req.user?.name ? `${req.user.name}'s Workspace` : 'My Workspace');
    req.workspace = workspace || { id: null, name: 'Personal Workspace' };
    req.workspaceId = workspace && workspace.id ? Number(workspace.id) : req.workspaceId || null;
    req.workspaceRole = req.workspaceRole || 'admin';
    return next();
  } catch (err) {
    req.workspaceId = req.workspaceId || userId || null;
    return next();
  }
}

module.exports = {
  ensureUserWorkspace,
  requireWorkspaceAccess,
  attachWorkspaceContext,
  applyWorkspaceScope,
};
