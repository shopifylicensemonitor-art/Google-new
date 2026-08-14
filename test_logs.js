const { getDb } = require('./db');
(async () => {
  const db = await getDb();
  const rows = await db.prepare("SELECT created_at FROM logs WHERE status = 'sent' LIMIT 5").all();
  console.log(rows);
  process.exit(0);
})();
