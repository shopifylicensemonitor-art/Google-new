/**
 * middleware/tenant.js — Supabase UUID extraction for RLS
 *
 * For Supabase integration:
 * - auth.uid() returns a UUID from the authenticated user
 * - req.user.id contains this UUID from the JWT 'sub' claim
 * - Pass it through as req.userId for all database queries
 * - RLS policies enforce isolation at database level
 */

const logger = require('../logger');

/** UUID validation regex */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate UUID format to ensure it matches Supabase auth.uid() format
 * @param {string} id - The ID to validate
 * @returns {boolean} true if valid UUID format
 */
function isValidUUID(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

/**
 * Express middleware — Extract Supabase UUID and attach to request.
 * Must run AFTER requireAuth middleware that sets req.user
 */
async function attachTenant(req, res, next) {
  try {
    // Check that user exists and has an ID
    if (!req.user) {
      return res.status(401).json({
        error: 'User context missing.',
        message: 'User must be authenticated before accessing tenant resources.'
      });
    }

    const userId = req.user.id;

    // Validate UUID format (Supabase UUIDs are always valid UUIDs)
    if (!isValidUUID(userId)) {
      logger.warn(
        { userId, userIdType: typeof userId },
        'Invalid user ID format - expected UUID'
      );
      return res.status(401).json({
        error: 'Invalid user ID format.',
        message: 'User ID must be a valid UUID from Supabase.'
      });
    }

    // Attach the Supabase UUID to request for database queries
    req.userId = userId;

    // Debug logging (disabled in production)
    if (process.env.DEBUG_AUTH === 'true') {
      logger.info({ userId: req.userId.substring(0, 8) + '...' }, 'Tenant UUID attached');
    }

    next();
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'Failed to attach tenant');
    res.status(500).json({
      error: 'Could not resolve user context.',
      message: 'An error occurred while validating your session.'
    });
  }
}

/** Helper: Validate UUID format */
function getUserIdFromToken(jwtPayload) {
  if (!jwtPayload || !jwtPayload.sub) {
    return null;
  }
  // Supabase stores auth.uid() in the 'sub' claim
  const id = jwtPayload.sub;
  return isValidUUID(id) ? id : null;
}

module.exports = { attachTenant, isValidUUID, getUserIdFromToken };