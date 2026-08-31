require('dotenv').config();
const nodemailer = require('nodemailer');

async function testGmailService() {
  console.log('--- Testing Gmail Direct Transport ---');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || process.env.SMTP_USER,
      pass: process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS,
    }
  });

  const targetEmail = process.env.GMAIL_USER || process.env.SMTP_USER;
  console.log('Sending test email to:', targetEmail);

  const info = await transporter.sendMail({
    from: `"Peak Xender" <${targetEmail}>`,
    to: targetEmail,
    subject: 'Peak Xender OTP Test (Direct Gmail Service)',
    text: 'Your Peak Xender verification code is: 849201',
    html: '<b>Your Peak Xender verification code is: 849201</b>'
  });

  console.log('✅ Email sent successfully! Message ID:', info.messageId);
}

testGmailService().catch(err => {
  console.error('❌ Gmail service error:', err);
  process.exit(1);
});
