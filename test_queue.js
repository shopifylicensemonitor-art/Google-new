const { getDb } = require('./db');
(async () => {
  const db = await getDb();
  const rows = await db.prepare("SELECT sent_at FROM queue WHERE status = 'sent' LIMIT 5").all();
  console.log(rows);
  process.exit(0);
})();
