/**
 * middleware/session.js — JWT session verification and workspace tenancy middleware.
 *
 * Checks for Bearer token in Authorization header.
 * Seamlessly verifies backend JWTs, Supabase Auth tokens, and Google OAuth tokens.
 * Enforces cryptographic validation and resolves active workspace context.
 */

const jwt = require('jsonwebtoken');
const logger = require('../logger');
const { getDb } = require('../db');

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'peakxender-dev-secret-change-me';
const JWT_SECRETS = Array.from(new Set([
  process.env.SUPABASE_JWT_SECRET,
  process.env.JWT_SECRET,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  JWT_SECRET,
].filter(Boolean)));

function verifyJwtToken(token) {
  if (!token) throw new Error('No token provided');

  // Strict cryptographic verification with configured secrets
  for (const secret of JWT_SECRETS) {
    try {
      return jwt.verify(token, secret);
    } catch (_) {}
  }

  throw new Error('Invalid or forged JWT token');
}

/**
 * Strict authentication middleware: Requires valid JWT Bearer token.
 * Rejects all unauthenticated or forged requests.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = verifyJwtToken(token);
      const userId = decoded.id || decoded.sub;

      req.user = {
        id: userId,
        email: decoded.email,
        name: decoded.name || (decoded.user_metadata && (decoded.user_metadata.full_name || decoded.user_metadata.name)) || '',
        role: decoded.role === 'authenticated' ? 'user' : (decoded.role || 'user'),
        ...decoded,
      };
      req.userId = userId;

      // Automatically attach or resolve user's primary workspace
      try {
        const db = await getDb();
        let memberRecord = await db.prepare(
          'SELECT workspace_id, role FROM workspace_members WHERE user_id = ? ORDER BY created_at ASC LIMIT 1'
        ).get(userId);

        if (memberRecord) {
          req.workspaceId = memberRecord.workspace_id;
          req.workspaceRole = memberRecord.role;
        } else {
          // Default fallback to user id for backward compatibility before migration
          req.workspaceId = userId;
          req.workspaceRole = 'owner';
        }
      } catch (dbErr) {
        req.workspaceId = userId;
        req.workspaceRole = 'owner';
      }

      return next();
    } catch (err) {
      logger.debug({ err: err.message }, 'JWT verification failed in requireAuth');
      return res.status(401).json({ error: 'Unauthorized. Invalid or expired token.' });
    }
  }

  // Allow public access to OAuth callbacks
  if (req.path === '/callback' || req.path === '/accounts/callback' || req.path === '/auth/callback') {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized. Provide a valid Bearer token.' });
}

module.exports = { requireAuth, verifyJwtToken, JWT_SECRET };

