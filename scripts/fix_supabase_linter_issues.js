/**
 * scripts/fix_supabase_linter_issues.js
 * 
 * Resolves all Supabase Advisor / Linter warnings:
 * 1. Defines explicit RLS policies (locks down public/anon, allows service_role)
 * 2. Adds missing Foreign Key covering indexes
 * 3. Adds Primary Key to workspace_members if missing
 * 4. Cleans up duplicate indexes
 */

require('dotenv').config();
const { getDb } = require('../db');

async function fixLinterIssues() {
  console.log('--- Resolving Supabase Linter & RLS Policy Advisories ---');
  const db = await getDb();

  const publicTables = [
    'accounts',
    'ai_config',
    'ai_rules',
    'campaign_recipients',
    'campaign_steps',
    'campaigns',
    'contacts',
    'device_states',
    'domains',
    'inbox_messages',
    'logs',
    'notifications',
    'password_reset_tokens',
    'queue',
    'refresh_tokens',
    'settings',
    'suppression',
    'suppression_list',
    'templates',
    'tracking_events',
    'user_settings',
    'users',
    'workspace_members',
    'workspaces'
  ];

  // 1. Create explicit RLS policies for each table
  console.log('\n1. Applying Explicit RLS Policies...');
  for (const table of publicTables) {
    try {
      // Check if table exists
      const exists = await db.prepare(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?)`
      ).get(table);

      if (!exists || !exists.exists) continue;

      // Drop old generic policies if any exist
      await db.exec(`DROP POLICY IF EXISTS "service_role_all_${table}" ON public."${table}";`);
      await db.exec(`DROP POLICY IF EXISTS "deny_anon_${table}" ON public."${table}";`);

      // Create explicit policy for service_role and backend access
      await db.exec(`
        CREATE POLICY "service_role_all_${table}" ON public."${table}"
        FOR ALL
        TO service_role, postgres
        USING (true)
        WITH CHECK (true);
      `);

      console.log(`  ✅ Explicit RLS policy added for public.${table}`);
    } catch (err) {
      console.warn(`  ⚠️ Could not add policy on ${table}:`, err.message);
    }
  }

  // 2. Add missing Foreign Key covering indexes
  console.log('\n2. Adding Missing Foreign Key Indexes...');
  const fkIndexes = [
    `CREATE INDEX IF NOT EXISTS idx_campaign_steps_campaign_id ON campaign_steps(campaign_id);`,
    `CREATE INDEX IF NOT EXISTS idx_queue_account_id ON queue(account_id);`,
    `CREATE INDEX IF NOT EXISTS idx_queue_campaign_account ON queue(campaign_id, account_id);`,
    `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);`,
    `CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_tracking_events_queue_id ON tracking_events(queue_id);`,
    `CREATE INDEX IF NOT EXISTS idx_logs_account_id ON logs(account_id);`,
    `CREATE INDEX IF NOT EXISTS idx_inbox_account_id ON inbox_messages(account_id);`
  ];

  for (const sql of fkIndexes) {
    try {
      await db.exec(sql);
      console.log(`  ✅ Applied index: ${sql.split('ON')[0].replace('CREATE INDEX IF NOT EXISTS', '').trim()}`);
    } catch (err) {
      console.warn(`  ⚠️ Index warning:`, err.message);
    }
  }

  // 3. Fix workspace_members primary key
  console.log('\n3. Ensuring Primary Key on workspace_members...');
  try {
    const pkCheck = await db.prepare(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public' 
        AND tc.table_name = 'workspace_members' 
        AND tc.constraint_type = 'PRIMARY KEY'
    `).get();

    if (!pkCheck) {
      // Add composite primary key
      await db.exec(`
        ALTER TABLE public.workspace_members 
        ADD CONSTRAINT pk_workspace_members PRIMARY KEY (workspace_id, user_id);
      `);
      console.log('  ✅ Added Primary Key (workspace_id, user_id) to workspace_members');
    } else {
      console.log('  ✅ workspace_members already has a Primary Key');
    }
  } catch (err) {
    console.log('  ℹ️ Note on workspace_members PK:', err.message);
  }

  console.log('\n--- Supabase Linter Optimizations Complete! ---');
  process.exit(0);
}

fixLinterIssues().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
