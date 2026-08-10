/**
 * sync_sqlite_to_postgres.js — Migrate local SQLite data to Supabase PostgreSQL.
 *
 * Reads contacts, campaigns, campaign_steps, and queue items from `mailflow.db`
 * and inserts them into PostgreSQL. Sanitizes colon/semicolon-separated email strings.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

function sanitizeEmails(rawEmail) {
  if (!rawEmail || typeof rawEmail !== 'string') return [];
  const matches = rawEmail.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  return Array.from(new Set(matches.map(e => e.trim().toLowerCase())));
}

(async () => {
  console.log('Starting SQLite -> PostgreSQL Migration...');

  // 1. Connect to SQLite
  process.env.USE_SQLITE = 'true';
  delete require.cache[require.resolve('../db')];
  const sqliteDb = await (require('../db').getDb());

  // 2. Connect to PostgreSQL
  delete process.env.USE_SQLITE;
  delete require.cache[require.resolve('../db')];
  const pgDb = await (require('../db').getDb());

  console.log('Connected to both databases successfully.');

  // Migrate Contacts
  const sqliteLists = await sqliteDb.prepare('SELECT DISTINCT list_name FROM contacts').all();
  console.log(`Found ${sqliteLists.length} contact list(s) in SQLite.`);

  for (const listRow of sqliteLists) {
    const listName = listRow.list_name;
    const sqliteContacts = await sqliteDb.prepare('SELECT * FROM contacts WHERE list_name = ?').all(listName);
    console.log(`Migrating list "${listName}" (${sqliteContacts.length} items)...`);

    const existingPg = await pgDb.prepare('SELECT email FROM contacts WHERE list_name = ?').all(listName);
    const existingEmails = new Set(existingPg.map(r => r.email.toLowerCase()));

    const toInsert = [];
    let skippedCount = 0;

    for (const c of sqliteContacts) {
      const cleanEmails = sanitizeEmails(c.email);
      if (cleanEmails.length === 0) {
        skippedCount++;
        continue;
      }
      for (const email of cleanEmails) {
        if (!existingEmails.has(email)) {
          existingEmails.add(email);
          toInsert.push({ email, fields: c.fields || null });
        } else {
          skippedCount++;
        }
      }
    }

    if (toInsert.length > 0) {
      console.log(`Inserting ${toInsert.length} clean contact(s) into PostgreSQL for list "${listName}"...`);
      const chunkSize = 200;
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => '(?, ?, ?)').join(', ');
        const sql = `INSERT INTO contacts (list_name, email, fields) VALUES ${placeholders}`;
        const params = [];
        chunk.forEach(item => {
          params.push(listName, item.email, item.fields);
        });
        await pgDb.prepare(sql).run(params);
      }
    }
    console.log(`Finished "${listName}": ${toInsert.length} inserted, ${skippedCount} skipped/duplicates.`);
  }

  // Migrate Campaigns
  const sqliteCampaigns = await sqliteDb.prepare('SELECT * FROM campaigns').all();
  console.log(`Found ${sqliteCampaigns.length} campaign(s) in SQLite.`);

  for (const camp of sqliteCampaigns) {
    const existingCamp = await pgDb.prepare('SELECT id FROM campaigns WHERE name = ? AND contact_list = ?').get(camp.name, camp.contact_list);
    let pgCampId;

    if (existingCamp) {
      pgCampId = existingCamp.id;
      console.log(`Campaign "${camp.name}" already exists in PG (id=${pgCampId}).`);
    } else {
      // Count total contacts in PG for this list
      const countRow = await pgDb.prepare('SELECT COUNT(*) as total FROM contacts WHERE list_name = ?').get(camp.contact_list);
      const totalContacts = countRow ? parseInt(countRow.total, 10) : 0;

      const res = await pgDb.prepare(`
        INSERT INTO campaigns
          (name, subject, body_html, body_plain, contact_list, delay_seconds, start_time, end_time, status, total_contacts, content_variations, content_mode, ignore_window)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        camp.name, camp.subject, camp.body_html || '', camp.body_plain || '',
        camp.contact_list, camp.delay_seconds || 30, camp.start_time || '08:00',
        camp.end_time || '22:00', camp.status || 'draft', totalContacts,
        camp.content_variations || null, camp.content_mode || 'single', camp.ignore_window || 0
      );
      pgCampId = res.lastInsertRowid;
      console.log(`Created campaign "${camp.name}" in PG (id=${pgCampId}, total_contacts=${totalContacts}).`);
    }

    // Populate queue if pending queue exists in SQLite
    const sqliteQueue = await sqliteDb.prepare('SELECT * FROM queue WHERE campaign_id = ?').all(camp.id);
    const existingQueueCount = await pgDb.prepare('SELECT COUNT(*) as count FROM queue WHERE campaign_id = ?').get(pgCampId);

    if (sqliteQueue.length > 0 && (!existingQueueCount || parseInt(existingQueueCount.count, 10) === 0)) {
      console.log(`Migrating ${sqliteQueue.length} queue item(s) for campaign id=${pgCampId}...`);

      const accounts = await pgDb.prepare("SELECT id FROM accounts WHERE status = 'active'").all();
      const activeAccountIds = accounts.map(a => a.id);

      const queueToInsert = [];
      for (let idx = 0; idx < sqliteQueue.length; idx++) {
        const item = sqliteQueue[idx];
        const cleanEmails = sanitizeEmails(item.recipient_email);
        if (cleanEmails.length === 0) continue;

        const assignedAccount = activeAccountIds.length > 0 ? activeAccountIds[idx % activeAccountIds.length] : null;

        for (const recipientEmail of cleanEmails) {
          queueToInsert.push({
            campaign_id: pgCampId,
            recipient_email: recipientEmail,
            account_id: assignedAccount,
            status: item.status === 'sent' ? 'sent' : 'pending',
            scheduled_at: item.scheduled_at || new Date().toISOString(),
            fields: item.fields || null,
          });
        }
      }

      if (queueToInsert.length > 0) {
        const chunkSize = 200;
        for (let i = 0; i < queueToInsert.length; i += chunkSize) {
          const chunk = queueToInsert.slice(i, i + chunkSize);
          const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
          const sql = `INSERT INTO queue (campaign_id, recipient_email, account_id, status, scheduled_at, fields) VALUES ${placeholders}`;
          const params = [];
          chunk.forEach(q => {
            params.push(q.campaign_id, q.recipient_email, q.account_id, q.status, q.scheduled_at, q.fields);
          });
          await pgDb.prepare(sql).run(params);
        }
        console.log(`Inserted ${queueToInsert.length} clean queue item(s) into PG.`);
      }
    }
  }

  console.log('Migration Completed Successfully!');
  process.exit(0);
})();
