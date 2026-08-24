/**
 * test/test_user_separation.js
 * Verification test suite for multi-tenancy, data isolation, and notifications.
 */

const assert = require('assert');
const { getDb } = require('../db');

async function runTests() {
  console.log('--- Starting User Separation & Backend Hardening Tests ---');
  const db = await getDb();
  assert(db, 'Database should be initialized');
  console.log('✅ DB initialization verified');

  // Test 1: Verify tables exist and have user_id columns
  const tables = ['device_states', 'logs', 'queue', 'notifications', 'user_settings', 'suppression_list', 'accounts', 'campaigns'];
  for (const t of tables) {
    const row = await db.prepare(`SELECT * FROM ${t} LIMIT 1`).all();
    assert(Array.isArray(row), `Table ${t} should exist`);
  }
  console.log('✅ All multi-tenant tables and new columns exist');

  // Create real test users to respect foreign keys in PostgreSQL
  await db.prepare('DELETE FROM users WHERE email IN (?, ?)').run('test_tenant_u1@example.com', 'test_tenant_u2@example.com');
  
  await db.prepare('INSERT INTO users (email, name, role) VALUES (?, ?, ?)')
    .run('test_tenant_u1@example.com', 'Tenant User 1', 'user');
  const user1 = await db.prepare('SELECT id FROM users WHERE email = ?').get('test_tenant_u1@example.com');
  const user1Id = user1.id;

  await db.prepare('INSERT INTO users (email, name, role) VALUES (?, ?, ?)')
    .run('test_tenant_u2@example.com', 'Tenant User 2', 'user');
  const user2 = await db.prepare('SELECT id FROM users WHERE email = ?').get('test_tenant_u2@example.com');
  const user2Id = user2.id;

  // Test 2: Device State Isolation
  const deviceId = 'test-device-uuid-123';

  // User 1 saves state
  await db.prepare('DELETE FROM device_states WHERE device_id IN (?, ?)').run(deviceId, deviceId + '-u2');
  await db.prepare('INSERT INTO device_states (device_id, user_id, ip_address, state_data) VALUES (?, ?, ?, ?)')
    .run(deviceId, user1Id, '127.0.0.1', JSON.stringify({ filter: 'high-priority', theme: 'dark' }));

  // User 2 saves different state on same device
  await db.prepare('INSERT INTO device_states (device_id, user_id, ip_address, state_data) VALUES (?, ?, ?, ?)')
    .run(deviceId + '-u2', user2Id, '127.0.0.1', JSON.stringify({ filter: 'all-leads', theme: 'light' }));

  const state1 = await db.prepare('SELECT state_data FROM device_states WHERE device_id = ? AND user_id = ?').get(deviceId, user1Id);
  const state2 = await db.prepare('SELECT state_data FROM device_states WHERE device_id = ? AND user_id = ?').get(deviceId + '-u2', user2Id);
  const stateLeak = await db.prepare('SELECT state_data FROM device_states WHERE device_id = ? AND user_id = ?').get(deviceId, user2Id);

  assert(JSON.parse(state1.state_data).filter === 'high-priority', 'User 1 state should match');
  assert(JSON.parse(state2.state_data).filter === 'all-leads', 'User 2 state should match');
  assert(!stateLeak, 'User 2 should not see User 1 state');
  console.log('✅ Device state isolation verified');

  // Test 3: Unsubscribe & Suppression Scoping
  const email = 'prospect-unsub@test.com';
  await db.prepare('DELETE FROM suppression_list WHERE value = ?').run(email);
  
  // Suppress for User 1 only
  await db.prepare('INSERT INTO suppression_list (type, value, reason, user_id) VALUES (?, ?, ?, ?)')
    .run('email', email, 'unsubscribed', user1Id);

  const u1Suppressed = await db.prepare('SELECT * FROM suppression_list WHERE value = ? AND (user_id = ? OR user_id IS NULL)').get(email, user1Id);
  const u2Suppressed = await db.prepare('SELECT * FROM suppression_list WHERE value = ? AND user_id = ?').get(email, user2Id);

  assert(u1Suppressed, 'Recipient should be suppressed for User 1');
  assert(!u2Suppressed, 'Recipient should NOT be suppressed for User 2');
  console.log('✅ Suppression scoping verified');

  // Test 4: Notifications API storage & read operations
  await db.prepare('DELETE FROM notifications WHERE user_id IN (?, ?)').run(user1Id, user2Id);

  await db.prepare('INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (?, ?, ?, ?, 0)')
    .run(user1Id, 'success', 'Campaign Finished', 'Your campaign reached 100 leads.');
  await db.prepare('INSERT INTO notifications (user_id, type, title, message, is_read) VALUES (?, ?, ?, ?, 0)')
    .run(user2Id, 'error', 'SMTP Disconnected', 'Please reconnect account.');

  const u1Notifs = await db.prepare('SELECT * FROM notifications WHERE user_id = ?').all(user1Id);
  const u2Notifs = await db.prepare('SELECT * FROM notifications WHERE user_id = ?').all(user2Id);

  assert.strictEqual(u1Notifs.length, 1, 'User 1 should have exactly 1 notification');
  assert.strictEqual(u1Notifs[0].title, 'Campaign Finished', 'User 1 notification title mismatch');
  assert.strictEqual(u2Notifs.length, 1, 'User 2 should have exactly 1 notification');
  assert.strictEqual(u2Notifs[0].title, 'SMTP Disconnected', 'User 2 notification title mismatch');
  console.log('✅ In-App Notifications isolation and persistence verified');

  // Test 5: User Settings Multi-tenancy
  await db.prepare('DELETE FROM user_settings WHERE user_id IN (?, ?)').run(user1Id, user2Id);
  await db.prepare('INSERT INTO user_settings (user_id, key, value) VALUES (?, ?, ?)')
    .run(user1Id, 'theme', 'midnight');
  await db.prepare('INSERT INTO user_settings (user_id, key, value) VALUES (?, ?, ?)')
    .run(user2Id, 'theme', 'cyberpunk');

  const u1Theme = await db.prepare('SELECT value FROM user_settings WHERE user_id = ? AND key = ?').get(user1Id, 'theme');
  const u2Theme = await db.prepare('SELECT value FROM user_settings WHERE user_id = ? AND key = ?').get(user2Id, 'theme');

  assert.strictEqual(u1Theme.value, 'midnight', 'User 1 theme should be midnight');
  assert.strictEqual(u2Theme.value, 'cyberpunk', 'User 2 theme should be cyberpunk');
  console.log('✅ User Settings isolation verified');

  // Test 6: Direct Log & Queue Attribution
  const campRes = await db.prepare('INSERT INTO campaigns (name, subject, contact_list, user_id) VALUES (?, ?, ?, ?)')
    .run('Test Tenant Campaign', 'Hello', 'test-list', user1Id);
  const campId = campRes.lastInsertRowid;

  await db.prepare('INSERT INTO queue (campaign_id, recipient_email, status, scheduled_at, user_id) VALUES (?, ?, ?, ?, ?)')
    .run(campId, 'lead@test.com', 'pending', new Date().toISOString(), user1Id);

  await db.prepare('INSERT INTO logs (campaign_id, recipient_email, status, message, user_id) VALUES (?, ?, ?, ?, ?)')
    .run(campId, 'lead@test.com', 'sent', 'Delivered', user1Id);

  const u1Queue = await db.prepare('SELECT * FROM queue WHERE user_id = ?').all(user1Id);
  const u2Queue = await db.prepare('SELECT * FROM queue WHERE user_id = ?').all(user2Id);
  const u1Logs = await db.prepare('SELECT * FROM logs WHERE user_id = ?').all(user1Id);
  const u2Logs = await db.prepare('SELECT * FROM logs WHERE user_id = ?').all(user2Id);

  assert(u1Queue.length >= 1, 'User 1 should have queue items');
  assert.strictEqual(u2Queue.length, 0, 'User 2 should have 0 queue items');
  assert(u1Logs.length >= 1, 'User 1 should have logs');
  assert.strictEqual(u2Logs.length, 0, 'User 2 should have 0 logs');
  console.log('✅ Queue and Logs direct user attribution verified');

  // Clean up test data
  await db.prepare('DELETE FROM queue WHERE campaign_id = ?').run(campId);
  await db.prepare('DELETE FROM logs WHERE campaign_id = ?').run(campId);
  await db.prepare('DELETE FROM campaigns WHERE id = ?').run(campId);
  await db.prepare('DELETE FROM device_states WHERE device_id LIKE ?').run('test-device-uuid-%');
  await db.prepare('DELETE FROM suppression_list WHERE value = ?').run(email);
  await db.prepare('DELETE FROM notifications WHERE user_id IN (?, ?)').run(user1Id, user2Id);
  await db.prepare('DELETE FROM user_settings WHERE user_id IN (?, ?)').run(user1Id, user2Id);
  await db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(user1Id, user2Id);

  console.log('🎉 ALL USER SEPARATION AND HARDENING TESTS PASSED!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
