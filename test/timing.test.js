const assert = require('assert');
const {
  randomBoundedGaussian,
  getTimeInZone,
  isDateWithinWindow,
  calculateHumanizedSchedule,
} = require('../execution/timing');

console.log('Testing Cold Email Anti-Flagging Timing Engine...');

// 1. Test randomBoundedGaussian bounds
for (let i = 0; i < 50; i++) {
  const val = randomBoundedGaussian(30, 90, 60, 10);
  assert(val >= 30, `Value ${val} should be >= 30`);
  assert(val <= 90, `Value ${val} should be <= 90`);
}
console.log('✓ Gaussian bounded random generation passed');

// 2. Test Timezone calculation
const now = new Date('2026-08-16T12:30:00Z');
const watTime = getTimeInZone(now, 'Africa/Lagos');
// UTC 12:30 is WAT 13:30
assert.strictEqual(watTime.hour, 13);
assert.strictEqual(watTime.minute, 30);
console.log('✓ Lagos WAT timezone calculation passed');

// 3. Test isDateWithinWindow
const morningWat = new Date('2026-08-16T09:00:00Z'); // 10:00 WAT
assert(isDateWithinWindow(morningWat, '08:00', '18:00', 'Africa/Lagos'));

const nightWat = new Date('2026-08-16T22:00:00Z'); // 23:00 WAT
assert(!isDateWithinWindow(nightWat, '08:00', '18:00', 'Africa/Lagos'));
console.log('✓ Sending window validation passed');

// 4. Test calculateHumanizedSchedule with smart jitter and micro-breaks
const recipients = Array.from({ length: 40 }, (_, i) => ({ email: `prospect${i}@example.com`, name: `Prospect ${i}` }));
const accounts = [
  { id: 1, email: 'sender1@outreach.com', daily_limit: 450 },
  { id: 2, email: 'sender2@outreach.com', daily_limit: 450 },
];

const schedule = calculateHumanizedSchedule({
  recipients,
  accounts,
  startTime: '08:00',
  endTime: '18:00',
  timezone: 'Africa/Lagos',
  timingMode: 'smart',
  baseDelaySeconds: 45,
  cooldownEnabled: true,
  cooldownBatchSize: 10,
  cooldownDurationMinutes: 3,
  startTimestamp: new Date('2026-08-16T09:00:00Z'),
});

assert.strictEqual(schedule.scheduledItems.length, 40);
assert.strictEqual(schedule.summary.totalRecipients, 40);
assert.strictEqual(schedule.summary.totalAccounts, 2);

// Check that timestamps are monotonically increasing per account
let prevAcc1Time = 0;
let prevAcc2Time = 0;
let cooldownCount = 0;

for (const item of schedule.scheduledItems) {
  const itemTime = new Date(item.scheduled_at).getTime();
  if (item.account_id === 1) {
    if (prevAcc1Time > 0) {
      assert(itemTime >= prevAcc1Time, 'Account 1 timestamps should increase');
    }
    prevAcc1Time = itemTime;
  } else if (item.account_id === 2) {
    if (prevAcc2Time > 0) {
      assert(itemTime >= prevAcc2Time, 'Account 2 timestamps should increase');
    }
    prevAcc2Time = itemTime;
  }
  if (item.is_cooldown_break) {
    cooldownCount++;
  }
}

assert(cooldownCount > 0, 'Should have inserted micro-breaks for the accounts');
console.log(`✓ Humanized schedule generated with ${cooldownCount} micro-breaks and rate: ${schedule.summary.emailsPerHourPerMailbox} emails/hr/mailbox`);
console.log('ALL TIMING ENGINE TESTS PASSED!');
