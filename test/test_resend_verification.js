/**
 * test/test_resend_verification.js
 * Test resend verification endpoint directly.
 */

require('dotenv').config();
const { getDb } = require('../db');
const { sendVerificationEmail } = require('../utils/email');

async function testResend() {
  console.log('--- Testing Resend Verification Flow ---');
  const db = await getDb();
  const testEmail = process.env.SMTP_USER || process.env.GMAIL_USER;

  // 1. Ensure user exists
  const existing = await db.prepare('SELECT id, email FROM users WHERE LOWER(email) = LOWER(?)').get(testEmail);
  if (!existing) {
    await db.prepare('INSERT INTO users (email, name, role) VALUES (?, ?, ?)').run(testEmail, 'Test Admin', 'admin');
  }

  // 2. Generate and store fresh 6-digit code
  const freshCode = Math.floor(100000 + Math.random() * 900000).toString();
  const codeExpires = new Date(Date.now() + 15 * 60 * 1000);

  await db.prepare(
    'UPDATE users SET verification_code = ?, verification_code_expires = ?, email_verified = false WHERE LOWER(email) = LOWER(?)'
  ).run(freshCode, codeExpires.toISOString(), testEmail);

  console.log(`Generated OTP: ${freshCode} for ${testEmail}`);

  // 3. Send email
  const link = `http://localhost:3000/verify-email?code=${freshCode}&email=${encodeURIComponent(testEmail)}`;
  await sendVerificationEmail(testEmail, freshCode, link);

  console.log('✅ Resend OTP verification email sent successfully!');
  process.exit(0);
}

testResend().catch(err => {
  console.error('❌ Resend test failed:', err);
  process.exit(1);
});
