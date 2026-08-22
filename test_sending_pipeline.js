const { parseSpintax } = require('c:/Users/peak/Desktop/peak/Google-new/execution/spintax');
const { calculateHumanizedSchedule } = require('c:/Users/peak/Desktop/peak/Google-new/execution/timing');
const { isWithinSendingWindow, getContent, injectTracking, personalise, stopScheduler } = require('c:/Users/peak/Desktop/peak/Google-new/scheduler');
const { getDb } = require('c:/Users/peak/Desktop/peak/Google-new/db');

async function testSendingPipeline() {
  stopScheduler();
  console.log('\n======================================================');
  console.log('       PEAK XENDER EMAIL SENDING ENGINE VERIFICATION    ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, extra = '') {
    if (condition) {
      console.log('  [PASS] ' + name);
      passed++;
    } else {
      console.error('  [FAIL] ' + name + (extra ? ' -> ' + extra : ''));
      failed++;
    }
  }

  // 1. Spintax parsing
  const spintaxTemplate = '{Hi|Hello|Hey} {{FirstName}}, how are you?';
  const result1 = parseSpintax(spintaxTemplate);
  assert('Spintax expands randomized variations', /^(Hi|Hello|Hey) \{\{FirstName\}\}, how are you\?$/.test(result1));

  // 2. Personalisation tag replacement
  const rawBody = 'Hello {{FirstName}} at {{Company}}, we emailed {{Email}}. Best, {{sender_name}}';
  const fields = JSON.stringify({ FirstName: 'Jane', Company: 'Acme Corp' });
  const personalised = personalise(rawBody, 'jane@acme.com', fields, 'Alex Sender');
  const persOk = personalised.includes('Jane') && personalised.includes('Acme Corp') && personalised.includes('jane@acme.com') && personalised.includes('Alex Sender');
  assert('Personalisation replaces tags correctly', persOk, `Output was: "${personalised}"`);

  // 3. Tracking Pixel & Link Wrapping Injection
  const htmlBody = '<html><body><p>Click <a href="https://example.com/promo">here</a> to view.</p></body></html>';
  const trackedHtml = injectTracking(htmlBody, 999);
  assert('Click tracking wraps anchor href', trackedHtml.includes('/api/track/click/999?url=https%3A%2F%2Fexample.com%2Fpromo'));
  assert('Open tracking pixel is injected into HTML body', trackedHtml.includes('/api/track/open/999'));

  // 4. Sending window calculations
  const openWindow = { start_time: '00:00', end_time: '23:59', ignore_window: 1, timezone: 'Africa/Lagos' };
  assert('Sending window respects ignore_window flag', isWithinSendingWindow(openWindow) === true);

  // 5. Timing engine humanized scheduling
  const scheduleResult = calculateHumanizedSchedule({
    recipients: [{ recipient_email: 'lead1@test.com' }, { recipient_email: 'lead2@test.com' }, { recipient_email: 'lead3@test.com' }],
    accounts: [{ id: 1, email: 'sender1@domain.com', daily_limit: 450 }],
    timingMode: 'smart',
    startTime: '09:00',
    endTime: '17:00'
  });
  assert('Timing engine generates humanized schedule offsets', Array.isArray(scheduleResult.scheduledItems) && scheduleResult.scheduledItems.length === 3);

  // 6. DB Queue & Suppression check integration
  const db = await getDb();
  assert('Database adapter connected for queue queries', !!db);

  // Check queue structure
  const queueCount = await db.prepare('SELECT COUNT(*) as cnt FROM queue').get();
  assert('Queue table accessible', queueCount && Number(queueCount.cnt) >= 0);

  // Check accounts table
  const accounts = await db.prepare('SELECT id, email, status, daily_sent, daily_limit FROM accounts').all();
  assert('Accounts table queried for rotation', Array.isArray(accounts));

  // Check suppression list table
  const suppressionCount = await db.prepare('SELECT COUNT(*) as cnt FROM suppression_list').get();
  assert('Master suppression list check operational', suppressionCount && Number(suppressionCount.cnt) >= 0);

  console.log('\n======================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

testSendingPipeline().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
