const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    for (const table of ['users', 'accounts', 'campaigns', 'queue', 'contacts', 'logs', 'domains', 'inbox_messages', 'workspaces', 'workspace_members']) {
      const cols = await pool.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
        [table]
      );
      console.log(`=== Table: ${table} ===`);
      console.log(cols.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
    }

    console.log('\n=== Sample Accounts ===');
    const accs = await pool.query('SELECT * FROM accounts LIMIT 5');
    console.log(accs.rows.map(r => ({ id: r.id, email: r.email, user_id: r.user_id, workspace_id: r.workspace_id, status: r.status, type: r.type })));

    console.log('\n=== Sample Campaigns ===');
    const camps = await pool.query('SELECT * FROM campaigns LIMIT 5');
    console.log(camps.rows.map(r => ({ id: r.id, name: r.name, user_id: r.user_id, workspace_id: r.workspace_id, status: r.status })));

    console.log('\n=== Sample Domains ===');
    const doms = await pool.query('SELECT * FROM domains LIMIT 5');
    console.log(doms.rows);

    console.log('\n=== Queue status counts ===');
    const qStats = await pool.query('SELECT status, COUNT(*) FROM queue GROUP BY status');
    console.log(qStats.rows);

    console.log('\n=== Queue user_id / workspace_id check ===');
    const qSample = await pool.query('SELECT id, campaign_id, user_id, workspace_id, recipient_email, status FROM queue LIMIT 5');
    console.log(qSample.rows);

    console.log('\n=== Contacts user_id / workspace_id check ===');
    const cSample = await pool.query('SELECT id, list_name, user_id, workspace_id, email FROM contacts LIMIT 5');
    console.log(cSample.rows);

    console.log('\n=== Users sample ===');
    const uSample = await pool.query('SELECT id, email, role, created_at FROM users LIMIT 10');
    console.log(uSample.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

run();
