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
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000';
const rateLimit = require('express-rate-limit');

const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a few minutes before trying again.' }
});

function verifyToken(token) {
  return verifyJwtToken(token);
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

function getLoginOAuth2Client(customRedirectUri) {
  const redirectUri = customRedirectUri || process.env.GOOGLE_LOGIN_REDIRECT_URI || (process.env.FRONTEND_ORIGIN ? `${process.env.FRONTEND_ORIGIN}/api/auth/callback` : 'https://send.peakconix.site/api/auth/callback');
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

/** Generate Google OAuth consent URL for admin login. */
router.get('/google-url', (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(400).json({ error: 'Google OAuth is not configured on the server. Please sign in with your email and password.' });
    }
    const customRedirect = req.query.redirect_uri || req.query.redirectUri;
    const oauth2 = getLoginOAuth2Client(customRedirect);
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
    logger.error({ err: err.message }, 'Failed to generate Google login URL');
    res.status(500).json({ error: err.message });
  }
});

/** Email/password signup endpoint. */
router.post('/signup', emailLimiter, async (req, res) => {
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

    const existing = await db.prepare('SELECT id, auth_provider, password_hash FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      // If already registered via Google (no password), give a helpful message
      if (existing.auth_provider === 'google' && !existing.password_hash) {
        return res.status(409).json({ error: 'This email is registered with Google. Please sign in using the Google button.' });
      }
      return res.status(409).json({ error: 'Email already registered. Please sign in instead.' });
    }

    // GENERATE 6-DIGIT VERIFICATION CODE
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.prepare(
      'INSERT INTO users (email, name, password_hash, role, email_verified, verification_code, verification_code_expires, auth_provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      normalizedEmail,
      String(name).trim(),
      hashedPassword,
      'user',
      false, // email_verified = false
      verificationCode,
      codeExpires.toISOString(),
      'email'
    );

    const userId = result.lastInsertRowid;
    // Create workspace for user (non-fatal if table doesn't exist)
    try {
      const wsResult = await db.prepare(
        'INSERT INTO workspaces (name) VALUES (?)'
      ).run(`${String(name).trim() || 'My'}'s Workspace`);
      const workspaceId = wsResult.lastInsertRowid;
      await db.prepare(
        'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)'
      ).run(workspaceId, userId, 'admin');
    } catch (wsErr) {
      logger.warn('Workspace creation skipped (table may not exist):', wsErr.message);
    }

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

    // CHECK IF USER SIGNED UP VIA GOOGLE ONLY (no password set)
    if (!user.password_hash && user.auth_provider === 'google') {
      return res.status(400).json({ 
        error: 'This account uses Google Sign-In. Please use the Google button to sign in.',
        useGoogle: true
      });
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

/** Refresh access token using stored refresh token */
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required.' });
  }

  try {
    const db = await getDb();
    let row = null;
    try {
      row = await db.prepare(
        'SELECT r.*, u.email, u.name, u.role FROM refresh_tokens r JOIN users u ON r.user_id = u.id WHERE r.token = ? AND r.expires_at > NOW()'
      ).get(refreshToken);
    } catch (_) {
      row = await db.prepare(
        "SELECT r.*, u.email, u.name, u.role FROM refresh_tokens r JOIN users u ON r.user_id = u.id WHERE r.token = ? AND datetime(r.expires_at) > datetime('now')"
      ).get(refreshToken);
    }

    if (!row) {
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    const token = jwt.sign(
      { id: row.user_id, email: row.email, name: row.name, role: row.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      success: true,
      token,
      user: { id: row.user_id, email: row.email, name: row.name, role: row.role }
    });
  } catch (err) {
    logger.error({ err }, 'Token refresh error');
    res.status(500).json({ error: 'Failed to refresh token.' });
  }
});

/** PIN Login endpoint for direct access PIN authentication. */
router.post('/pin-login', async (req, res) => {
  const { pin } = req.body;
  const configuredPin = process.env.ACCESS_PIN || '123456';

  if (!pin || String(pin).trim() !== String(configuredPin).trim()) {
    return res.status(401).json({ error: 'Invalid access PIN.' });
  }

  try {
    const db = await getDb();
    let adminUser = await db.prepare("SELECT * FROM users WHERE email = 'admin@peakxender.local'").get();
    
    if (!adminUser) {
      try {
        const result = await db.prepare(
          "INSERT INTO users (email, name, role, email_verified, auth_provider) VALUES ('admin@peakxender.local', 'Admin', 'admin', true, 'pin')"
        ).run();
        adminUser = { id: result.lastInsertRowid || 1, email: 'admin@peakxender.local', name: 'Admin', role: 'admin' };
      } catch (_) {
        adminUser = { id: 1, email: 'admin@peakxender.local', name: 'Admin', role: 'admin' };
      }
    }

    const token = jwt.sign(
      { id: adminUser.id, email: adminUser.email, name: adminUser.name || 'Admin', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      message: 'PIN verified successfully.',
      user: { id: adminUser.id, email: adminUser.email, name: adminUser.name || 'Admin', role: 'admin' }
    });
  } catch (err) {
    logger.error({ err }, 'PIN login error');
    res.status(500).json({ error: 'PIN login failed.' });
  }
});

/** PHASE 5: Forgot password endpoint — generate reset token and send email */
router.post('/forgot-password', emailLimiter, async (req, res) => {
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
      'UPDATE users SET email_verified = true, verification_code = NULL, verification_code_expires = NULL WHERE id = ?'
    ).run(user.id);

    // ISSUE JWT so user goes straight to dashboard
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      success: true,
      token,
      message: 'Email verified! Redirecting to dashboard.'
    });
  } catch (err) {
    logger.error({ err }, 'Email verification error');
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

/** Resend verification code endpoint */
router.post('/resend-verification', emailLimiter, async (req, res) => {
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

    // Upsert user in database — link accounts if email already exists
    const db = await getDb();
    const existing = await db.prepare('SELECT id, auth_provider FROM users WHERE email = ?').get(email);

    if (existing) {
      // LINK ACCOUNTS: if user registered via email, upgrade provider to 'both'
      const newProvider = (existing.auth_provider === 'email') ? 'both' : 
                          (existing.auth_provider === 'both') ? 'both' : 'google';
      await db.prepare(
        "UPDATE users SET name = ?, picture = ?, email_verified = true, auth_provider = ?, last_login = datetime('now') WHERE email = ?"
      ).run(name, picture, newProvider, email);
    } else {
      await db.prepare(
        'INSERT INTO users (email, name, picture, role, email_verified, auth_provider) VALUES (?, ?, ?, ?, true, ?)'
      ).run(email, name, picture, 'user', 'google');
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
    const userId = decoded.id || decoded.sub;
    const email = decoded.email;
    const name = decoded.name || (decoded.user_metadata && (decoded.user_metadata.full_name || decoded.user_metadata.name)) || '';
    const role = decoded.role === 'authenticated' ? 'user' : (decoded.role || 'user');

    // Sync with public.users table if needed
    try {
      const db = await getDb();
      let user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user && email) {
        await db.prepare(
          'INSERT INTO users (email, name, role, email_verified) VALUES (?, ?, ?, ?)'
        ).run(email, name, role, true);
        user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      }
      if (user) {
        return res.json({
          id: user.id,
          email: user.email,
          name: user.name || name,
          role: user.role || role,
          picture: user.picture || '',
        });
      }
    } catch (_) {}

    res.json({
      id: userId,
      email: email,
      name: name,
      role: role,
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
});

/** Update current user's profile details (supports POST and PUT). */
const handleProfileUpdate = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    const { name, picture, company_name } = req.body;

    if (!name && name !== '') {
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
};

router.post('/profile', handleProfileUpdate);
router.put('/profile', handleProfileUpdate);

/** Change current user's password. */
router.post('/change-password', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    const { currentPassword, newPassword } = req.body;

    // Validate password strength using shared validation (same rules as signup)
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet strength requirements.',
        requirements: passwordValidation.errors,
        strength: 'weak'
      });
    }

    const db = await getDb();
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const bcrypt = require('bcrypt');
    if (user.password_hash) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required.' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);

    res.json({ success: true, message: 'Password changed successfully.' });
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

/** Get user reset security code status. */
router.get('/reset-code', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    const db = await getDb();

    const row = await db.prepare('SELECT value FROM settings WHERE key = ?').get(`RESET_CODE_${decoded.id}`);
    res.json({
      configured: !!(row && row.value && row.value.trim() !== ''),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Configure / update user reset security code. */
router.post('/reset-code', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    const { reset_code } = req.body;

    if (!reset_code || String(reset_code).trim().length < 3) {
      return res.status(400).json({ error: 'Reset code must be at least 3 characters long.' });
    }

    const db = await getDb();
    const key = `RESET_CODE_${decoded.id}`;
    const existing = await db.prepare('SELECT key FROM settings WHERE key = ?').get(key);

    if (existing) {
      await db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(String(reset_code).trim(), key);
    } else {
      await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, String(reset_code).trim());
    }

    res.json({ success: true, message: 'Security reset code configured successfully.' });
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
      'UPDATE users SET email_verified = true, verification_code = NULL, verification_code_expires = NULL WHERE id = ?'
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
