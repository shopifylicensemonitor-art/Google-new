# Netlify Scheduled Functions Configuration

## Overview

Netlify Scheduled Functions enable serverless background job execution on a cron schedule. For Peak Xender, we use scheduled functions to process the email queue every 15 seconds, enabling auto-send campaigns without a persistent background worker.

## How It Works

### Traditional (Local/VPS) Approach
```
server.js starts
    ↓
require('./scheduler') loads
    ↓
node-cron starts "*/15 * * * * *" schedule
    ↓
Every 15 seconds: processNextItem() runs
    ↓
Emails sent from queue to recipients
```

### Netlify Serverless Approach
```
Every 15 seconds (managed by Netlify infrastructure)
    ↓
scheduler.js function invoked
    ↓
processNextItem() from scheduler.js executed
    ↓
Emails sent from queue to recipients
    ↓
Function returns response
    ↓
Waits 15 seconds, then repeats
```

## Configuration

### 1. File Structure

```
Google-new/
├── netlify/
│   └── functions/
│       ├── api.js              # Main API handler (serverless-http)
│       └── scheduler.js         # Queue processor (NEW)
├── netlify.toml                 # Includes [[scheduled_functions]] config
└── scheduler.js                 # Shared logic (processNextItem, etc.)
```

### 2. netlify.toml Configuration

The `[[scheduled_functions]]` section defines when and which function to run:

```toml
[[scheduled_functions]]
  function = "scheduler"
  cron = "*/15 * * * * *"
```

**Breakdown**:
- `function = "scheduler"` → Look for `netlify/functions/scheduler.js`
- `cron = "*/15 * * * * *"` → Unix cron format (every 15 seconds)

**Cron Format** (SECOND MINUTE HOUR DAY MONTH DAYOFWEEK):
```
*/15 * * * * *   = Every 15 seconds
*/30 * * * * *   = Every 30 seconds
* */1 * * * *    = Every minute
0 * * * *        = Every hour (at start)
0 0 * * *        = Daily (at midnight UTC)
```

### 3. Scheduler Function Handler

**File**: `netlify/functions/scheduler.js`

```javascript
const logger = require('../../logger');
const { processNextItem } = require('../../scheduler');

exports.handler = async (event, context) => {
  try {
    logger.info('Scheduled function triggered: processing email queue');
    
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
```

**Key Points**:
- Handler function receives `event` and `context`
- Must return `{ statusCode, body }`
- No timeout constraint like HTTP functions (can run longer)
- Netlify manages invocation scheduling, not the function itself

### 4. Queue Processing Logic

**File**: `scheduler.js` (shared)

The `processNextItem()` function:
1. Connects to database
2. Finds next pending queue item
3. Checks sending window
4. Prepares email
5. Sends via Gmail API
6. Updates queue status
7. Returns result

This logic runs identically whether invoked from:
- Local cron scheduler (development)
- Netlify scheduled function (production)

### 5. Environment Detection

In `scheduler.js`, we detect the environment:

```javascript
const isNetlifyServerless = process.env.NETLIFY === 'true';
const schedulerEnabled = !isNetlifyServerless && process.env.DISABLE_SCHEDULER !== 'true';

if (schedulerEnabled) {
  // Start cron scheduler (local/VPS only)
  sendTask = cron.schedule('*/15 * * * * *', async () => {
    // Process queue
  });
}
```

**Why?**
- Local development: NETLIFY not set → cron scheduler runs
- Netlify production: NETLIFY=true → cron scheduler disabled
- Scheduled function handles processing instead

### Environment Variables

Set these in Netlify dashboard:

```
NETLIFY=true                    # Disables local cron scheduler
DATABASE_URL=postgresql://...   # Supabase connection
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
JWT_SECRET=...                  # 32+ random characters
```

## Deployment

### Step 1: Deploy to Netlify

```bash
# Push to GitHub
git add .
git commit -m "Add Netlify scheduled functions"
git push

# In Netlify dashboard:
# - Connect GitHub repository
# - Deploy
```

### Step 2: Verify Configuration

1. **Check netlify.toml is valid**:
   - Go to Netlify dashboard
   - Site Settings → Build & Deploy → Deploy logs
   - Look for: `Scheduled function 'scheduler' configured`

2. **Monitor function invocations**:
   - Go to Functions → scheduler
   - Should see invocation every ~15 seconds
   - Click invocation to view logs

3. **Test queue processing**:
   - Create and launch a campaign
   - View function logs
   - Should see `processNextItem` output

## Database Connection in Netlify

### Connection Pooling

Since Netlify Functions are ephemeral (start/stop frequently), optimize database connections:

**Current Implementation** (db.js):
```javascript
// PostgreSQL adapter
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,              // Reduced for serverless
  min: 1,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 5000,
});
```

**Recommended Upgrades for High Volume**:

1. **Use Supabase Connection Pooling**:
   - Supabase → Settings → Database → Connection Pooling
   - Use `host` ending in `:6543` (pooler port)
   - Update DATABASE_URL in Netlify

2. **Reduce Idle Timeout**:
   ```javascript
   idleTimeoutMillis: 3000,  // 3 seconds
   ```

3. **Add Connection Retry Logic**:
   ```javascript
   const pool = new pg.Pool({
     ...
     query_timeout: 15000,     // 15 second query timeout
     statement_timeout: 30000, // 30 second statement timeout
   });
   ```

## Monitoring & Logging

### View Function Logs

**Netlify Dashboard**:
1. Functions → scheduler
2. Click any invocation
3. View console output and errors

### Log Output

The scheduler function logs to both:
- **Pino logger** (structured logs) → Cloudwatch/Netlify Logs
- **Console output** → Netlify Functions dashboard

Example log format:
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "message": "Scheduled function triggered: processing email queue",
  "function": "scheduler"
}
```

### Performance Monitoring

**In Netlify dashboard**, track:
- **Function duration**: Should be <5 seconds for normal operation
- **Memory usage**: Functions have 128-3008 MB available
- **Error rate**: Should be 0% under normal conditions
- **Invocation count**: Should show ~240 invocations per hour (every 15 seconds)

### Alerts & Notifications

Set up Netlify alerts:
1. Site Settings → Notifications
2. Add failure notifications for Functions
3. Configure email/Slack delivery

## Troubleshooting

### "Scheduled function not running"

**Check**:
1. Is `netlify.toml` committed and in repository?
   ```bash
   git ls-files netlify.toml  # Should show file
   ```
2. Is cron syntax valid? (Use cron validator: [crontab.guru](https://crontab.guru))
3. Did you redeploy after changing netlify.toml?
   - Changes to netlify.toml require a new deploy to take effect

**Fix**:
```bash
# Force redeploy
git commit --allow-empty -m "Force redeploy for scheduled functions"
git push
```

### "Function runs but emails not sending"

**Check**:
1. Is DATABASE_URL correct and reachable?
   - Test: `psql $DATABASE_URL -c "SELECT 1"`
2. Is there anything in the queue table?
   - Check Supabase: Data Browser → queue
3. Are Gmail accounts authorized?
   - Check: accounts table, token_response column

**Fix**:
```javascript
// Add debug logging in scheduler function
exports.handler = async (event, context) => {
  try {
    console.log('Function invoked at:', new Date().toISOString());
    console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);
    
    const result = await processNextItem();
    console.log('Result:', JSON.stringify(result, null, 2));
    
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    console.error('ERROR:', err.message, err.stack);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
```

### "Function timing out"

**Symptoms**:
- Function logs show "504 Gateway Timeout"
- Takes >30 seconds to complete

**Solutions**:
1. **Optimize database queries**:
   - Add indexes to queue table
   - Limit batch size

2. **Process fewer emails**:
   ```javascript
   // In processNextItem, modify to process only 1 item instead of all pending
   ```

3. **Increase function timeout** (netlify.toml):
   ```toml
   [[functions]]
   path = "netlify/functions/scheduler.js"
   timeout = 60  # Seconds (max 60 for free tier)
   ```

### "Connection pool exhausted"

**Error message**: `Error: getaddrinfo ENOTFOUND pool`

**Fix**:
1. Reduce idle connections in db.js:
   ```javascript
   const pool = new pg.Pool({
     max: 1,  // Only 1 connection per function
     idleTimeoutMillis: 2000,
   });
   ```

2. Or use Supabase connection pooler (recommended for serverless)

## Advanced Configuration

### Multiple Scheduled Functions

For different tasks at different intervals:

```toml
[[scheduled_functions]]
  function = "scheduler"
  cron = "*/15 * * * * *"     # Email sending every 15 seconds

[[scheduled_functions]]
  function = "cleanup"
  cron = "0 0 * * *"          # Cleanup daily at midnight
```

**Each function file** (`netlify/functions/cleanup.js`):
```javascript
exports.handler = async (event, context) => {
  // Different logic per function
};
```

### Dynamic Frequency Adjustment

To change frequency without redeploying, add a configuration table:

```javascript
// In scheduler.js
const getScheduleConfig = async (db) => {
  const config = await db.prepare(
    "SELECT value FROM settings WHERE key = 'email_queue_frequency'"
  ).get();
  return parseInt(config?.value || '15');
};
```

Then read this value when deciding to process.

## Cost Implications

### Netlify Pricing

- **Scheduled Functions**: Included in base plan
- **Function invocations**: First 125,000/month free
- **Per additional invocation**: ~$0.0000025

**Cost Calculation**:
- Running every 15 seconds = 5,760 invocations/day
- Per month: 172,800 invocations
- Cost: Included in free tier, paid plans minimal

### Database Costs

- **Supabase free tier**: Up to 500MB storage
- **Peak Xender email queue**: ~100KB per 1,000 emails
- Highly cost-effective for production use

## Best Practices

1. **Error Handling**: Always return proper status codes
2. **Logging**: Log every important step for debugging
3. **Idempotency**: If function runs twice, shouldn't cause issues
4. **Timeouts**: Design functions to complete in <10 seconds
5. **Secrets**: Never log JWT_SECRET or OAuth tokens
6. **Monitoring**: Set up alerts for failures
7. **Backups**: Database backups separate from function code
8. **Testing**: Test scheduled function locally before deploying

## Testing Locally

To test scheduled function logic locally without Netlify:

```javascript
// netlify/functions/scheduler.js
// Add this for local testing:

if (require.main === module) {
  exports.handler({}, {}).then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  });
}
```

Then run:
```bash
node netlify/functions/scheduler.js
```

## Comparison: Scheduled Functions vs. Alternatives

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **Netlify Scheduled Functions** | No servers to manage, automatic scaling | Limited to 60s timeout, no persistent state | Light to medium volume email queues |
| **GitHub Actions** | Free, reliable, visible in repo | External dependency, limited frequency | Simple scheduled tasks |
| **AWS Lambda + EventBridge** | Very scalable, precise control | More complex setup, additional costs | High-volume production systems |
| **Local Cron** | Simple, full control, debugging easy | Requires running server, manual scaling | Development and testing |

---

## Next Steps

1. ✅ Verify netlify.toml has `[[scheduled_functions]]` block
2. ✅ Deploy to Netlify
3. ✅ Monitor function invocations in dashboard
4. ✅ Create and launch test campaign
5. ✅ Verify emails send approximately every 15 seconds
6. ✅ Set up Netlify alerts for function failures

## References

- [Netlify Scheduled Functions](https://docs.netlify.com/functions/scheduled-functions/)
- [Cron Expression Format](https://crontab.guru)
- [Netlify Functions Limitations](https://docs.netlify.com/functions/overview/#limitations)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)

---

**Configuration Last Updated**: 2024
**Netlify Functions Version**: Current
**Email Queue System**: Production Ready
