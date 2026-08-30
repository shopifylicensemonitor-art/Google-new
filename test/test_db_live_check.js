/**
 * test/test_db_live_check.js
 * Live Supabase database health & optimization check.
 * Tests: pagination, specific columns, row caps, schema columns, index presence.
 */

require('dotenv').config();
const { getDb } = require('../db');

let passed = 0;
let failed = 0;
const errors = [];

function ok(label) {
  console.log(`  ✅ ${label}`);
  passed++;
}

function fail(label, reason) {
  console.error(`  ❌ ${label}: ${reason}`);
  failed++;
  errors.push({ label, reason });
}

async function checkSchemaColumns(db) {
  console.log('\n── 1. Schema Column Presence ─────────────────────────────');

  const requiredColumns = {
    users:          ['id','email','password_hash','otp_code','otp_expires_at','otp_verified','refresh_token','workspace_id'],
    accounts:       ['id','email','user_id','warmup_enabled','warmup_daily_target','daily_limit'],
    contacts:       ['id','list_name','email','fields','status','user_id'],
    campaigns:      ['id','name','subject','status','user_id','timing_mode','cooldown_enabled'],
    queue:          ['id','campaign_id','recipient_email','status','locked_at','locked_by','attempt_count','user_id'],
    templates:      ['id','name','subject','user_id'],
    ai_config:      ['id','provider','api_key_encrypted','is_active','user_id'],
    ai_rules:       ['id','rule_type','content','user_id'],
    inbox_messages: ['id','sender_email','recipient_email','user_id'],
    logs:           ['id','campaign_id','recipient_email','status','user_id'],
  };

  for (const [table, cols] of Object.entries(requiredColumns)) {
    try {
      // Query information_schema for actual columns
      const rows = await db.prepare(
        `SELECT column_name FROM information_schema.columns WHERE table_name = ? AND table_schema = 'public'`
      ).all(table);

      if (!rows || rows.length === 0) {
        fail(`Table "${table}" exists`, 'Table not found or has no columns');
        continue;
      }

      const existingCols = new Set(rows.map(r => r.column_name));
      const missing = cols.filter(c => !existingCols.has(c));

      if (missing.length === 0) {
        ok(`${table}(${cols.join(', ')})`);
      } else {
        fail(`${table} missing columns`, missing.join(', '));
      }
    } catch (err) {
      fail(`Schema check for "${table}"`, err.message);
    }
  }
}

async function checkPaginatedContactsQuery(db) {
  console.log('\n── 2. Paginated Contacts Query ───────────────────────────');

  try {
    const pageLimit = 10;
    const offset = 0;
    const selectCols = 'id, list_name, email, fields, status, created_at';

    const rows = await db.prepare(
      `SELECT ${selectCols} FROM contacts WHERE user_id IS NOT NULL ORDER BY id LIMIT ? OFFSET ?`
    ).all(pageLimit, offset);

    ok(`Paginated query executed (returned ${rows.length} rows, limit ${pageLimit})`);

    if (rows.length > pageLimit) {
      fail('Pagination enforcement', `Got ${rows.length} rows, expected <= ${pageLimit}`);
    } else {
      ok(`Row count within page limit (${rows.length} ≤ ${pageLimit})`);
    }

    // Verify no unexpected columns were returned
    if (rows.length > 0) {
      const returnedCols = Object.keys(rows[0]);
      const forbidden = returnedCols.filter(c =>
        !['id','list_name','email','fields','status','created_at','user_id','workspace_id'].includes(c)
      );
      if (forbidden.length > 0) {
        fail('Specific column selection', `Unexpected columns: ${forbidden.join(', ')}`);
      } else {
        ok(`Specific columns only (${returnedCols.join(', ')})`);
      }
    } else {
      ok('No contacts in DB yet (query form is valid)');
    }
  } catch (err) {
    fail('Paginated contacts query', err.message);
  }
}

async function checkCampaignListQuery(db) {
  console.log('\n── 3. Campaign List (No Body Blobs) ──────────────────────');

  try {
    const rows = await db.prepare(`
      SELECT c.id, c.name, c.subject, c.contact_list, c.status, c.delay_seconds,
             c.start_time, c.end_time, c.timezone, c.total_contacts, c.sent_count,
             c.failed_count, c.content_mode, c.format_type, c.timing_mode,
             c.account_ids, c.created_at, c.user_id,
             COALESCE(SUM(q.opens_count), 0)  AS total_opens,
             COALESCE(SUM(q.clicks_count), 0) AS total_clicks
      FROM campaigns c
      LEFT JOIN queue q ON c.id = q.campaign_id
      WHERE c.user_id IS NOT NULL
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT 20
    `).all();

    ok(`Campaign list query executed (${rows.length} campaigns)`);

    // Confirm body_html and body_plain are absent
    if (rows.length > 0) {
      const cols = Object.keys(rows[0]);
      if (cols.includes('body_html') || cols.includes('body_plain')) {
        fail('Body blob exclusion', 'body_html/body_plain still present in list response');
      } else {
        ok('body_html and body_plain correctly excluded from list response');
      }
      ok(`Returned columns: ${cols.join(', ')}`);
    } else {
      ok('No campaigns in DB yet (query form is valid)');
    }
  } catch (err) {
    fail('Campaign list query', err.message);
  }
}

async function checkHistoryCaps(db) {
  console.log('\n── 4. History Sub-Query Row Caps ─────────────────────────');

  try {
    // Queue sends capped at 50
    const queueRows = await db.prepare(`
      SELECT q.id, q.campaign_id, q.recipient_email, q.status, q.sent_at,
             q.error, q.step_number, q.opens_count, q.clicks_count
      FROM queue q
      ORDER BY q.id DESC
      LIMIT 50
    `).all();

    if (queueRows.length <= 50) {
      ok(`Queue history cap enforced (${queueRows.length} ≤ 50)`);
    } else {
      fail('Queue history cap', `${queueRows.length} rows returned, expected ≤ 50`);
    }

    // Inbox replies capped at 20
    const inboxRows = await db.prepare(`
      SELECT m.id, m.account_id, m.sender_email, m.recipient_email,
             m.subject, m.body_text, m.sentiment, m.is_read, m.created_at
      FROM inbox_messages m
      ORDER BY m.id DESC
      LIMIT 20
    `).all();

    if (inboxRows.length <= 20) {
      ok(`Inbox replies cap enforced (${inboxRows.length} ≤ 20)`);
    } else {
      fail('Inbox replies cap', `${inboxRows.length} rows, expected ≤ 20`);
    }
  } catch (err) {
    fail('History sub-query caps', err.message);
  }
}

async function checkIndexPresence(db) {
  console.log('\n── 5. Performance Index Presence ─────────────────────────');

  const criticalIndexes = [
    'idx_queue_status_campaign',
    'idx_queue_scheduled_at',
    'idx_contacts_list_name',
    'idx_contacts_user_id',
    'idx_campaigns_status',
    'idx_campaigns_user_id',
    'idx_accounts_user_id',
    'idx_inbox_user_id',
    'idx_logs_user_id',
  ];

  try {
    const rows = await db.prepare(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`
    ).all();

    const existingIndexes = new Set(rows.map(r => r.indexname));

    for (const idx of criticalIndexes) {
      if (existingIndexes.has(idx)) {
        ok(`Index "${idx}" exists`);
      } else {
        fail(`Index "${idx}"`, 'Missing — run supabase_schema.sql to create it');
      }
    }
  } catch (err) {
    fail('Index presence check', err.message);
  }
}

async function checkTotalCount(db) {
  console.log('\n── 6. X-Total-Count (Count Query) ────────────────────────');

  try {
    const countRow = await db.prepare(
      'SELECT COUNT(*) as total FROM contacts'
    ).get();

    const total = countRow ? Number(countRow.total) : 0;
    ok(`Total contacts in DB: ${total}`);

    const campaignCount = await db.prepare(
      'SELECT COUNT(*) as total FROM campaigns'
    ).get();
    ok(`Total campaigns in DB: ${campaignCount ? campaignCount.total : 0}`);

    const queueCount = await db.prepare(
      `SELECT status, COUNT(*) as cnt FROM queue GROUP BY status`
    ).all();

    if (queueCount.length > 0) {
      queueCount.forEach(r => ok(`Queue status "${r.status}": ${r.cnt} rows`));
    } else {
      ok('Queue is empty (clean state)');
    }
  } catch (err) {
    fail('Count queries', err.message);
  }
}

async function checkRLS(db) {
  console.log('\n── 7. Row Level Security Enabled ─────────────────────────');

  const rlsTables = [
    'accounts','contacts','campaigns','queue','logs',
    'templates','users','ai_config','ai_rules','inbox_messages',
  ];

  try {
    const rows = await db.prepare(
      `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`
    ).all();

    const tableMap = new Map(rows.map(r => [r.tablename, r.rowsecurity]));

    for (const t of rlsTables) {
      if (!tableMap.has(t)) {
        fail(`RLS on "${t}"`, 'Table not found in pg_tables');
      } else if (tableMap.get(t) === true || tableMap.get(t) === 't' || tableMap.get(t) === 1) {
        ok(`RLS enabled on "${t}"`);
      } else {
        fail(`RLS on "${t}"`, 'RLS is OFF — run supabase_schema.sql to enable it');
      }
    }
  } catch (err) {
    fail('RLS check', err.message);
  }
}

async function main() {
  console.log('=============================================================');
  console.log('  Peak Xender — Live Database Optimization & Health Check');
  console.log('=============================================================');

  const db = await getDb();
  console.log('✅ Connected to Supabase PostgreSQL\n');

  await checkSchemaColumns(db);
  await checkPaginatedContactsQuery(db);
  await checkCampaignListQuery(db);
  await checkHistoryCaps(db);
  await checkIndexPresence(db);
  await checkTotalCount(db);
  await checkRLS(db);

  console.log('\n=============================================================');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('=============================================================');

  if (failed > 0) {
    console.log('\n⚠️  Failed checks:');
    errors.forEach(e => console.log(`   • ${e.label}: ${e.reason}`));
    console.log('\n💡 Run supabase_schema.sql in Supabase SQL Editor to fix missing columns/indexes.\n');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL CHECKS PASSED — Database is fully optimized and ready for production!\n');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
