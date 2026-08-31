/**
 * utils/email.js — Transactional email service for verification and password reset.
 */

const nodemailer = require('nodemailer');
const logger = require('../logger');

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (user && pass) {
    // If using Gmail, use nodemailer's dedicated Gmail service transport (fast & highly reliable)
    if (host.includes('gmail.com') || (user && user.includes('@gmail.com'))) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
        pool: true,
        maxConnections: 3,
        connectionTimeout: 10000,
      });
    }

    // Generic SMTP for custom hosts
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      // Enforce TLS certificate verification for SMTP connections.
      tls: { rejectUnauthorized: true },
      connectionTimeout: 10000,
    });
  }
  return null;
}

function getFromAddress() {
  const explicit = process.env.SMTP_FROM || process.env.EMAIL_FROM;
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;

  if (explicit && explicit.includes('@')) {
    if (explicit.includes('<')) return explicit;
    return `"Peak Xender" <${explicit}>`;
  }

  if (user) {
    return `"Peak Xender" <${user}>`;
  }
  return '"Peak Xender" <noreply@peakconix.site>';
}

/**
 * Send 6-digit email verification code & activation link.
 */
async function sendVerificationEmail(toEmail, code, link) {
  const fromAddress = getFromAddress();
  const transporter = getTransporter();

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #635bff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Peak Xender</h1>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">High-Deliverability Email Console</p>
      </div>

      <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; border: 1px solid #edf2f7;">
        <p style="color: #334155; font-size: 14px; margin-top: 0; margin-bottom: 16px;">Your 6-digit verification code is:</p>
        <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #635bff; font-family: monospace; padding: 12px 20px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; display: inline-block; margin-bottom: 12px;">
          ${code}
        </div>
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">This code expires in 15 minutes.</p>
      </div>

      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${link}" style="display: inline-block; background-color: #635bff; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 13px; box-shadow: 0 2px 4px rgba(99, 91, 255, 0.2);">
          Verify Email Address &rarr;
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.5; margin: 0;">
        If you didn't request this verification, please ignore this email.
      </p>
    </div>
  `;

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `Your Peak Xender Verification Code`,
        text: `Your Peak Xender verification code was generated. Please check your inbox.`,
        html: htmlContent,
      });
      // Do NOT log the verification code itself. Keep only non-sensitive metadata.
      logger.info({ toEmail, messageId: info?.messageId }, 'Verification email sent via SMTP');
      return true;
    } catch (err) {
      logger.warn({ err: err.message, toEmail }, 'SMTP delivery failed; verification code generated but not delivered');
    }
  }

  // Fallback: DO NOT print the verification code to stdout or logs in cleartext.
  logger.info({ toEmail, link }, 'VERIFICATION CODE GENERATED (Local/Fallback) - code NOT logged for security');
  console.log(`\n========================================`);
  console.log(`[PEAK XENDER EMAIL VERIFICATION]`);
  console.log(`To: ${toEmail}`);
  console.log(`Verification Link: ${link}`);
  console.log(`========================================\n`);
  return true;
}

/**
 * Send password reset code & secure token link.
 */
async function sendPasswordResetEmail(toEmail, code, link) {
  const fromAddress = getFromAddress();
  const transporter = getTransporter();

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #635bff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">Peak Xender</h1>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Password Reset Request</p>
      </div>

      <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; border: 1px solid #edf2f7;">
        <p style="color: #334155; font-size: 14px; margin-top: 0; margin-bottom: 16px;">Click the button below to securely reset your account password:</p>
        <a href="${link}" style="display: inline-block; background-color: #635bff; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 13px; box-shadow: 0 2px 4px rgba(99, 91, 255, 0.2);">
          Reset My Password &rarr;
        </a>
        <p style="color: #94a3b8; font-size: 11px; margin: 16px 0 0 0;">This reset link expires in 60 minutes.</p>
      </div>

      <p style="color: #64748b; font-size: 12px; word-break: break-all;">
        Or copy and paste this URL into your browser:<br/>
        <a href="${link}" style="color: #635bff;">${link}</a>
      </p>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.5; margin: 0;">
        If you did not request a password reset, you can safely ignore this email.
      </p>
    </div>
  `;

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `Reset your Peak Xender Password`,
        text: `Reset your Peak Xender password by visiting: ${link}`,
        html: htmlContent,
      });
      logger.info({ toEmail, messageId: info?.messageId }, 'Password reset email sent via SMTP');
      return true;
    } catch (err) {
      logger.warn({ err: err.message, toEmail }, 'SMTP password reset delivery failed; logged link locally');
    }
  }

  logger.info({ toEmail, code, link }, 'PASSWORD RESET LINK GENERATED (Local/Fallback)');
  console.log(`\n========================================`);
  console.log(`[PEAK XENDER PASSWORD RESET]`);
  console.log(`To: ${toEmail}`);
  console.log(`Reset Link: ${link}`);
  console.log(`========================================\n`);
  return true;
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
