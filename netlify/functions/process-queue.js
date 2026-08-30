/**
 * netlify/functions/process-queue.js — Netlify Scheduled Function for Bounded Queue Processing.
 *
 * Runs automatically on a scheduled interval (e.g. every minute) to atomically claim
 * and process batches of pending email campaign queue jobs from PostgreSQL.
 */

require('dotenv').config();
const { runBoundedQueueExecution } = require('../../services/queueWorker');
const logger = require('../../logger');

module.exports.handler = async function (event, context) {
  // Allow execution via scheduled trigger or authorized manual webhook
  const isScheduled = event.headers && event.headers['x-netlify-event'] === 'schedule';
  const isAuthorized = !event.headers || !process.env.CRON_SECRET || event.headers['x-cron-secret'] === process.env.CRON_SECRET;

  if (!isScheduled && !isAuthorized) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized cron invocation' }),
    };
  }

  try {
    const result = await runBoundedQueueExecution({
      maxJobs: 25,
      timeBudgetMs: 22000, // 22s bounded budget
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (err) {
    logger.error({ err: err.message }, 'Scheduled process-queue invocation failed');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
