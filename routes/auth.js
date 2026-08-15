/**
 * routes/auth.js — Google OAuth login + JWT session management.
 *
 * Endpoints:
 *   GET  /api/auth/google-url  → Generate Google OAuth consent URL for login
 *   GET  /api/auth/callback    → Exchange code for tokens, issue JWT
 *   GET  /api/auth/me          → Return current user info from JWT
 *   POST /api/auth/logout      → Clear session (client-side)
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const { getDb } = require('../db');
const logger = require('../logger');
const { verifyJwtToken } = require('../middleware/session');

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || 'peakxender-dev-secret-change-me';
const JWT_SECRETS = Array.from(new Set([
  process.env.SUPABASE_JWT_SECRET,
  process.env.JWT_SECRET,
  JWT_SECRET,
].filter(Boolean)));
const JWT_EXPIRY = '7d';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || process.env.VERIFICATION_CODE_TTL_MINUTES || 15);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:8080';

function verifyToken(token) {
  let lastError = null;

  for (const secret of JWT_SECRETS) {
    try {
      return jwt.verify(token, secret);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Invalid JWT');
}

/**
 * Validates password strength requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - At least one special character (!@#$%^&*)
 * 
 * @param {string} password - Password to validate
 * @returns {object} { isValid: boolean, errors: string[] }
 */
function validatePassword(password) {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number (0-9)');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

function getLoginOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    // Login callback is a DIFFERENT redirect URI from the accounts one
    process.env.GOOGLE_LOGIN_REDIRECT_URI || 'http://localhost:3000/api/auth/callback'
  );
}

/** Generate Google OAuth consent URL for admin login. */
router.get('/google-url', (_req, res) => {
  try {
    const oauth2 = getLoginOAuth2Client();
    const url = oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
    });
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Email/password signup endpoint. */
router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required.' });
  }

  // PHASE 3: VALIDATE PASSWORD STRENGTH
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      error: 'Password does not meet strength requirements.',
      requirements: passwordValidation.errors,
      strength: 'weak'
    });
  }

  try {
    const bcrypt = require('bcrypt');
    const db = await getDb();
    const { sendVerificationEmail } = require('../utils/email');
    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    // GENERATE 6-DIGIT VERIFICATION CODE
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.prepare(
      'INSERT INTO users (email, name, password_hash, role, email_verified, verification_code, verification_code_expires) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      normalizedEmail,
      String(name).trim(),
      hashedPassword,
      'user',
      0, // email_verified = false
      verificationCode,
      codeExpires.toISOString()
    );

    const userId = result.lastInsertRowid;
    const wsResult = await db.prepare(
      'INSERT INTO workspaces (name) VALUES (?)'
    ).run(`${String(name).trim() || 'My'}'s Workspace`);

    const workspaceId = wsResult.lastInsertRowid;
    await db.prepare(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)'
    ).run(workspaceId, userId, 'admin');

    // SEND VERIFICATION EMAIL
    const verificationLink = `${FRONTEND_ORIGIN}/verify-email?code=${verificationCode}&email=${encodeURIComponent(normalizedEmail)}`;

    try {
      await sendVerificationEmail(normalizedEmail, verificationCode, verificationLink);
    } catch (emailErr) {
      logger.error({ emailErr }, 'Email send failed, but account created');
      // Don't fail signup if email send fails - user can request resend
    }

    res.json({
      success: true,
      message: 'Account created! Check your email for verification code.',
      email: normalizedEmail
    });
  } catch (err) {
    logger.error({ err }, 'Signup error');
    res.status(500).json({ error: 'Account creation failed.' });
  }
});

/** Email/password signin endpoint with account lockout. */
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const bcrypt = require('bcrypt');
    const db = await getDb();
    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
    
    // CHECK IF ACCOUNT IS LOCKED
    if (user && user.locked_until) {
      const lockedUntil = new Date(user.locked_until);
      const now = new Date();
      
      if (lockedUntil > now) {
        const minutesLeft = Math.ceil((lockedUntil - now) / 60000);
        return res.status(429).json({ 
          error: `Account locked due to too many failed login attempts. Try again in ${minutesLeft} minute(s).`
        });
      } else {
        // Lock expired, reset counters
        await db.prepare(
          'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?'
        ).run(user.id);
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash || '');
    
    if (!passwordMatch) {
      // INCREMENT FAILED ATTEMPTS
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      
      if (newAttempts >= 5) {
        // LOCK ACCOUNT FOR 15 MINUTES
        const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        await db.prepare(
          'UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?'
        ).run(newAttempts, lockedUntil.toISOString(), user.id);
        
        return res.status(429).json({ 
          error: 'Too many failed login attempts. Account locked for 15 minutes. Check your email for account recovery options.'
        });
      } else {
        // JUST INCREMENT COUNTER
        await db.prepare(
          'UPDATE users SET failed_login_attempts = ? WHERE id = ?'
        ).run(newAttempts, user.id);
        
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
    }

    // SUCCESSFUL LOGIN - RESET FAILED ATTEMPTS
    await db.prepare(
      "UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = datetime('now') WHERE id = ?"
    ).run(user.id);

    // CHECK IF EMAIL IS VERIFIED
    if (!user.email_verified) {
      return res.status(403).json({
        error: 'Email not verified. Check your inbox for verification code.',
        unverified: true,
        email: user.email
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // PHASE 4: Issue refresh token (30 days expiry)
    const crypto = require('crypto');
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Store refresh token in database
    try {
      await db.prepare(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
      ).run(user.id, refreshToken, refreshTokenExpiresAt.toISOString());
    } catch (err) {
      logger.warn('Failed to store refresh token:', err.message);
    }

    res.json({
      success: true,
      token,
      refreshToken,
      message: 'Signed in successfully.',
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err) {
    logger.error({ err }, 'Signin error');
    res.status(500).json({ error: 'Signin failed. Please try again.' });
  }
});

/** PHASE 4: Refresh token endpoint — exchange refresh token for new access token */
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }

  try {
    const db = await getDb();

    // Find the refresh token in database
    const tokenRecord = await db.prepare(
      'SELECT * FROM refresh_tokens WHERE token = ? AND revoked = 0'
    ).get(refreshToken);

    if (!tokenRecord) {
      return res.status(401).json({ error: 'Invalid or revoked refresh token.' });
    }

    // Check if token has expired
    const expiresAt = new Date(tokenRecord.expires_at);
    if (expiresAt < new Date()) {
      return res.status(401).json({ error: 'Refresh token has expired.' });
    }

    // Get user details
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(tokenRecord.user_id);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    // Issue new access token
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      success: true,
      token: newAccessToken,
      message: 'Token refreshed successfully.',
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err) {
    logger.error({ err }, 'Token refresh error');
    res.status(500).json({ error: 'Token refresh failed. Please try again.' });
  }
});

/** PHASE 5: Forgot password endpoint — generate reset token and send email */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const db = await getDb();
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());

    // Generic response to prevent user enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.'
      });
    }

    // Generate 32-byte random reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // Store reset token in database
    await db.prepare(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).run(user.id, resetToken, expiresAt.toISOString());

    // Send reset email
    const { sendPasswordResetEmail } = require('../utils/email');
    const resetLink = `${FRONTEND_ORIGIN}/reset-password?token=${resetToken}&email=${encodeURIComponent(email.trim())}`;
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      await sendPasswordResetEmail(email.trim(), resetCode, resetLink);
      logger.info({ email }, 'Password reset email sent');
    } catch (emailErr) {
      logger.warn({ err: emailErr, email }, 'Failed to send reset email, but token was created');
    }

    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.'
    });
  } catch (err) {
    logger.error({ err }, 'Forgot password error');
    res.status(500).json({ error: 'Failed to process request. Please try again.' });
  }
});

/** PHASE 5: Reset password endpoint — validate token and update password */
router.post('/reset-password', async (req, res) => {
  const { token, email, newPassword } = req.body;

  if (!token || !email || !newPassword) {
    return res.status(400).json({ error: 'Token, email, and new password are required.' });
  }

  try {
    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet requirements.',
        requirements: passwordValidation.errors
      });
    }

    const db = await getDb();
    
    // Find reset token
    const resetToken = await db.prepare(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used_at IS NULL'
    ).get(token);

    if (!resetToken) {
      return res.status(401).json({ error: 'Invalid or expired reset token.' });
    }

    // Check if token has expired
    if (new Date(resetToken.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Reset token has expired.' });
    }

    // Get user
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(resetToken.user_id);
    if (!user || user.email !== email.trim().toLowerCase()) {
      return res.status(401).json({ error: 'Invalid request.' });
    }

    // Hash new password
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and mark token as used
    await db.prepare(
      'UPDATE users SET password_hash = ? WHERE id = ?'
    ).run(passwordHash, user.id);

    await db.prepare(
      'UPDATE password_reset_tokens SET used_at = ? WHERE id = ?'
    ).run(new Date().toISOString(), resetToken.id);

    logger.info({ email }, 'Password reset successfully');

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    });
  } catch (err) {
    logger.error({ err }, 'Reset password error');
    res.status(500).json({ error: 'Password reset failed. Please try again.' });
  }
});

/** Email verification endpoint — verify code sent to user's email */
router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required.' });
  }

  try {
    const db = await getDb();
    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified.' });
    }

    // CHECK IF CODE MATCHES AND NOT EXPIRED
    const codeExpires = new Date(user.verification_code_expires);
    if (user.verification_code !== code || codeExpires < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    // MARK EMAIL AS VERIFIED
    await db.prepare(
      'UPDATE users SET email_verified = 1, verification_code = NULL, verification_code_expires = NULL WHERE id = ?'
    ).run(user.id);

    res.json({
      success: true,
      message: 'Email verified! You can now sign in.'
    });
  } catch (err) {
    logger.error({ err }, 'Email verification error');
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

/** Resend verification code endpoint */
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const db = await getDb();
    const { sendVerificationEmail } = require('../utils/email');
    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified.' });
    }

    // GENERATE NEW VERIFICATION CODE
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await db.prepare(
      'UPDATE users SET verification_code = ?, verification_code_expires = ? WHERE id = ?'
    ).run(verificationCode, codeExpires.toISOString(), user.id);

    // SEND VERIFICATION EMAIL
    const verificationLink = `${FRONTEND_ORIGIN}/verify-email?code=${verificationCode}&email=${encodeURIComponent(normalizedEmail)}`;

    try {
      await sendVerificationEmail(normalizedEmail, verificationCode, verificationLink);
    } catch (emailErr) {
      logger.error({ emailErr }, 'Failed to send verification email');
      // Still return success if email service fails - user can try again
    }

    res.json({
      success: true,
      message: 'Verification code sent to your email.'
    });
  } catch (err) {
    logger.error({ err }, 'Resend verification error');
    res.status(500).json({ error: 'Failed to resend code. Please try again.' });
  }
});

/** OAuth callback — exchange code, verify admin email, issue JWT. */
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'No code provided.' });

  try {
    const oauth2 = getLoginOAuth2Client();
    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    // Fetch user info
    const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 });
    const { data } = await oauth2Api.userinfo.get();
    const email = data.email;
    const name = data.name || email.split('@')[0];
    const picture = data.picture || '';

    // Check admin restriction
    if (ADMIN_EMAIL && email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      // Redirect to frontend with error
      const frontendUrl = process.env.FRONTEND_ORIGIN || '';
      return res.redirect(frontendUrl + '/?auth_error=unauthorized');
    }

    // Upsert user in database
    const db = await getDb();
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);

    if (existing) {
      await db.prepare(
        "UPDATE users SET name = ?, picture = ?, last_login = datetime('now') WHERE email = ?"
      ).run(name, picture, email);
    } else {
      await db.prepare(
        'INSERT INTO users (email, name, picture, role) VALUES (?, ?, ?, ?)'
      ).run(email, name, picture, 'admin');
    }

    // Fetch the full user row for the JWT payload
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    // Issue JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Redirect to frontend with token in query
    const frontendUrl = process.env.FRONTEND_ORIGIN || '';
    res.redirect(frontendUrl + `/?token=${encodeURIComponent(token)}`);
  } catch (err) {
    logger.error({ err }, 'Auth callback error');
    res.status(500).json({ error: err.message });
  }
});

/** Return current user info from JWT. */
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    res.json({
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
});

/** Update current user's profile details. */
router.post('/profile', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    const { name, picture } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    const db = await getDb();
    await db.prepare(
      'UPDATE users SET name = ?, picture = ? WHERE id = ?'
    ).run(name, picture || '', decoded.id);

    res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Get system settings. */
router.get('/settings', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
    const db = await getDb();
    const rows = await db.prepare('SELECT key, value FROM settings').all();
    
    const settingsMap = {};
    rows.forEach(r => {
      settingsMap[r.key] = r.value;
    });

    const responseSettings = {
      ADMIN_EMAIL: settingsMap['ADMIN_EMAIL'] || process.env.ADMIN_EMAIL || '',
      TRACKING_BASE_URL: settingsMap['TRACKING_BASE_URL'] || process.env.TRACKING_BASE_URL || 'http://localhost:3000',
      SCHEDULER_BATCH_SIZE: settingsMap['SCHEDULER_BATCH_SIZE'] || process.env.SCHEDULER_BATCH_SIZE || '10',
      DAILY_LIMIT_DEFAULT: settingsMap['DAILY_LIMIT_DEFAULT'] || '450',
      // Expose whether the background scheduler is enabled on the server.
      SCHEDULER_ENABLED: (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULER === 'true') ? 'true' : 'false',
    };

    res.json(responseSettings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Update system settings. */
router.post('/settings', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
    const settings = req.body;
    const db = await getDb();

    const keys = ['ADMIN_EMAIL', 'TRACKING_BASE_URL', 'SCHEDULER_BATCH_SIZE', 'DAILY_LIMIT_DEFAULT'];
    
    for (const key of keys) {
      if (settings[key] !== undefined) {
        const existing = await db.prepare('SELECT key FROM settings WHERE key = ?').get(key);
        if (existing) {
          await db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(String(settings[key]), key);
        } else {
          await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, String(settings[key]));
        }
      }
    }

    res.json({ success: true, message: 'Settings updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DEV-ONLY: Auto-verify test emails (ending with @test.local) */
router.post('/test-verify-email', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  // Only allow test emails in development
  if (!email.endsWith('@test.local')) {
    return res.status(403).json({ error: 'Only @test.local emails can be auto-verified.' });
  }

  try {
    const db = await getDb();
    const normalizedEmail = String(email).trim().toLowerCase();
    
    const user = await db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await db.prepare(
      'UPDATE users SET email_verified = 1, verification_code = NULL, verification_code_expires = NULL WHERE id = ?'
    ).run(user.id);

    res.json({ success: true, message: 'Email verified for testing.' });
  } catch (err) {
    logger.error({ err }, 'Test email verification error');
    res.status(500).json({ error: 'Verification failed.' });
  }
});

/** Logout placeholder (JWT is stateless — client discards token). */
router.post('/logout', (_req, res) => {
  res.json({ success: true, message: 'Token cleared on client.' });
});

module.exports = router;
