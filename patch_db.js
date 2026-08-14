const { getDb } = require('./db');
(async () => {
  const db = await getDb();
  await db.exec("ALTER TABLE campaign_steps ADD COLUMN trigger_event TEXT DEFAULT 'wait'");
  console.log("Altered campaign_steps");
  process.exit(0);
})();
