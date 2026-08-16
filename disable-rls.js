require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const TABLES = [
  'users', 'accounts', 'campaigns', 'contacts', 'queue', 'logs',
  'templates', 'refresh_tokens', 'password_reset_tokens', 'settings',
  'campaign_steps', 'campaign_recipients', 'device_states', 'ai_config',
  'ai_rules', 'inbox_messages', 'suppression_list', 'workspaces', 'workspace_members'
];

(async () => {
  console.log('Disabling RLS on all tables...\n');
  for (const table of TABLES) {
    try {
      await pool.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
      console.log(`  ✅ RLS disabled: ${table}`);
    } catch (e) {
      console.log(`  ⚠️  ${table}: ${e.message}`);
    }
  }
  console.log('\nDone! You can now see all data in the Supabase dashboard.');
  await pool.end();
  process.exit(0);
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
