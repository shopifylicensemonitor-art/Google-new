const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api/auth';

async function testPhase3PasswordStrength() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║       PHASE 3: PASSWORD STRENGTH VALIDATION TEST               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const testCases = [
    {
      name: 'Weak Password: Only lowercase',
      email: `test.weak1.${Date.now()}@peakconix.com`,
      password: 'onlylowercase',
      name: 'Test User',
      shouldFail: true,
      expectedErrors: ['at least one uppercase', 'at least one number', 'special character']
    },
    {
      name: 'Weak Password: No special character',
      email: `test.weak2.${Date.now()}@peakconix.com`,
      password: 'NoSpecial123',
      name: 'Test User',
      shouldFail: true,
      expectedErrors: ['special character']
    },
    {
      name: 'Weak Password: No number',
      email: `test.weak3.${Date.now()}@peakconix.com`,
      password: 'NoNumber!Char',
      name: 'Test User',
      shouldFail: true,
      expectedErrors: ['at least one number']
    },
    {
      name: 'Weak Password: Too short',
      email: `test.weak4.${Date.now()}@peakconix.com`,
      password: 'Weak1!',
      name: 'Test User',
      shouldFail: true,
      expectedErrors: ['8 characters']
    },
    {
      name: 'Strong Password: Meets all requirements',
      email: `test.strong.${Date.now()}@peakconix.com`,
      password: 'StrongP@ssw0rd',
      name: 'Test User',
      shouldFail: false
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.name}`);
    console.log(`   Password: ${testCase.password}`);

    try {
      const res = await fetch(`${BASE_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testCase.email,
          password: testCase.password,
          name: testCase.name
        })
      });

      const data = await res.json();

      if (testCase.shouldFail) {
        if (res.status === 400 && data.requirements) {
          console.log(`   ✓ Rejected as expected`);
          console.log(`   Errors: ${data.requirements.slice(0, 2).join(', ')}`);
          passed++;
        } else {
          console.log(`   ❌ Should have been rejected but wasn't`);
          console.log(`   Response: ${JSON.stringify(data)}`);
          failed++;
        }
      } else {
        if (res.status === 200) {
          console.log(`   ✓ Accepted as expected`);
          passed++;
        } else {
          console.log(`   ❌ Should have been accepted but got error`);
          console.log(`   Status: ${res.status}, Error: ${data.error || data.requirements}`);
          failed++;
        }
      }
    } catch (error) {
      console.log(`   ❌ Test error: ${error.message}`);
      failed++;
    }

    console.log('');
  }

  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                 PHASE 3 TEST SUMMARY                           ║');
  console.log('╠════════════════════════════════════════════════════════════════╣');
  console.log(`║ Passed: ${passed}/${testCases.length}`.padEnd(63) + '║');
  console.log(`║ Failed: ${failed}/${testCases.length}`.padEnd(63) + '║');
  console.log('║                                                                 ║');
  if (failed === 0) {
    console.log('║ ✓ All password strength validations working!                   ║');
  } else {
    console.log('║ ❌ Some validations failed - review above                      ║');
  }
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  process.exit(failed > 0 ? 1 : 0);
}

testPhase3PasswordStrength().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
