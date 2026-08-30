/**
 * scripts/enable_all_rls.js
 * Enables Row Level Security on all public tables in Supabase.
 */

require('dotenv').config();
const { getDb } = require('../db');

async function enableAllRLS() {
  console.log('--- Checking and Enabling RLS on All Public Tables ---');
  const db = await getDb();

  // Find all tables in public schema
  const tables = await db.prepare(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename ASC
  `).all();

  console.log(`Found ${tables.length} tables in public schema:`);

  for (const t of tables) {
    const isEnabled = t.rowsecurity === true || t.rowsecurity === 't' || t.rowsecurity === 1;
    if (!isEnabled) {
      console.log(`🔒 Enabling RLS on table: public.${t.tablename}...`);
      try {
        await db.exec(`ALTER TABLE public."${t.tablename}" ENABLE ROW LEVEL SECURITY;`);
        console.log(`✅ RLS enabled on: public.${t.tablename}`);
      } catch (err) {
        console.error(`❌ Failed to enable RLS on public.${t.tablename}:`, err.message);
      }
    } else {
      console.log(`  🛡️  RLS already active on: public.${t.tablename}`);
    }
  }

  // Verification pass
  console.log('\n--- Verifying All Public Tables ---');
  const verifyTables = await db.prepare(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename ASC
  `).all();

  let unsecureCount = 0;
  for (const t of verifyTables) {
    const isSecure = t.rowsecurity === true || t.rowsecurity === 't' || t.rowsecurity === 1;
    if (!isSecure) {
      console.error(`❌ UNSECURE: public.${t.tablename} still has RLS disabled!`);
      unsecureCount++;
    }
  }

  if (unsecureCount === 0) {
    console.log(`\n🎉 100% of public tables (${verifyTables.length}/${verifyTables.length}) have Row Level Security ENABLED!`);
    console.log('Anonymous and unauthorized client access is completely blocked.');
  } else {
    console.error(`\n⚠️  ${unsecureCount} tables remain unsecure.`);
    process.exit(1);
  }

  process.exit(0);
}

enableAllRLS().catch(err => {
  console.error('Fatal error enabling RLS:', err);
  process.exit(1);
});
