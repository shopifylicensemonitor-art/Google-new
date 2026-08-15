const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api/auth';
const testEmail = `test.user.${Date.now()}@peakconix.com`;
const testPassword = 'Test@12345';
const testName = 'Test User';

let verificationCode = null;

async function testPhase2EmailVerification() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║       PHASE 2: EMAIL VERIFICATION FLOW TEST                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Sign up (should NOT return JWT)
    console.log('📝 Step 1: Test Signup (should create user with unverified email)');
    let res = await fetch(`${BASE_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword, name: testName })
    });

    const signupData = await res.json();
    console.log(`   Status: ${res.status}`);
    console.log(`   Response: ${JSON.stringify(signupData)}`);

    if (res.status !== 200) {
      throw new Error(`Signup failed: ${signupData.error}`);
    }

    if (signupData.token) {
      throw new Error('❌ ERROR: Signup should NOT return JWT token!');
    }

    console.log('   ✓ Signup successful, no JWT returned (as expected)');

    // Step 2: Try to sign in BEFORE email verification (should get 403)
    console.log('\n🔐 Step 2: Test Signin BEFORE email verification (should get 403)');
    res = await fetch(`${BASE_URL}/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });

    const signinData = await res.json();
    console.log(`   Status: ${res.status}`);
    console.log(`   Response: ${JSON.stringify(signinData)}`);

    if (res.status !== 403) {
      throw new Error(`❌ ERROR: Should get 403 (Forbidden) but got ${res.status}`);
    }

    if (signinData.error && (signinData.error.toLowerCase().includes('verif') || signinData.unverified)) {
      console.log('   ✓ Got 403 - Email verification required (as expected)');
    } else {
      throw new Error(`❌ ERROR: Expected verification error message but got: ${signinData.error}`);
    }

    // Step 3: Simulate getting verification code from database
    // In real test, this would be extracted from email or database
    console.log('\n📧 Step 3: Get verification code (checking database)');
    
    // For now, we'll need to manually set this or fetch from a test endpoint
    // Let's use a hardcoded approach or check server logs
    console.log('   ⚠️  NOTE: In real test, verification code would come from email');
    console.log('   ⚠️  Set verificationCode manually or check server logs');
    
    // Mock: In production test, you'd get this from email
    // For now, let's skip to resend verification test
    console.log('\n🔄 Step 4: Test Resend Verification Code');
    res = await fetch(`${BASE_URL}/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });

    const resendData = await res.json();
    console.log(`   Status: ${res.status}`);
    console.log(`   Response: ${JSON.stringify(resendData)}`);

    if (res.status !== 200) {
      throw new Error(`Resend failed: ${resendData.error}`);
    }

    console.log('   ✓ Resend verification successful');

    // Step 5: Try to verify with wrong code
    console.log('\n❌ Step 5: Test Verify Email with wrong code');
    res = await fetch(`${BASE_URL}/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, code: '999999' })
    });

    const wrongVerifyData = await res.json();
    console.log(`   Status: ${res.status}`);
    console.log(`   Response: ${JSON.stringify(wrongVerifyData)}`);

    if (res.status === 200) {
      throw new Error('❌ ERROR: Wrong code should not verify email!');
    }

    console.log('   ✓ Wrong code rejected (as expected)');

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                 PHASE 2 TEST SUMMARY                           ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log('║ ✓ Signup: No JWT returned (email not verified)                  ║');
    console.log('║ ✓ Signin: Returns 403 when email not verified                   ║');
    console.log('║ ✓ Resend: Verification code resend works                        ║');
    console.log('║ ✓ Verify: Wrong code rejected                                   ║');
    console.log('║                                                                 ║');
    console.log('║ TODO: Test with actual verification code (from email/DB)        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    process.exit(1);
  }
}

// Run test
testPhase2EmailVerification().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
