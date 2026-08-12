/**
 * netlify/functions/scheduler.js — Netlify Scheduled Function
 *
 * ⚠️  OPTIONAL: This is a Netlify-native alternative to running a continuous scheduler.
 *
 * How it works:
 *   1. Netlify calls this function on a schedule (e.g., every 15 seconds)
 *   2. The function imports and runs processNextItem() from scheduler.js
 *   3. Emails in the queue are dispatched
 *
 * To enable:
 *   1. Uncomment the netlify.toml configuration below
 *   2. Deploy to Netlify
 *
 * Pros:
 *   - No external cron service required
 *   - Runs natively on Netlify infrastructure
 *   - Simple and straightforward
 *
 * Cons:
 *   - Scheduled functions are in beta (Netlify may change the API)
 *   - Cold start time may delay sends by a few seconds
 *   - Less granular control over retry logic
 *
 * Related:
 *   - NETLIFY_SCHEDULER_DEPLOYMENT.md — Full deployment guide
 *   - scheduler.js — Main scheduler logic
 *   - routes/queue.js — Worker status & manual trigger endpoints
 */

const logger = require('../../logger');

// Lazy-load scheduler to avoid initializing node-cron when not needed
let processNextItem;

async function initScheduler() {
  if (!processNextItem) {
    const schedulerModule = require('../../scheduler');
    processNextItem = schedulerModule.processNextItem;
  }
}

/**
 * Netlify scheduled function handler.
 * Called automatically by Netlify's scheduler.
 */
exports.handler = async (event, context) => {
  try {
    // Initialize scheduler on first run
    await initScheduler();

    // Log the scheduled invocation
    logger.info({
      timestamp: new Date().toISOString(),
      source: 'netlify-scheduled-function',
      eventType: event.type || 'scheduled'
    }, 'Scheduler tick triggered');

    // Run one batch of email sends
    const result = await processNextItem();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Scheduler dispatch tick completed.',
        timestamp: new Date().toISOString(),
        result
      })
    };
  } catch (err) {
    logger.error({ err, message: err.message }, 'Scheduled function error');

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

/**
 * Manual invocation endpoint (for testing).
 * Can be called via:
 *   POST https://your-app.netlify.app/.netlify/functions/scheduler
 */
exports.handlerManual = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  // Simple API key check (optional)
  const apiKey = event.headers['x-scheduler-key'];
  if (apiKey && apiKey !== process.env.SCHEDULER_API_KEY) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Forbidden: Invalid API key' })
    };
  }

  try {
    await initScheduler();
    const result = await processNextItem();
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Manual scheduler trigger executed.',
        result
      })
    };
  } catch (err) {
    logger.error({ err }, 'Manual scheduler trigger error');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
