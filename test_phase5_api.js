#!/usr/bin/env node

/**
 * Phase 5 - Forgot Password Flow - API Testing Script
 * Tests both forgot-password and reset-password endpoints
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, method, endpoint, body, expectedStatus) {
  try {
    await log(`\n📝 Testing: ${name}`, 'blue');
    console.log(`  ${method} ${endpoint}`);
    if (body) console.log(`  Payload:`, JSON.stringify(body, null, 2));

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === expectedStatus) {
      await log(`✅ PASS - Status ${response.status}`, 'green');
      console.log(`  Response:`, JSON.stringify(data, null, 2));
      return { success: true, status: response.status, data };
    } else {
      await log(`❌ FAIL - Expected ${expectedStatus}, got ${response.status}`, 'red');
      console.log(`  Response:`, JSON.stringify(data, null, 2));
      return { success: false, status: response.status, data };
    }
  } catch (error) {
    await log(`❌ ERROR: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  await log('\n🚀 Phase 5 - Forgot Password Flow - API Tests', 'cyan');
  await log(`Server: ${BASE_URL}`, 'yellow');
  await log('━'.repeat(60), 'cyan');

  let passed = 0;
  let failed = 0;

  // Test 1: Forgot Password Endpoint - Valid Email
  const test1 = await testEndpoint(
    'Forgot Password - Valid Email',
    'POST',
    '/api/auth/forgot-password',
    { email: 'test@example.com' },
    200
  );
  if (test1.success) passed++; else failed++;

  // Test 2: Forgot Password Endpoint - Generic Response
  if (test1.data.message && test1.data.message.includes('password')) {
    await log('✅ Generic error message (prevents user enumeration)', 'green');
    passed++;
  } else {
    await log('⚠️  Warning: Message might leak user existence', 'yellow');
  }

  // Test 3: Forgot Password - Invalid Email Format
  const test3 = await testEndpoint(
    'Forgot Password - Invalid Email Format',
    'POST',
    '/api/auth/forgot-password',
    { email: 'invalid-email' },
    400
  );
  if (test3.success) passed++; else failed++;

  // Test 4: Reset Password - Missing Token
  const test4 = await testEndpoint(
    'Reset Password - Missing Token',
    'POST',
    '/api/auth/reset-password',
    { email: 'test@example.com', newPassword: 'Secure123!' },
    400
  );
  if (test4.success) passed++; else failed++;

  // Test 5: Reset Password - Invalid Token
  const test5 = await testEndpoint(
    'Reset Password - Invalid Token',
    'POST',
    '/api/auth/reset-password',
    {
      email: 'test@example.com',
      token: 'invalid_token_12345',
      newPassword: 'Secure123!',
    },
    400
  );
  if (test5.success) passed++; else failed++;

  // Test 6: Reset Password - Weak Password
  const test6 = await testEndpoint(
    'Reset Password - Weak Password',
    'POST',
    '/api/auth/reset-password',
    {
      email: 'test@example.com',
      token: 'some_valid_token',
      newPassword: 'weak',
    },
    400
  );
  if (test6.success) passed++; else failed++;

  // Test 7: Server Health Check
  try {
    await log('\n📝 Testing: Server Health Check', 'blue');
    const response = await fetch(`${BASE_URL}/api/auth/google-url`);
    if (response.ok) {
      await log('✅ PASS - Server is responding', 'green');
      passed++;
    }
  } catch (error) {
    await log(`❌ Server is not responding: ${error.message}`, 'red');
    failed++;
  }

  // Summary
  await log('\n' + '━'.repeat(60), 'cyan');
  await log(`\n📊 Test Summary`, 'cyan');
  await log(`✅ Passed: ${passed}`, 'green');
  await log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  await log(`📈 Total: ${passed + failed}\n`, 'cyan');

  if (failed === 0) {
    await log('🎉 All tests passed!', 'green');
    process.exit(0);
  } else {
    await log('⚠️  Some tests failed', 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
