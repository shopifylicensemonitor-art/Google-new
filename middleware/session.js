/**
 * middleware/session.js — JWT session verification middleware.
 *
 * Checks for Bearer token in Authorization header.
 * Seamlessly verifies backend JWTs, Supabase Auth tokens, and Google tokens.
 */

const jwt = require('jsonwebtoken');
const logger = require('../logger');

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
 * Middleware that accepts EITHER a valid JWT Bearer token
 * OR the legacy PIN-based auth. This ensures backward compatibility
 * while enabling the new auth flow.
 */
function requireAuth(req, res, next) {
  // Allow public access to OAuth callback and auth-url generation
  if (req.path === '/callback' || req.path === '/auth-url') {
    return next();
  }

  // Try JWT Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = verifyJwtToken(token);
      req.user = {
        id: decoded.id || decoded.sub,
        email: decoded.email,
        name: decoded.name || (decoded.user_metadata && (decoded.user_metadata.full_name || decoded.user_metadata.name)) || '',
        role: decoded.role === 'authenticated' ? 'user' : (decoded.role || 'user'),
        ...decoded,
      };
      return next();
    } catch (err) {
      logger.debug({ err: err.message }, 'JWT verification failed in requireAuth');
    }
  }

  // Allow PIN fallback only if ACCESS_PIN is explicitly set in non-production environments
  const configuredPin = process.env.ACCESS_PIN;
  const providedPin = (req.query && req.query.pin) || req.headers['x-access-pin'];

  if (process.env.NODE_ENV !== 'production' && configuredPin && providedPin && String(providedPin) === String(configuredPin)) {
    req.user = { id: 'pin', email: 'local-pin', role: 'admin' };
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized. Provide a valid JWT token.' });
}

module.exports = { requireAuth, verifyJwtToken, JWT_SECRET };
