/**
 * test/test_send_otp.js
 * Test sending verification OTP email and print full diagnostic details.
 */

require('dotenv').config();
const { sendVerificationEmail } = require('../utils/email');

async function testOtp() {
  console.log('--- Testing OTP Email Dispatch ---');
  console.log('SMTP_HOST:', process.env.SMTP_HOST || 'smtp.gmail.com');
  console.log('SMTP_PORT:', process.env.SMTP_PORT || 587);
  console.log('SMTP_USER / GMAIL_USER:', process.env.SMTP_USER || process.env.GMAIL_USER || '(NOT SET)');
  console.log('SMTP_PASS / GMAIL_APP_PASSWORD:', (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD) ? '****** (SET)' : '(NOT SET)');

  const testEmail = process.env.SMTP_USER || process.env.GMAIL_USER || 'test@example.com';
  const testCode = '123456';
  const testLink = 'http://localhost:3000/verify-email?email=' + encodeURIComponent(testEmail) + '&code=' + testCode;

  console.log(`\nAttempting to send OTP email to: ${testEmail}...`);
  try {
    const success = await sendVerificationEmail(testEmail, testCode, testLink);
    console.log('Result:', success ? '✅ DISPATCH SUCCESS' : '⚠️ DISPATCH RETURNED FALSE/FALLBACK');
  } catch (err) {
    console.error('❌ DISPATCH ERROR:', err);
  }
}

testOtp();
