/**
 * utils/email.js — Email sending utility for verification and password reset
 * 
 * Supports:
 * - Supabase Email (via SMTP if configured)
 * - Gmail (for development)
 * - Console logging (for testing without real emails)
 */

const nodemailer = require('nodemailer');
const logger = require('../logger');

let transporter = null;

/**
 * Initialize email transporter based on environment configuration
 */
async function initializeEmailer() {
  if (transporter) return transporter;

  // Option 1: Supabase SMTP (if configured)
  if (process.env.SUPABASE_SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SUPABASE_SMTP_HOST,
      port: process.env.SUPABASE_SMTP_PORT || 587,
      secure: process.env.SUPABASE_SMTP_SECURE === 'true',
      auth: {
        user: process.env.SUPABASE_SMTP_USER,
        pass: process.env.SUPABASE_SMTP_PASS
      }
    });
    logger.info('Email transporter initialized: Supabase SMTP');
    return transporter;
  }

  // Option 2: Gmail (development)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
    logger.info('Email transporter initialized: Gmail');
    return transporter;
  }

  // Option 3: Generic SMTP
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    logger.info('Email transporter initialized: Generic SMTP');
    return transporter;
  }

  // Option 4: Console mock (development/testing without real emails)
  if (process.env.NODE_ENV === 'production') {
    const message = 'No email service configured for production. Set SMTP_HOST / SMTP_USER / SMTP_PASS or GMAIL_USER / GMAIL_APP_PASSWORD, or configure Supabase SMTP.';
    logger.error(message);
    throw new Error(message);
  }

  logger.warn('No email service configured. Using console logging for emails in development mode.');
  return {
    sendMail: async (mailOptions) => {
      logger.info('EMAIL MOCK (not sent):', {
        to: mailOptions.to,
        subject: mailOptions.subject,
        text: mailOptions.text?.substring(0, 100) || '...'
      });
      return { accepted: [mailOptions.to] };
    }
  };
}

/**
 * Send verification email with both code and link options
 */
async function sendVerificationEmail(email, code, verificationLink) {
  try {
    const mailer = transporter || await initializeEmailer();

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #635bff 0%, #493ee5 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Peakconix</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Verify Your Email</p>
        </div>

        <div style="padding: 30px; background: #f8f9fa;">
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Welcome! Please verify your email address to activate your Peakconix account.
          </p>

          <div style="background: white; padding: 24px; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0;">
            <p style="color: #666; font-size: 14px; margin-top: 0;">
              <strong>Option 1: Click the verification link</strong>
            </p>
            <a href="${verificationLink}" style="display: inline-block; background: #635bff; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 12px 0;">
              Verify Email Address
            </a>
          </div>

          <div style="background: white; padding: 24px; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0;">
            <p style="color: #666; font-size: 14px; margin-top: 0;">
              <strong>Option 2: Enter this code in your browser</strong>
            </p>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 6px; text-align: center; margin: 12px 0;">
              <p style="color: #635bff; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 0;">
                ${code}
              </p>
              <p style="color: #999; font-size: 12px; margin: 8px 0 0 0;">
                Code expires in 15 minutes
              </p>
            </div>
          </div>

          <p style="color: #999; font-size: 12px; line-height: 1.6; margin-top: 30px;">
            If you didn't create this account, please ignore this email or <a href="mailto:support@peakconix.com" style="color: #635bff;">contact support</a>.
          </p>
        </div>

        <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #999; border-radius: 0 0 12px 12px;">
          <p style="margin: 0;">© 2024 Peakconix. All rights reserved.</p>
          <p style="margin: 8px 0 0 0;"><a href="https://peakconix.com/privacy" style="color: #999; text-decoration: none;">Privacy Policy</a> | <a href="https://peakconix.com/terms" style="color: #999; text-decoration: none;">Terms of Service</a></p>
        </div>
      </div>
    `;

    const text = `
Peakconix - Email Verification

Welcome to Peakconix! Verify your email to activate your account.

OPTION 1: Click this link
${verificationLink}

OPTION 2: Enter this code
${code}

Code expires in 15 minutes.

If you didn't create this account, please ignore this email.
    `.trim();

    await mailer.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@peakconix.com',
      to: email,
      subject: 'Verify Your Peakconix Email Address',
      html,
      text
    });

    logger.info({ email }, 'Verification email sent');
    return true;
  } catch (err) {
    logger.error({ err, email }, 'Failed to send verification email');
    throw err;
  }
}

/**
 * Send password reset email with code and link
 */
async function sendPasswordResetEmail(email, code, resetLink) {
  try {
    const mailer = transporter || await initializeEmailer();

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #635bff 0%, #493ee5 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Peakconix</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Reset Your Password</p>
        </div>

        <div style="padding: 30px; background: #f8f9fa;">
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password. Click the link below to create a new password.
          </p>

          <div style="background: white; padding: 24px; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0;">
            <p style="color: #666; font-size: 14px; margin-top: 0;">
              <strong>Option 1: Click to reset password</strong>
            </p>
            <a href="${resetLink}" style="display: inline-block; background: #635bff; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 12px 0;">
              Reset Password
            </a>
          </div>

          <div style="background: white; padding: 24px; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0;">
            <p style="color: #666; font-size: 14px; margin-top: 0;">
              <strong>Option 2: Enter this code</strong>
            </p>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 6px; text-align: center; margin: 12px 0;">
              <p style="color: #635bff; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 0;">
                ${code}
              </p>
              <p style="color: #999; font-size: 12px; margin: 8px 0 0 0;">
                Code expires in 1 hour
              </p>
            </div>
          </div>

          <p style="color: #ff6b6b; font-size: 12px; line-height: 1.6; margin-top: 30px;">
            <strong>Security Note:</strong> If you didn't request this password reset, you can safely ignore this email. Your account is secure.
          </p>
        </div>

        <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #999; border-radius: 0 0 12px 12px;">
          <p style="margin: 0;">© 2024 Peakconix. All rights reserved.</p>
          <p style="margin: 8px 0 0 0;"><a href="https://peakconix.com/privacy" style="color: #999; text-decoration: none;">Privacy Policy</a></p>
        </div>
      </div>
    `;

    const text = `
Peakconix - Password Reset

We received a request to reset your password. Use the code or link below to create a new password.

OPTION 1: Click this link
${resetLink}

OPTION 2: Enter this code
${code}

Code expires in 1 hour.

If you didn't request this, you can ignore this email. Your account is secure.
    `.trim();

    await mailer.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@peakconix.com',
      to: email,
      subject: 'Reset Your Peakconix Password',
      html,
      text
    });

    logger.info({ email }, 'Password reset email sent');
    return true;
  } catch (err) {
    logger.error({ err, email }, 'Failed to send password reset email');
    throw err;
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  initializeEmailer
};
