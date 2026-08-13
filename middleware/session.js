/**
 * middleware/session.js — JWT session verification middleware.
 *
 * Supports:
 * - Supabase JWTs (via SUPABASE_JWT_SECRET)
 * - App-issued JWTs (via JWT_SECRET)
 */

const jwt = require('jsonwebtoken');
const logger = require('../logger');

const JWT_SECRET = process.env.JWT_SECRET || 'peakxender-dev-secret-change-me';
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || JWT_SECRET;

/**
 * Middleware that accepts:
 * 1. Supabase JWT (Bearer token with SUPABASE_JWT_SECRET)
 * 2. App-issued JWT (Bearer token with JWT_SECRET)
 *
 * Extracts user info and sets req.user for downstream middlewares
 */
function requireAuth(req, res, next) {
  // Allow public access to OAuth callback, signup, and signin
  if (req.path === '/callback' || req.path === '/signup' || req.path === '/signin' || req.path === '/google-url') {
    return next();
  }

  let token = null;

  // 1. Check Authorization: Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token required. Provide Authorization: Bearer <token> header.'
    });
  }

  // Try JWT Bearer token
  try {
    // Try Supabase JWT first
    let decoded;
    try {
      decoded = jwt.verify(token, SUPABASE_JWT_SECRET, {
        algorithms: ['HS256', 'RS256'],
        ignoreExpiration: false
      });
    } catch (supabaseErr) {
      // Fallback to app JWT_SECRET
      decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
        ignoreExpiration: false
      });
    }

    // Extract user info from JWT
    // Supabase format: { sub: uuid, aud: 'authenticated', email, ... }
    // App format: { id, email, name, role, ... }
    req.user = {
      id: decoded.sub || decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role || decoded.user_role,
      name: decoded.name,
    };

    return next();
  } catch (err) {
    logger.warn({ err: err.message }, 'JWT verification failed');
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token.'
    });
  }
}

module.exports = { requireAuth };
