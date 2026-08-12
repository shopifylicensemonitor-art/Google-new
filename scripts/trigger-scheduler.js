#!/usr/bin/env node

/**
 * scripts/trigger-scheduler.js — Manual Scheduler Trigger Script
 *
 * Usage:
 *   node scripts/trigger-scheduler.js [url]
 *
 * Examples:
 *   node scripts/trigger-scheduler.js http://localhost:3000
 *   node scripts/trigger-scheduler.js https://your-app.netlify.app
 *
 * This script makes a POST request to /api/queue/worker/trigger every 15 seconds.
 * Useful for:
 *   1. Testing scheduler behavior locally
 *   2. Simulating external cron service before deploying to Zapier/EasyCron
 *   3. Manual email dispatch in development
 *
 * Exit with Ctrl+C
 */

const https = require('https');
const http = require('http');
const url = require('url');

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const TRIGGER_ENDPOINT = '/api/queue/worker/trigger';
const INTERVAL_MS = 15000; // 15 seconds

const parsedUrl = new URL(TRIGGER_ENDPOINT, BASE_URL);
const isHttps = parsedUrl.protocol === 'https:';
const client = isHttps ? https : http;

let requestCount = 0;
let successCount = 0;
let failureCount = 0;

console.log(`
╔════════════════════════════════════════════════════════════════╗
║          Scheduler Trigger Script (External Cron Sim)          ║
╚════════════════════════════════════════════════════════════════╝

Target URL:      ${BASE_URL}
Endpoint:        ${TRIGGER_ENDPOINT}
Interval:        Every ${INTERVAL_MS / 1000} seconds
Press Ctrl+C to stop

────────────────────────────────────────────────────────────────
`);

/**
 * Trigger the scheduler endpoint
 */
async function triggerScheduler() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'peak-xender-scheduler-trigger/1.0'
      },
      timeout: 10000
    };

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        requestCount++;

        if (res.statusCode === 200 || res.statusCode === 201) {
          successCount++;
          const timestamp = new Date().toISOString();
          try {
            const parsed = JSON.parse(data);
            console.log(`[${timestamp}] ✓ #${requestCount} SUCCESS (${res.statusCode})`);
            if (parsed.message) {
              console.log(`  → ${parsed.message}`);
            }
          } catch {
            console.log(`[${timestamp}] ✓ #${requestCount} SUCCESS (${res.statusCode})`);
          }
        } else {
          failureCount++;
          const timestamp = new Date().toISOString();
          console.log(`[${timestamp}] ✗ #${requestCount} FAILED (${res.statusCode})`);
          console.log(`  → Response: ${data.substring(0, 100)}`);
        }

        resolve();
      });
    });

    req.on('error', (err) => {
      requestCount++;
      failureCount++;
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ✗ #${requestCount} ERROR`);
      console.log(`  → ${err.message}`);
      resolve(); // Don't reject, keep polling
    });

    req.on('timeout', () => {
      failureCount++;
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ✗ #${requestCount} TIMEOUT`);
      req.destroy();
      resolve();
    });

    req.end();
  });
}

/**
 * Main loop
 */
(async () => {
  console.log(`Starting scheduler trigger loop...\n`);

  // Initial trigger
  await triggerScheduler();

  // Repeat every interval
  const intervalId = setInterval(async () => {
    await triggerScheduler();
  }, INTERVAL_MS);

  // Handle exit gracefully
  process.on('SIGINT', () => {
    clearInterval(intervalId);
    console.log(`\n
────────────────────────────────────────────────────────────────
Summary:
  Total Requests:  ${requestCount}
  Successful:      ${successCount}
  Failed:          ${failureCount}
  Success Rate:    ${requestCount > 0 ? ((successCount / requestCount) * 100).toFixed(1) : 0}%
────────────────────────────────────────────────────────────────

Scheduler trigger script stopped.
`);
    process.exit(0);
  });
})();
