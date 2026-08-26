const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runCleanup() {
  console.log('--- Starting Database Cleanup & Normalization ---');

  try {
    // 1. Purge all queue rows that are orphaned or test runs
    const queueRes = await pool.query('DELETE FROM queue');
    console.log(`[Queue] Deleted ${queueRes.rowCount} rows.`);

    // 2. Purge old test campaigns & campaign steps
    const stepsRes = await pool.query('DELETE FROM campaign_steps');
    console.log(`[Campaign Steps] Deleted ${stepsRes.rowCount} rows.`);

    const recipRes = await pool.query('DELETE FROM campaign_recipients');
    console.log(`[Campaign Recipients] Deleted ${recipRes.rowCount} rows.`);

    const campRes = await pool.query('DELETE FROM campaigns');
    console.log(`[Campaigns] Deleted ${campRes.rowCount} rows.`);

    // 3. Purge logs
    const logsRes = await pool.query('DELETE FROM logs');
    console.log(`[Logs] Deleted ${logsRes.rowCount} rows.`);

    // 4. Purge stale test contacts
    const contactsRes = await pool.query('DELETE FROM contacts');
    console.log(`[Contacts] Deleted ${contactsRes.rowCount} rows.`);

    // 5. Purge stale accounts so users can cleanly connect/reconnect their accounts
    const accsRes = await pool.query('DELETE FROM accounts');
    console.log(`[Accounts] Deleted ${accsRes.rowCount} rows.`);

    // 6. Purge stale domains
    const domsRes = await pool.query('DELETE FROM domains');
    console.log(`[Domains] Deleted ${domsRes.rowCount} rows.`);

    // 7. Ensure schema constraints and user_id columns are in place
    await pool.query(`
      ALTER TABLE queue ADD COLUMN IF NOT EXISTS user_id INTEGER;
      ALTER TABLE queue ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id INTEGER;
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS user_id INTEGER;
      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS user_id INTEGER;
      ALTER TABLE logs ADD COLUMN IF NOT EXISTS user_id INTEGER;
      ALTER TABLE templates ADD COLUMN IF NOT EXISTS user_id INTEGER;
      ALTER TABLE domains ADD COLUMN IF NOT EXISTS user_id INTEGER;
      ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS user_id INTEGER;

      CREATE INDEX IF NOT EXISTS idx_queue_user_status ON queue(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
      CREATE INDEX IF NOT EXISTS idx_domains_user ON domains(user_id);
    `);
    console.log('[Schema] Indexes and user_id columns verified.');

    console.log('--- Database Cleanup Completed Successfully ---');
  } catch (err) {
    console.error('Cleanup Error:', err);
  } finally {
    await pool.end();
  }
}

runCleanup();
