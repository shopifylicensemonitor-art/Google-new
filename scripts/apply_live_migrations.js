/**
 * scripts/apply_live_migrations.js
 * Applies missing ALTER TABLE and CREATE INDEX statements directly to live Supabase DB.
 */

require('dotenv').config();
const { getDb } = require('../db');

async function applyMigrations() {
  console.log('--- Applying Live Database Migrations ---');
  const db = await getDb();

  const migrations = [
    // Users columns for OTP & refresh token
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code TEXT;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_expires_at TIMESTAMPTZ;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_id INTEGER;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_role TEXT DEFAULT 'member';`,

    // Accounts columns for warmup
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS warmup_enabled BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS warmup_daily_target INTEGER DEFAULT 40;`,
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS user_id INTEGER;`,
    `ALTER TABLE accounts ADD COLUMN IF NOT EXISTS workspace_id INTEGER;`,

    // Contacts status column
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id INTEGER;`,
    `ALTER TABLE contacts ADD COLUMN IF NOT EXISTS workspace_id INTEGER;`,

    // Campaigns columns
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS user_id INTEGER;`,
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS workspace_id INTEGER;`,

    // Queue atomic lock columns
    `ALTER TABLE queue ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;`,
    `ALTER TABLE queue ADD COLUMN IF NOT EXISTS locked_by TEXT;`,
    `ALTER TABLE queue ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0;`,
    `ALTER TABLE queue ADD COLUMN IF NOT EXISTS last_error TEXT;`,
    `ALTER TABLE queue ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;`,
    `ALTER TABLE queue ADD COLUMN IF NOT EXISTS user_id INTEGER;`,
    `ALTER TABLE queue ADD COLUMN IF NOT EXISTS workspace_id INTEGER;`,

    // Missing performance indexes
    `CREATE INDEX IF NOT EXISTS idx_inbox_user_id ON inbox_messages(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_queue_status_sched ON queue(status, scheduled_at) WHERE status = 'pending';`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_list_name ON contacts(list_name);`,
    `CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);`
  ];

  for (const sql of migrations) {
    try {
      await db.exec(sql);
      console.log(`✅ Applied: ${sql.trim().replace(/\s+/g, ' ')}`);
    } catch (err) {
      console.error(`❌ Migration failed: ${sql}`, err.message);
    }
  }

  console.log('--- Migrations Applied Successfully! ---');
  process.exit(0);
}

applyMigrations().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
