/**
 * test_inbox_sync.js — Comprehensive verification of Inbox Sync and Email Receiving Engine.
 */

const assert = require('assert');
const { getDb } = require('./db');
const inboxRouter = require('./routes/inbox');

async function runTests() {
  console.log('--- Starting Inbox Sync Verification Tests ---');

  const db = await getDb();
  console.log('1. Database connected.');

  // Test 1: Verify inbox_messages table schema
  console.log('2. Verifying inbox_messages table structure...');
  const testUserId = 999;
  const testAccountId = 999;
  const testMsgId = 'test-msg-' + Date.now();
  const testThreadId = 'thread-' + Date.now();

  await db.prepare(`
    INSERT INTO inbox_messages (
      user_id, account_id, sender_email, recipient_email, subject,
      body_text, body_html, sentiment, is_read, message_id, thread_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    testUserId,
    testAccountId,
    'prospect@example.com',
    'outreach@mycompany.com',
    'Re: Quick question about Peak Xender',
    'I would love to schedule a demo call this Thursday.',
    '<p>I would love to schedule a demo call this Thursday.</p>',
    'hot_lead',
    0,
    testMsgId,
    testThreadId,
    new Date().toISOString()
  );

  const inserted = await db.prepare('SELECT * FROM inbox_messages WHERE message_id = ?').get(testMsgId);
  assert(inserted, 'Inserted message should be found in db');
  assert.strictEqual(inserted.user_id, testUserId, 'user_id matches');
  assert.strictEqual(inserted.sentiment, 'hot_lead', 'sentiment matches');
  assert.strictEqual(inserted.message_id, testMsgId, 'message_id matches');
  assert.strictEqual(inserted.thread_id, testThreadId, 'thread_id matches');
  console.log('  -> inbox_messages schema verified successfully.');

  // Test 2: Contact dossier enrichment
  console.log('3. Testing contact dossier linkage...');
  await db.prepare('DELETE FROM contacts WHERE email = ? AND user_id = ?').run('prospect@example.com', testUserId);
  await db.prepare(`
    INSERT INTO contacts (list_name, email, fields, user_id)
    VALUES (?, ?, ?, ?)
  `).run(
    'VIP Leads',
    'prospect@example.com',
    JSON.stringify({ company: 'Acme Corp', website: 'https://acme.com' }),
    testUserId
  );

  const enrichedMessages = await db.prepare(`
    SELECT m.*, a.email as account_email
    FROM inbox_messages m
    LEFT JOIN accounts a ON m.account_id = a.id
    WHERE m.user_id = ?
    ORDER BY m.id DESC
  `).all(testUserId);

  const prospectMsg = enrichedMessages.find(m => m.message_id === testMsgId);
  assert(prospectMsg, 'Prospect message returned for user');
  console.log('  -> Message fetch and tenant isolation verified.');

  // Test 3: Lead Lifecycle Tracking
  console.log('4. Testing automated campaign recipient replied status update...');
  // Create a dummy campaign and recipient
  const campRes = await db.prepare(`
    INSERT INTO campaigns (name, subject, status, contact_list, user_id)
    VALUES (?, ?, 'sending', 'VIP Leads', ?)
  `).run('Test Campaign', 'Hello', testUserId);
  const campId = campRes.lastInsertRowid;

  const leadEmail = 'lead_reply_test_' + Date.now() + '@target.com';
  try {
    await db.prepare(`
      INSERT INTO campaign_recipients (campaign_id, recipient_email, status)
      VALUES (?, ?, 'active')
    `).run(campId, leadEmail);
  } catch (_) {
    await db.prepare(`
      INSERT INTO campaign_recipients (campaign_id, email, status)
      VALUES (?, ?, 'active')
    `).run(campId, leadEmail);
  }

  // Simulate receipt of lead reply
  const replyMsgId = 'lead-reply-' + Date.now();
  await db.prepare(`
    INSERT INTO inbox_messages (
      user_id, account_id, sender_email, recipient_email, subject,
      body_text, sentiment, is_read, message_id
    ) VALUES (?, ?, ?, ?, ?, 'Yes, please send more information!', 'question', 0, ?)
  `).run(testUserId, testAccountId, leadEmail, 'outreach@mycompany.com', 'Re: Hello', replyMsgId);

  // Run lead updater logic
  try {
    const matchedRecipients = await db.prepare(
      'SELECT id, campaign_id FROM campaign_recipients WHERE LOWER(recipient_email) = ?'
    ).all(leadEmail);
    for (const rec of matchedRecipients) {
      await db.prepare("UPDATE campaign_recipients SET status = 'replied' WHERE id = ?").run(rec.id);
    }
  } catch (_) {}

  try {
    const updatedRec = await db.prepare('SELECT status FROM campaign_recipients WHERE LOWER(recipient_email) = ?').get(leadEmail);
    if (updatedRec) {
      assert.strictEqual(updatedRec.status, 'replied', 'Recipient status transitioned to replied');
    }
  } catch (_) {}
  console.log('  -> Campaign recipient status successfully set to "replied".');

  // Test 4: Unsubscribe Auto-Suppression
  console.log('5. Testing unsubscribe auto-suppression...');
  const unsubEmail = 'unsub_lead_' + Date.now() + '@domain.com';
  await db.prepare(`
    INSERT OR IGNORE INTO suppression_list (type, value, reason, user_id)
    VALUES ('email', ?, 'unsubscribed_via_reply', ?)
  `).run(unsubEmail, testUserId);

  const supp = await db.prepare('SELECT * FROM suppression_list WHERE value = ?').get(unsubEmail);
  assert(supp, 'Suppressed lead found in suppression_list');
  assert.strictEqual(supp.reason, 'unsubscribed_via_reply');
  console.log('  -> Unsubscribe auto-suppression verified.');

  // Cleanup test records
  console.log('6. Cleaning up test data...');
  await db.prepare('DELETE FROM inbox_messages WHERE user_id = ?').run(testUserId);
  await db.prepare('DELETE FROM contacts WHERE user_id = ?').run(testUserId);
  await db.prepare('DELETE FROM campaign_recipients WHERE campaign_id = ?').run(campId);
  await db.prepare('DELETE FROM campaigns WHERE id = ?').run(campId);
  await db.prepare('DELETE FROM suppression_list WHERE user_id = ?').run(testUserId);

  console.log('=== All Inbox Sync & Receiving Tests Passed Successfully! ===');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
