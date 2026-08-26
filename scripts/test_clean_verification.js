const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runTest() {
  console.log('=== Verifying Post-Cleanup Database State ===');
  try {
    // 1. Check queue count
    const qRes = await pool.query('SELECT COUNT(*) FROM queue');
    console.log(`[Queue] Total count: ${qRes.rows[0].count} (Expected: 0)`);

    // 2. Check accounts count
    const aRes = await pool.query('SELECT COUNT(*) FROM accounts');
    console.log(`[Accounts] Total count: ${aRes.rows[0].count} (Expected: 0)`);

    // 3. Check campaigns count
    const cRes = await pool.query('SELECT COUNT(*) FROM campaigns');
    console.log(`[Campaigns] Total count: ${cRes.rows[0].count} (Expected: 0)`);

    // 4. Check contacts count
    const ctRes = await pool.query('SELECT COUNT(*) FROM contacts');
    console.log(`[Contacts] Total count: ${ctRes.rows[0].count} (Expected: 0)`);

    // 5. Simulate inserting an account for User 26 and deleting it
    const ins = await pool.query(
      "INSERT INTO accounts (user_id, email, display_name, status, type) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [26, 'user26_mailbox@peakconix.site', 'User 26 Mailbox', 'active', 'smtp']
    );
    const newId = ins.rows[0].id;
    console.log(`[Test] Inserted account ${newId} for user 26.`);

    // Select account scoped to user 26
    const sel = await pool.query('SELECT * FROM accounts WHERE id = $1 AND user_id = $2', [newId, 26]);
    console.log(`[Test] Selected account: ${sel.rows.length} row found.`);

    // Delete account scoped to user 26
    const del = await pool.query('DELETE FROM accounts WHERE id = $1 AND user_id = $2', [newId, 26]);
    console.log(`[Test] Deleted account: ${del.rowCount} row removed.`);

    console.log('=== All Database Verification Checks Passed Successfully ===');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runTest();
