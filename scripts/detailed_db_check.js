const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('=== All Users ===');
    const users = await pool.query('SELECT id, email, name, role FROM users ORDER BY id ASC');
    console.log(users.rows);

    console.log('=== All Accounts ===');
    const accs = await pool.query('SELECT id, email, user_id, status, type FROM accounts ORDER BY id ASC');
    console.log(accs.rows);

    console.log('=== All Domains ===');
    const doms = await pool.query('SELECT id, domain, user_id, status FROM domains ORDER BY id ASC');
    console.log(doms.rows);

    console.log('=== All Campaigns ===');
    const camps = await pool.query('SELECT id, name, user_id, total_contacts, sent_count, status FROM campaigns ORDER BY id ASC');
    console.log(camps.rows);

    console.log('=== All Contacts Count by User ID ===');
    const contactsByUser = await pool.query('SELECT user_id, list_name, COUNT(*) FROM contacts GROUP BY user_id, list_name');
    console.log(contactsByUser.rows);

    console.log('=== Queue count by campaign_id and user_id ===');
    const qCount = await pool.query('SELECT campaign_id, user_id, status, COUNT(*) FROM queue GROUP BY campaign_id, user_id, status');
    console.log(qCount.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
