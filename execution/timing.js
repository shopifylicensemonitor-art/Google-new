/**
 * execution/timing.js — Cold Email Anti-Flagging Randomization & Humanized Timing Engine.
 *
 * Implements non-linear jitter, multi-mailbox interleaved pacing, natural human cooldown
 * micro-breaks, and strict timezone sending window enforcement (default Africa/Lagos WAT).
 */

/**
 * Generate a bounded pseudo-random number with Gaussian / normal distribution (Box-Muller).
 * @param {number} min Minimum allowed value
 * @param {number} max Maximum allowed value
 * @param {number} [mean] Desired mean (defaults to midpoint)
 * @param {number} [stdDev] Standard deviation
 * @returns {number}
 */
function randomBoundedGaussian(min, max, mean = null, stdDev = null) {
  if (min >= max) return min;
  const targetMean = mean !== null ? mean : (min + max) / 2;
  const targetStdDev = stdDev !== null ? stdDev : (max - min) / 6;

  // Box-Muller transform
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const normal = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  const sampled = targetMean + normal * targetStdDev;

  return Math.round(Math.max(min, Math.min(max, sampled)));
}

/**
 * Get current hour and minute in a specified timezone.
 * @param {Date} date
 * @param {string} [timezone='Africa/Lagos']
 * @returns {{ hour: number, minute: number, dayOfWeek: number }}
 */
function getTimeInZone(date, timezone = 'Africa/Lagos') {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'narrow',
    });
    const parts = formatter.formatToParts(date);
    let hour = 0, minute = 0;
    for (const p of parts) {
      if (p.type === 'hour') hour = parseInt(p.value, 10) % 24;
      if (p.type === 'minute') minute = parseInt(p.value, 10);
    }
    return { hour, minute, dayOfWeek: date.getDay() };
  } catch (_) {
    return { hour: date.getHours(), minute: date.getMinutes(), dayOfWeek: date.getDay() };
  }
}

/**
 * Check if a timestamp falls within the allowed daily sending window.
 * @param {Date} date
 * @param {string} startTime 'HH:MM'
 * @param {string} endTime 'HH:MM'
 * @param {string} timezone
 * @returns {boolean}
 */
function isDateWithinWindow(date, startTime = '08:00', endTime = '22:00', timezone = 'Africa/Lagos') {
  if (startTime === '00:00' && (endTime === '23:59' || endTime === '24:00')) return true;

  const [startH = 8, startM = 0] = (startTime || '08:00').split(':').map(Number);
  const [endH = 22, endM = 0] = (endTime || '22:00').split(':').map(Number);

  const { hour, minute } = getTimeInZone(date, timezone);
  const currentMinutes = hour * 60 + minute;
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes === endMinutes) return true;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Overnight window (e.g. 22:00 to 06:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}

/**
 * Calculate the next valid timestamp that opens the sending window if the current time is outside.
 * @param {Date} date
 * @param {string} startTime 'HH:MM'
 * @param {string} timezone
 * @returns {Date}
 */
function advanceToNextWindowOpening(date, startTime = '08:00', timezone = 'Africa/Lagos') {
  const [startH = 8, startM = 0] = (startTime || '08:00').split(':').map(Number);
  let cursor = new Date(date.getTime());

  // Advance by 15-minute intervals until within window or next morning opening
  for (let step = 0; step < 96; step++) {
    const { hour, minute } = getTimeInZone(cursor, timezone);
    if (hour === startH && Math.abs(minute - startM) < 15) {
      // Add a randomized initial jitter (30 to 180 seconds) on the opening morning
      const openingJitter = Math.floor(Math.random() * 150) + 30;
      return new Date(cursor.getTime() + openingJitter * 1000);
    }
    // Advance 15 minutes
    cursor = new Date(cursor.getTime() + 15 * 60 * 1000);
  }

  // Fallback: 8 hours ahead
  return new Date(date.getTime() + 8 * 3600 * 1000);
}

/**
 * Calculate full humanized anti-flagging cold email schedule.
 *
 * @param {Object} options
 * @param {Array} options.recipients List of recipients
 * @param {Array} options.accounts List of connected sender accounts
 * @param {string} [options.startTime='09:00'] Daily active window start
 * @param {string} [options.endTime='18:00'] Daily active window end
 * @param {string} [options.timezone='Africa/Lagos'] Target timezone
 * @param {boolean} [options.ignoreWindow=false] Whether to ignore daily window constraints
 * @param {'smart'|'random'|'fixed'} [options.timingMode='smart'] Pacing mode
 * @param {number} [options.baseDelaySeconds=45] Base interval if fixed/smart
 * @param {number} [options.minDelaySeconds=30] Minimum delay between sends
 * @param {number} [options.maxDelaySeconds=90] Maximum delay between sends
 * @param {boolean} [options.cooldownEnabled=true] Enable human micro-breaks
 * @param {number} [options.cooldownBatchSize=15] Emails per mailbox before taking a break
 * @param {number} [options.cooldownDurationMinutes=5] Duration of break in minutes
 * @param {Date|number} [options.startTimestamp] When scheduling starts
 * @returns {Object} { scheduledItems, summary }
 */
function calculateHumanizedSchedule(options) {
  const {
    recipients = [],
    accounts = [],
    startTime = '09:00',
    endTime = '18:00',
    timezone = 'Africa/Lagos',
    ignoreWindow = false,
    timingMode = 'smart',
    baseDelaySeconds = 45,
    minDelaySeconds = 30,
    maxDelaySeconds = 90,
    cooldownEnabled = true,
    cooldownBatchSize = 15,
    cooldownDurationMinutes = 5,
    startTimestamp = new Date(),
  } = options;

  if (!recipients || recipients.length === 0) {
    return {
      scheduledItems: [],
      summary: {
        totalRecipients: 0,
        totalAccounts: accounts.length,
        estimatedDurationHours: 0,
        estimatedDays: 0,
        avgDelayPerSendSeconds: 0,
        emailsPerHourPerMailbox: 0,
        deliverabilityRating: 'Optimal (Cold Email Safe)',
      },
    };
  }

  const activeAccounts = accounts.length > 0 ? accounts : [{ id: null, email: 'Default Sender', daily_limit: 450 }];
  const accountTimelines = {};
  const accountSendCounters = {};

  let globalCursor = new Date(startTimestamp instanceof Date ? startTimestamp.getTime() : new Date(startTimestamp).getTime());

  // Ensure starting time falls inside the window
  if (!ignoreWindow && !isDateWithinWindow(globalCursor, startTime, endTime, timezone)) {
    globalCursor = advanceToNextWindowOpening(globalCursor, startTime, timezone);
  }

  // Initialize per-account cursor with staggered offsets (5 to 20 seconds between mailboxes)
  activeAccounts.forEach((acc, idx) => {
    const staggerOffset = idx * Math.floor(randomBoundedGaussian(5, 18, 12, 3) * 1000);
    accountTimelines[acc.id ?? idx] = new Date(globalCursor.getTime() + staggerOffset);
    accountSendCounters[acc.id ?? idx] = 0;
  });

  const scheduledItems = [];
  let totalDelaySum = 0;

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    const accountIndex = i % activeAccounts.length;
    const assignedAccount = activeAccounts[accountIndex];
    const accKey = assignedAccount.id ?? accountIndex;

    let accCursor = accountTimelines[accKey];
    accountSendCounters[accKey]++;

    // 1. Determine Individual Delay for this Send
    let sendDelaySeconds = 0;
    if (i === 0) {
      // First email fires immediately at start
      sendDelaySeconds = 0;
    } else if (timingMode === 'smart') {
      // Smart Humanized Jitter: Base delay with ±35% Gaussian variation
      const base = Math.max(15, parseInt(baseDelaySeconds, 10) || 45);
      const min = Math.max(12, Math.floor(base * 0.65));
      const max = Math.ceil(base * 1.45);
      sendDelaySeconds = randomBoundedGaussian(min, max, base, (max - min) / 5);
    } else if (timingMode === 'random') {
      // Custom Random Interval Range
      const min = Math.max(10, parseInt(minDelaySeconds, 10) || 30);
      const max = Math.max(min + 5, parseInt(maxDelaySeconds, 10) || 90);
      sendDelaySeconds = randomBoundedGaussian(min, max);
    } else {
      // Fixed with subtle micro-jitter (±5%)
      const fixedBase = Math.max(10, parseInt(baseDelaySeconds, 10) || 30);
      sendDelaySeconds = fixedBase + Math.floor(Math.random() * 5) - 2;
    }

    totalDelaySum += sendDelaySeconds;

    // 2. Check for Micro-Break / Cooldown (Simulating real human coffee breaks)
    let isCooldown = false;
    let cooldownDelaySeconds = 0;
    if (cooldownEnabled && accountSendCounters[accKey] > 0 && accountSendCounters[accKey] % cooldownBatchSize === 0) {
      isCooldown = true;
      const baseBreakSec = Math.max(60, (cooldownDurationMinutes || 5) * 60);
      // ±20% jitter on the break duration
      cooldownDelaySeconds = randomBoundedGaussian(
        Math.floor(baseBreakSec * 0.8),
        Math.ceil(baseBreakSec * 1.25),
        baseBreakSec,
        baseBreakSec * 0.1
      );
    }

    // 3. Advance Account Cursor
    const nextTimestampMs = accCursor.getTime() + (sendDelaySeconds + cooldownDelaySeconds) * 1000;
    let scheduledDate = new Date(nextTimestampMs);

    // 4. Validate Sending Window (Roll over to next morning if outside window)
    if (!ignoreWindow && !isDateWithinWindow(scheduledDate, startTime, endTime, timezone)) {
      scheduledDate = advanceToNextWindowOpening(scheduledDate, startTime, timezone);
    }

    // Update account timeline
    accountTimelines[accKey] = scheduledDate;

    scheduledItems.push({
      index: i,
      recipient,
      recipient_email: recipient.recipient_email || recipient.email || recipient,
      account_id: assignedAccount.id ?? null,
      sender_email: assignedAccount.email,
      scheduled_at: scheduledDate.toISOString(),
      delay_seconds: sendDelaySeconds,
      is_cooldown_break: isCooldown,
      cooldown_seconds: cooldownDelaySeconds,
    });
  }

  // Summary Metrics
  const firstSendTime = scheduledItems.length > 0 ? new Date(scheduledItems[0].scheduled_at) : globalCursor;
  const lastSendTime = scheduledItems.length > 0 ? new Date(scheduledItems[scheduledItems.length - 1].scheduled_at) : globalCursor;
  const durationMs = Math.max(1000, lastSendTime.getTime() - firstSendTime.getTime());
  const durationHours = +(durationMs / (1000 * 3600)).toFixed(1);
  const avgDelaySec = recipients.length > 1 ? Math.round(totalDelaySum / (recipients.length - 1)) : baseDelaySeconds;
  const emailsPerHourPerMailbox = avgDelaySec > 0 ? Math.round(3600 / avgDelaySec) : 60;
  const estimatedDays = +(durationHours / 9).toFixed(1); // assuming 9h daily window

  let deliverabilityRating = 'Optimal (Cold Email Safe)';
  if (emailsPerHourPerMailbox > 80) {
    deliverabilityRating = 'Fast (Elevated Risk for Cold Outreach)';
  } else if (emailsPerHourPerMailbox > 50) {
    deliverabilityRating = 'Standard Deliverability';
  }

  return {
    scheduledItems,
    summary: {
      totalRecipients: recipients.length,
      totalAccounts: activeAccounts.length,
      firstSendAt: firstSendTime.toISOString(),
      lastSendAt: lastSendTime.toISOString(),
      estimatedDurationHours: durationHours,
      estimatedDays: Math.max(0.1, estimatedDays),
      avgDelayPerSendSeconds: avgDelaySec,
      emailsPerHourPerMailbox,
      deliverabilityRating,
    },
  };
}

module.exports = {
  randomBoundedGaussian,
  getTimeInZone,
  isDateWithinWindow,
  advanceToNextWindowOpening,
  calculateHumanizedSchedule,
};
