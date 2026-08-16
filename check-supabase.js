require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  // List all tables in public schema
  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log('\n=== Tables in Supabase (public schema) ===');
  if (tables.rows.length === 0) {
    console.log('  ⚠️  NO TABLES FOUND - database is empty!');
  } else {
    tables.rows.forEach(r => console.log('  ✅', r.table_name));
  }

  // Count rows in key tables
  console.log('\n=== Row counts ===');
  for (const t of ['users', 'accounts', 'campaigns', 'contacts', 'refresh_tokens']) {
    try {
      const r = await pool.query('SELECT COUNT(*) FROM ' + t);
      console.log('  ' + t + ':', r.rows[0].count, 'rows');
    } catch (e) {
      console.log('  ' + t + ': ERROR -', e.message);
    }
  }

  await pool.end();
  process.exit(0);
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
