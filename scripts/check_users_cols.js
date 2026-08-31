require('dotenv').config();
const { getDb } = require('../db');

async function checkUsersTable() {
  const db = await getDb();
  const cols = await db.prepare(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND table_schema = 'public'
    ORDER BY ordinal_position
  `).all();
  console.log('Columns in public.users:');
  cols.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));
  process.exit(0);
}
checkUsersTable();
