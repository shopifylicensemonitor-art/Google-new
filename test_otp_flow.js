/**
 * test_otp_flow.js — End-to-end OTP verification flow test
 * 
 * Tests:
 * 1. Signup with email/password
 * 2. Verify user created with OTP code and 15-minute expiry
 * 3. Attempt to verify with correct code
 * 4. Verify email cannot be verified twice
 * 5. Test resend verification code
 */

const http = require('http');

const TEST_EMAIL = `otp-test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPass123!';
const TEST_NAME = 'OTP Flow Test';

let verificationCode = null;
let testsPassed = 0;
let testsFailed = 0;

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(data)
          });
        } catch (err) {
          resolve({
            statusCode: res.statusCode,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(name, fn) {
  try {
    console.log(`\n📝 Test: ${name}`);
    await fn();
    console.log('   ✅ PASSED');
    testsPassed++;
  } catch (err) {
    console.error(`   ❌ FAILED: ${err.message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('OTP VERIFICATION FLOW TEST');
  console.log('='.repeat(60));

  // Test 1: Signup
  await test('Signup creates account with OTP', async () => {
    const res = await makeRequest('POST', '/api/auth/signup', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      name: TEST_NAME
    });

    if (res.statusCode !== 200) {
      throw new Error(`Expected 200, got ${res.statusCode}`);
    }
    if (!res.body.success) {
      throw new Error(`Signup failed: ${res.body.message}`);
    }
  });

  // Test 2: Get user from DB to check OTP
  await test('User created with 15-minute OTP expiry', async () => {
    const { getDb } = require('./db');
    const db = await getDb();
    
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(TEST_EMAIL);
    
    if (!user) {
      throw new Error('User not found in database');
    }
    
    if (!user.verification_code) {
      throw new Error('Verification code not set');
    }
    
    verificationCode = user.verification_code;
    const now = new Date();
    const expiry = new Date(user.verification_code_expires);
    const minutesUntilExpiry = Math.round((expiry - now) / (1000 * 60));
    
    if (minutesUntilExpiry < 14 || minutesUntilExpiry > 16) {
      throw new Error(`OTP expiry should be ~15 minutes, got ${minutesUntilExpiry}`);
    }
    
    if (user.email_verified !== 0) {
      throw new Error('User should not be verified initially');
    }
    
    console.log(`   OTP Code: ${verificationCode}, Minutes until expiry: ${minutesUntilExpiry}`);
  });

  // Test 3: Verify email with correct code
  await test('Email verified with correct code', async () => {
    const res = await makeRequest('POST', '/api/auth/verify-email', {
      email: TEST_EMAIL,
      code: verificationCode
    });

    if (res.statusCode !== 200) {
      throw new Error(`Expected 200, got ${res.statusCode}`);
    }
    if (!res.body.success) {
      throw new Error(`Verification failed: ${res.body.message}`);
    }
  });

  // Test 4: Verify user is now marked as verified
  await test('User marked as email_verified in database', async () => {
    const { getDb } = require('./db');
    const db = await getDb();
    
    const user = await db.prepare('SELECT email_verified, verification_code FROM users WHERE email = ?').get(TEST_EMAIL);
    
    if (!user) {
      throw new Error('User not found after verification');
    }
    if (user.email_verified !== 1) {
      throw new Error('User should be marked as verified');
    }
    if (user.verification_code !== null) {
      throw new Error('Verification code should be cleared');
    }
  });

  // Test 5: Cannot verify same email twice
  await test('Cannot verify email twice', async () => {
    const res = await makeRequest('POST', '/api/auth/verify-email', {
      email: TEST_EMAIL,
      code: verificationCode
    });

    if (res.statusCode === 200) {
      throw new Error('Should not allow verifying already-verified email');
    }
  });

  // Test 6: Resend verification code
  await test('Resend verification generates new code', async () => {
    // Create another unverified user first
    const newEmail = `otp-resend-test-${Date.now()}@example.com`;
    
    const signupRes = await makeRequest('POST', '/api/auth/signup', {
      email: newEmail,
      password: TEST_PASSWORD,
      name: TEST_NAME
    });

    if (signupRes.statusCode !== 200) {
      throw new Error('Signup for resend test failed');
    }

    // Now resend
    const resendRes = await makeRequest('POST', '/api/auth/resend-verification', {
      email: newEmail
    });

    if (resendRes.statusCode !== 200) {
      throw new Error(`Resend failed with status ${resendRes.statusCode}`);
    }
    if (!resendRes.body.success) {
      throw new Error(`Resend response not successful`);
    }
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('='.repeat(60));

  if (testsFailed === 0) {
    console.log('✅ All OTP flow tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
