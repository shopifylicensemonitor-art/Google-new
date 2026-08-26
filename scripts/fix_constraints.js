const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixConstraints() {
  try {
    console.log('Checking and adjusting accounts table constraints...');
    
    // Check if unique constraint on accounts(email) exists
    await pool.query(`
      ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_email_key;
      DROP INDEX IF EXISTS idx_accounts_email;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_email_user ON accounts(LOWER(email), user_id);
    `);

    console.log('Constraint adjusted: email is now unique per user_id!');
  } catch (err) {
    console.error('Error fixing constraints:', err);
  } finally {
    await pool.end();
  }
}

fixConstraints();
