const { getDb } = require('./db');

(async () => {
  try {
    const db = await getDb();
    console.log('=== ACCOUNTS ===');
    const accounts = await db.prepare("SELECT id, email, status, daily_sent, daily_limit, type, user_id, token_expiry FROM accounts").all();
    console.log(accounts);

    console.log('\n=== CAMPAIGNS (Active / Sending) ===');
    const campaigns = await db.prepare("SELECT id, name, status, sent_count, failed_count, total_contacts, user_id FROM campaigns").all();
    console.log(campaigns);

    console.log('\n=== QUEUE STATUS BREAKDOWN ===');
    const queueSummary = await db.prepare("SELECT status, COUNT(*) as count FROM queue GROUP BY status").all();
    console.log(queueSummary);

    console.log('\n=== PENDING / FAILED QUEUE ITEMS ===');
    const pendingItems = await db.prepare("SELECT id, campaign_id, recipient_email, account_id, status, scheduled_at, error, retry_count, user_id FROM queue WHERE status IN ('pending', 'failed', 'sending') ORDER BY id DESC LIMIT 10").all();
    console.log(pendingItems);

    console.log('\n=== USERS (Auth check) ===');
    const users = await db.prepare("SELECT id, email, name, role, email_verified, auth_provider, created_at FROM users ORDER BY id DESC LIMIT 5").all();
    console.log(users);
  } catch (err) {
    console.error('Error running check:', err);
  }
})();
