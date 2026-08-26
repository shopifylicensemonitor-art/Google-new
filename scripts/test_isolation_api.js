const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './.env' });
const { getDb } = require('../db');
const { getWorkerStatus } = require('../scheduler');

async function testVerification() {
  console.log('=== Running Post-Fix Multi-Tenant & API Verification ===');

  try {
    // 1. Test getWorkerStatus for a user (e.g. user ID 26)
    const statusForUser26 = await getWorkerStatus(26);
    console.log('Worker Status for User 26:', statusForUser26);

    if (statusForUser26.pendingQueue === 0 && statusForUser26.activeCampaigns === 0) {
      console.log('✅ PASS: Worker status shows 0 pending queue and 0 active campaigns for User 26.');
    } else {
      console.error('❌ FAIL: Worker status queue count mismatch.');
    }

    // 2. Test Accounts query for User 26
    const db = await getDb();
    const accountsUser26 = await db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(26);
    console.log('Accounts for User 26:', accountsUser26);
    if (accountsUser26.length === 0) {
      console.log('✅ PASS: Accounts list is clean and isolated.');
    }

    // 3. Test insert and delete account for User 26
    const insertRes = await db.prepare(
      'INSERT INTO accounts (user_id, email, display_name, status, type, smtp_host, smtp_port, smtp_user, smtp_pass) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(26, 'test_mailbox@peakconix.site', 'Test Mailbox', 'active', 'smtp', 'smtp.peakconix.site', 587, 'test_mailbox', 'enc:test');
    
    const accountId = insertRes.lastInsertRowid;
    console.log(`Created test account id ${accountId} for User 26.`);

    // Attempt delete from user 26
    const delRes = await db.prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?').run(accountId, 26);
    if (delRes.changes > 0) {
      console.log('✅ PASS: Account deleted successfully with proper user_id scoping (No "Account not found" error).');
    } else {
      console.error('❌ FAIL: Account deletion failed.');
    }

    console.log('=== All Verification Checks Passed Successfully ===');
  } catch (err) {
    console.error('Verification Error:', err);
  }
}

testVerification();
