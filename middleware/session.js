/**
 * middleware/session.js — JWT session verification middleware.
 *
 * Supports:
 * - Supabase JWTs (via SUPABASE_JWT_SECRET)
 * - App-issued JWTs (via JWT_SECRET)
 * - PIN-based fallback for local development
 */

const jwt = require('jsonwebtoken');
const logger = require('../logger');

const JWT_SECRET = process.env.JWT_SECRET || 'peakxender-dev-secret-change-me';
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || JWT_SECRET;

/**
 * Middleware that accepts:
 * 1. Supabase JWT (Bearer token with SUPABASE_JWT_SECRET)
 * 2. App-issued JWT (Bearer token with JWT_SECRET)
 * 3. PIN fallback (development only)
 *
 * Extracts user info and sets req.user for downstream middlewares
 */
function requireAuth(req, res, next) {
  // Allow public access to OAuth callback and auth-url generation
  if (req.path === '/callback' || req.path === '/auth-url') {
    return next();
  }

  let token = null;

  // 1. Check Authorization: Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // Try JWT Bearer token
  if (token) {
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
      // App format: { userId: ..., email, ... }
      req.user = {
        id: decoded.sub || decoded.userId,  // Supabase uses 'sub' claim
        email: decoded.email,
        role: decoded.role || decoded.user_role,
        name: decoded.name,
      };

      return next();
    } catch (err) {
      // Token is invalid or expired; fall through to check PIN fallback below
      if (process.env.DEBUG_AUTH === 'true') {
        logger.debug({ err: err.message }, 'JWT verification failed');
      }
    }
  }

  // Allow a simple PIN fallback for local/dev usage. The PIN can be provided
  // either via ?pin= query parameter or the `X-Access-Pin` header. This keeps
  // the app usable without full OAuth during local development.
  const configuredPin = process.env.ACCESS_PIN || '1234';
  const providedPin = (req.query && req.query.pin) || req.headers['x-access-pin'];

  // Debug logging to help trace local dev auth issues (do not log PINs in prod)
  if (process.env.NODE_ENV !== 'production') {
    try {
      logger.debug({ configuredPin: !!configuredPin, providedPin: providedPin ? '[REDACTED]' : null }, 'PIN auth check');
    } catch (_) { /* ignore logging failures */ }

    if (providedPin && String(providedPin) === String(configuredPin)) {
      // Mark a minimal user context so downstream handlers can rely on `req.user`.
      // Note: This uses a fake UUID for local development
      req.user = {
        id: '00000000-0000-0000-0000-000000000000',  // Development UUID
        email: 'local-pin',
        role: 'admin',
        name: 'Local Dev'
      };
      return next();
    }
  } else {
    // In production, PIN fallback is disabled for security. If a PIN was attempted,
    // log it (without revealing the PIN) for auditing and return Unauthorized.
    if (providedPin) {
      try { logger.warn({ attemptedPin: !!providedPin }, 'PIN auth attempted in production and is disabled'); } catch (_) {}
    }
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Authentication token required. Provide Authorization: Bearer <token> header.'
  });
}

module.exports = { requireAuth };
