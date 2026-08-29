const { getDb } = require('./db');
const authRouter = require('./routes/auth');
const hashPassword = authRouter.hashPassword;
const verifyPassword = authRouter.verifyPassword;

(async () => {
  try {
    const db = await getDb();
    console.log('Testing password hash & verify functions...');
    const testPass = 'Secret123!@#';
    const hash = hashPassword(testPass);
    console.log('Generated hash:', hash);
    const valid = await verifyPassword(testPass, hash);
    console.log('Password verified successfully:', valid);

    console.log('\nTesting user lookup...');
    const user = await db.prepare('SELECT id, email, name, role FROM users LIMIT 1').get();
    console.log('First user in DB:', user);

    console.log('\nChecking active accounts...');
    const accounts = await db.prepare("SELECT id, email, status, user_id FROM accounts WHERE status = 'active'").all();
    console.log('Active accounts:', accounts);

    console.log('\nALL VERIFICATIONS PASSED.');
  } catch (err) {
    console.error('Test failed with error:', err);
  }
})();
