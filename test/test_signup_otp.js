/**
 * test/test_signup_otp.js
 * Test registering a user and sending OTP email.
 */

require('dotenv').config();
const http = require('http');
const express = require('express');
const app = require('../app');

async function testSignup() {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(3099, resolve));
  console.log('Test server running on port 3099');

  const testEmail = `test_otp_${Date.now()}@example.com`;
  console.log(`Testing signup for email: ${testEmail}...`);

  const res = await fetch('http://localhost:3099/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'StrongPassword123!@#',
      name: 'Test OTP User'
    })
  });

  const status = res.status;
  const data = await res.json();
  console.log('Signup response status:', status);
  console.log('Signup response body:', data);

  server.close();
  process.exit(status === 200 ? 0 : 1);
}

testSignup().catch(err => {
  console.error('Test signup failed:', err);
  process.exit(1);
});
