/**
 * netlify/functions/scheduler.js — Scheduled email sending function for Netlify
 * Runs every 15 seconds to process pending emails in the queue
 * 
 * This function is automatically triggered by Netlify's scheduled function service
 * based on the cron schedule defined in netlify.toml
 */

const logger = require('../../logger');
const { processNextItem } = require('../../scheduler');

exports.handler = async (event, context) => {
  try {
    logger.info('Scheduled function triggered: processing email queue');

    // Process the next email in queue
    const result = await processNextItem();
    logger.info({ result }, 'Queue processing completed');
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Email queue processed',
        result
      })
    };
  } catch (err) {
    logger.error({ err }, 'Scheduler function error');
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Scheduler error',
        message: err.message 
      })
    };
  }
};
