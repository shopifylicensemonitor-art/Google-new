const { getDb } = require('./db');

(async () => {
  try {
    const db = await getDb();
    const email = process.env.OTP_EMAIL;
    if (!email) {
      console.log('OTP_EMAIL not set');
      process.exit(1);
    }
    const user = await db.prepare('SELECT id, email, verification_code FROM users WHERE email = ?').get(email);
    if (user) {
      console.log(user.verification_code);
    } else {
      console.log('USER_NOT_FOUND');
    }
  } catch (err) {
    console.error('ERROR:', err.message);
  }
  process.exit(0);
})();
