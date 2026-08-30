/**
 * routes/contacts.js — Contact list management (CSV upload + CRUD).
 *
 * Endpoints:
 *   GET    /api/contacts/lists           → List all contact list names
 *   GET    /api/contacts/:listName       → Get contacts in a list
 *   POST   /api/contacts/upload          → Upload CSV of contacts
 *   POST   /api/contacts                 → Add a single contact
 *   DELETE /api/contacts/:listName       → Delete an entire list
 *   DELETE /api/contacts/:listName/:id   → Delete single contact
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getDb } = require('../db');
const { syncContactListsToActiveCampaigns } = require('../scheduler');

// Multer: store uploads in memory (CSVs are small)
const upload = multer({ storage: multer.memoryStorage() });

/** Force trigger background contact list queue synchronization. */
router.post('/sync', async (req, res) => {
  try {
    const db = await getDb();
    const result = await syncContactListsToActiveCampaigns(db);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** List the current user's distinct contact list names with counts. */
router.get('/lists', async (req, res) => {
  try {
    const db = await getDb();
    const lists = await db.prepare(`
      SELECT list_name, COUNT(*) as count
      FROM contacts
      WHERE user_id = ?
      GROUP BY list_name
      ORDER BY list_name
    `).all(req.userId);
    res.json(lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Retrieve configuration state for a device/IP strictly scoped by current user. */
router.get('/state/retrieve', async (req, res) => {
  try {
    const db = await getDb();
    const deviceId = req.query.device_id || '';
    const uid = req.userId;

    let row;
    if (deviceId) {
      row = await db.prepare('SELECT state_data FROM device_states WHERE device_id = ? AND user_id = ?').get(deviceId, uid);
    }
    if (!row) {
      row = await db.prepare('SELECT state_data FROM device_states WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1').get(uid);
    }

    if (row && row.state_data) {
      res.json(JSON.parse(row.state_data));
    } else {
      res.json(null);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Save configuration state for a device/IP scoped by user. */
router.post('/state/save', async (req, res) => {
  try {
    const db = await getDb();
    const { device_id: deviceId, state_data: stateData } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const uid = req.userId;

    if (!deviceId) {
      return res.status(400).json({ error: 'device_id is required.' });
    }

    const stateStr = typeof stateData === 'string' ? stateData : JSON.stringify(stateData);

    const existing = await db.prepare('SELECT device_id FROM device_states WHERE device_id = ? AND user_id = ?').get(deviceId, uid);
    if (existing) {
      await db.prepare('UPDATE device_states SET state_data = ?, ip_address = ?, updated_at = datetime(\'now\') WHERE device_id = ? AND user_id = ?')
        .run(stateStr, ip, deviceId, uid);
    } else {
      await db.prepare('INSERT INTO device_states (device_id, user_id, ip_address, state_data) VALUES (?, ?, ?, ?)')
        .run(deviceId, uid, ip, stateStr);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Get email activity history for a specific recipient email address. */
router.get('/history/:email', async (req, res) => {
  try {
    const db = await getDb();
    const email = req.params.email;

    // Sent queue emails — specific columns, capped at 50 most recent
    const queueSends = await db.prepare(`
      SELECT q.id, q.campaign_id, q.recipient_email, q.status, q.sent_at,
             q.error, q.step_number, q.opens_count, q.clicks_count,
             c.name as campaign_name
      FROM queue q
      LEFT JOIN campaigns c ON q.campaign_id = c.id
      WHERE q.recipient_email = ? AND c.user_id = ?
      ORDER BY q.id DESC
      LIMIT 50
    `).all(email, req.userId);

    // Logs — specific columns, capped at 20
    const logItems = await db.prepare(`
      SELECT l.id, l.campaign_id, l.account_id, l.recipient_email,
             l.status, l.message, l.created_at
      FROM logs l
      LEFT JOIN campaigns c ON l.campaign_id = c.id
      LEFT JOIN accounts a ON l.account_id = a.id
      WHERE l.recipient_email = ? AND (c.user_id = ? OR a.user_id = ?)
      ORDER BY l.id DESC LIMIT 20
    `).all(email, req.userId, req.userId);

    // Received inbox replies — specific columns, capped at 20
    const replies = await db.prepare(`
      SELECT m.id, m.account_id, m.sender_email, m.recipient_email,
             m.subject, m.body_text, m.sentiment, m.is_read, m.created_at
      FROM inbox_messages m
      LEFT JOIN accounts a ON m.account_id = a.id
      WHERE (m.sender_email = ? OR m.recipient_email = ?)
        AND (m.user_id = ? OR a.user_id = ?)
      ORDER BY m.id DESC
      LIMIT 20
    `).all(email, email, req.userId, req.userId);

    res.set('Cache-Control', 'private, max-age=15');
    res.json({
      sends: queueSends || [],
      logs: logItems || [],
      replies: replies || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Get contacts in a specific list with server-side pagination and status indicators. */
router.get('/:listName', async (req, res) => {
  try {
    const db = await getDb();

    // Enforce a safe default page size; cap at 500 per request
    const requestedLimit = parseInt(req.query.limit, 10);
    const pageLimit = (!isNaN(requestedLimit) && requestedLimit > 0)
      ? Math.min(requestedLimit, 500)
      : 200;
    const pageOffset = parseInt(req.query.offset, 10);
    const offset = (!isNaN(pageOffset) && pageOffset >= 0) ? pageOffset : 0;

    // Specific columns only — skip internal-only or unused fields in list view
    const selectCols = 'id, list_name, email, fields, status, created_at';
    const contacts = await db.prepare(
      `SELECT ${selectCols} FROM contacts WHERE list_name = ? AND user_id = ? ORDER BY id LIMIT ? OFFSET ?`
    ).all(req.params.listName, req.userId, pageLimit, offset);

    // Cheap total count for frontend paginator
    const countRow = await db.prepare(
      'SELECT COUNT(*) as total FROM contacts WHERE list_name = ? AND user_id = ?'
    ).get(req.params.listName, req.userId);
    const total = countRow ? (countRow.total || 0) : 0;

    const parsedContacts = contacts.map(c => {
      try { c.fields = c.fields ? JSON.parse(c.fields) : {}; } catch (_) { c.fields = {}; }
      return c;
    });

    // Compute status indicators from queue — only for the current page of emails
    const emails = parsedContacts.map(c => c.email).filter(Boolean);
    if (emails.length > 0) {
      const statusMap = new Map();
      const chunkSize = 200;

      for (let i = 0; i < emails.length; i += chunkSize) {
        const chunk = emails.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => '?').join(',');
        const queueRows = await db.prepare(`
          SELECT q.recipient_email, q.status, q.sent_at, q.error, c.name as campaign_name
          FROM queue q
          JOIN campaigns c ON q.campaign_id = c.id
          WHERE c.user_id = ? AND q.recipient_email IN (${placeholders})
        `).all(req.userId, ...chunk);

        for (const row of queueRows) {
          const emailLower = (row.recipient_email || '').toLowerCase();
          const existing = statusMap.get(emailLower);
          let rank = 0;
          let mappedStatus = 'pending';
          if (row.status === 'sent')         { rank = 4; mappedStatus = 'sent'; }
          else if (row.status === 'sending') { rank = 3; mappedStatus = 'sending'; }
          else if (row.status === 'pending') { rank = 2; mappedStatus = 'queued'; }
          else if (row.status === 'failed')  { rank = 1; mappedStatus = 'failed'; }

          if (!existing || rank > existing.rank) {
            statusMap.set(emailLower, {
              status: mappedStatus,
              campaign_name: row.campaign_name || 'Active Campaign',
              sent_at: row.sent_at,
              error: row.error,
              rank
            });
          }
        }
      }

      parsedContacts.forEach(c => {
        const info = statusMap.get((c.email || '').toLowerCase());
        c.status = info ? info.status : 'pending';
        if (info) {
          c.campaign_name = info.campaign_name;
          c.sent_at = info.sent_at;
          c.error = info.error;
        }
      });
    }

    // Expose total for frontend paginator; cache for 30s (contacts change infrequently)
    res.set('X-Total-Count', String(total));
    res.set('Cache-Control', 'private, max-age=30');
    res.json(parsedContacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Bulk add contacts to a list via JSON body. */
router.post('/import-bulk', async (req, res) => {
  const { list_name: listName, contacts } = req.body;
  if (!listName) return res.status(400).json({ error: 'list_name is required.' });
  if (!Array.isArray(contacts)) return res.status(400).json({ error: 'contacts array is required.' });

  try {
    const db = await getDb();

    // Fetch existing emails to prevent duplicates efficiently
    const existing = await db
      .prepare('SELECT email FROM contacts WHERE list_name = ? AND user_id = ?')
      .all(listName, req.userId);
    const existingEmails = new Set(existing.map(row => row.email.toLowerCase()));

    const contactsToInsert = [];
    const seenInRequest = new Set();
    let added = 0;
    let skipped = 0;

    for (const c of contacts) {
      const email = (c.email || '').trim();
      if (!email || !email.includes('@')) {
        skipped++;
        continue;
      }
      const emailLower = email.toLowerCase();
      if (existingEmails.has(emailLower) || seenInRequest.has(emailLower)) {
        skipped++;
        continue;
      }
      seenInRequest.add(emailLower);
      
      contactsToInsert.push({
        email,
        fieldsJson: JSON.stringify(c.fields || {})
      });
    }

    // Bulk insert in chunks of 200 using a transaction
    if (contactsToInsert.length > 0) {
      const insertTransaction = db.transaction(async (txDb) => {
        const chunkSize = 200;
        for (let i = 0; i < contactsToInsert.length; i += chunkSize) {
          const chunk = contactsToInsert.slice(i, i + chunkSize);
          const placeholders = chunk.map(() => '(?, ?, ?, ?)').join(', ');
          const sql = `INSERT INTO contacts (list_name, email, fields, user_id) VALUES ${placeholders}`;
          const params = [];
          chunk.forEach(item => {
            params.push(listName, item.email, item.fieldsJson, req.userId);
          });
          await txDb.prepare(sql).run(params);
          added += chunk.length;
        }
      });
      await insertTransaction();
    }

    // Trigger background sync to immediately enqueue new contacts for active campaigns
    syncContactListsToActiveCampaigns(db).catch(() => {});

    res.json({
      success: true,
      added,
      skipped,
      total: added + skipped,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Robust CSV parser aligned with the frontend (csvParser.ts).
 * Handles: comma, semicolon, and tab delimiters; quoted fields with
 * escaped double-quotes ("") and embedded newlines; headerless CSVs.
 * Returns an array of string arrays (rows × cells).
 */
function parseCSV(text) {
  if (!text || !text.trim()) return [];

  // Detect delimiter from the first line
  const firstLine = text.split(/\r?\n/)[0] || '';
  let delimiter = ',';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount  = (firstLine.match(/;/g) || []).length;
  const tabCount   = (firstLine.match(/\t/g) || []).length;

  if (semiCount > commaCount && semiCount > tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semiCount) {
    delimiter = '\t';
  }

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped double-quote
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r' || char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.length > 0 && (currentRow.length > 1 || currentRow[0] !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        currentField += char;
      }
    }
  }

  // Handle final field / row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.length > 0 && (currentRow.length > 1 || currentRow[0] !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/** Normalize header to alphanumeric with underscores */
function normalizeHeaderKey(header) {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Fuzzy-matches a CSV header against known field names.
 * Aligned with the frontend suggestFieldMapping in csvParser.ts.
 */
function suggestFieldMapping(header) {
  const norm = header.toLowerCase().trim().replace(/[-_\s]/g, '');

  if (
    norm === 'email' ||
    norm.startsWith('email') ||
    norm === 'emailaddress' ||
    norm === 'contactemail' ||
    norm === 'mail' ||
    norm === 'to' ||
    norm === 'recipient'
  ) {
    return 'email';
  }

  if (
    norm === 'firstname' ||
    norm === 'fname' ||
    norm === 'name' ||
    norm === 'first' ||
    norm === 'contactname' ||
    norm === 'leadname' ||
    norm.startsWith('firstname') ||
    norm.startsWith('name')
  ) {
    return 'first_name';
  }

  if (
    norm === 'storename' ||
    norm === 'store' ||
    norm === 'shop' ||
    norm === 'shopname' ||
    norm === 'brand' ||
    norm === 'brandname' ||
    norm === 'website' ||
    norm === 'domain' ||
    norm === 'company' ||
    norm === 'companyname' ||
    norm.startsWith('store') ||
    norm.startsWith('shop') ||
    norm.startsWith('brand') ||
    norm.startsWith('website') ||
    norm.startsWith('company')
  ) {
    return 'store_name';
  }

  if (
    norm === 'niche' ||
    norm === 'industry' ||
    norm === 'category' ||
    norm === 'vertical' ||
    norm === 'tag' ||
    norm.startsWith('niche') ||
    norm.startsWith('industry')
  ) {
    return 'niche';
  }

  if (
    norm === 'painpoint' ||
    norm === 'pain' ||
    norm === 'problem' ||
    norm === 'issue' ||
    norm === 'offer' ||
    norm.startsWith('painpoint') ||
    norm.startsWith('problem')
  ) {
    return 'pain_point';
  }

  return '';
}

/** Extract multiple emails and a single URL from cell value */
function extractEmailsAndUrlsFromCell(cellValue) {
  const trimmed = cellValue.trim();
  if (!trimmed) return { emails: [], url: '' };
  
  const emailMatches = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  let emailCandidates = Array.from(new Set(emailMatches.map(e => e.trim().toLowerCase())));
  
  if (emailCandidates.length === 0) {
    emailCandidates = trimmed.split(/[:;]/).map(e => e.trim().toLowerCase()).filter(Boolean);
  }
  
  const urlRegex = /(https?:\/\/[^\s;:]+)/i;
  const wwwRegex = /(www\.[^\s;:]+\.[^\s;:]+)/i;
  const urlMatch = trimmed.match(urlRegex) || trimmed.match(wwwRegex);
  let extractedUrl = urlMatch ? urlMatch[0].trim() : '';
  
  if (!extractedUrl) {
    const tokens = trimmed.split(/[\s;:•]+/);
    for (const token of tokens) {
      const t = token.trim();
      if (t.includes('.') && !t.includes('@') && t.length > 4 && !t.endsWith('.')) {
        if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(t)) {
          extractedUrl = t;
          break;
        }
      }
    }
  }
  return { emails: emailCandidates, url: extractedUrl };
}

/** Upload a CSV file of contacts. */
router.post('/upload', upload.single('file'), async (req, res) => {
  const listName = req.body.list_name;
  if (!listName) return res.status(400).json({ error: 'list_name is required.' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  try {
    const db = await getDb();
    const csv = req.file.buffer.toString('utf-8');
    const rows = parseCSV(csv);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Empty CSV file.' });
    }

    const headers = rows[0];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isHeaderless = headers.some(cell => emailRegex.test(cell.trim()));

    let finalHeaders = [];
    let dataRows = [];
    let emailColIndex = -1;

    if (isHeaderless) {
      dataRows = rows;
      finalHeaders = headers.map((cell, idx) => {
        if (emailRegex.test(cell.trim())) {
          emailColIndex = idx;
          return 'email';
        }
        return `column_${idx + 1}`;
      });
      if (emailColIndex === -1) {
        emailColIndex = 0;
      }
    } else {
      dataRows = rows.slice(1);
      finalHeaders = headers.map((h, idx) => {
        const mapped = suggestFieldMapping(h);
        if (mapped === 'email') {
          emailColIndex = idx;
        }
        return mapped || normalizeHeaderKey(h);
      });
      if (emailColIndex === -1) {
        emailColIndex = finalHeaders.findIndex(h => h === 'email' || h.includes('email'));
      }
      if (emailColIndex === -1) {
        emailColIndex = 0;
      }
    }

    let added = 0;
    let skipped = 0;

    // Fetch existing emails to prevent duplicates efficiently
    const existing = await db
      .prepare('SELECT email FROM contacts WHERE list_name = ? AND user_id = ?')
      .all(listName, req.userId);
    const existingEmails = new Set(existing.map(row => row.email.toLowerCase()));

    const contactsToInsert = [];
    const seenInCsv = new Set();

    for (const row of dataRows) {
      const emailCell = (row[emailColIndex] || '').trim();
      if (!emailCell) {
        skipped++;
        continue;
      }

      const { emails, url } = extractEmailsAndUrlsFromCell(emailCell);
      if (emails.length === 0) {
        skipped++;
        continue;
      }

      // Build key-value fields object
      const fields = {};
      finalHeaders.forEach((header, idx) => {
        if (idx !== emailColIndex) {
          fields[header] = row[idx] || '';
        }
      });

      if (url) {
        fields['store_url'] = url;
        if (!fields['store_name']) {
          fields['store_name'] = url;
        }
      }

      const fieldsJson = JSON.stringify(fields);

      for (const email of emails) {
        const emailLower = email.toLowerCase();
        if (existingEmails.has(emailLower) || seenInCsv.has(emailLower)) {
          skipped++;
          continue;
        }
        seenInCsv.add(emailLower);
        contactsToInsert.push({ email, fieldsJson });
      }
    }

    // Bulk insert in chunks of 200 using a transaction
    if (contactsToInsert.length > 0) {
      const insertTransaction = db.transaction(async (txDb) => {
        const chunkSize = 200;
        for (let i = 0; i < contactsToInsert.length; i += chunkSize) {
          const chunk = contactsToInsert.slice(i, i + chunkSize);
          const placeholders = chunk.map(() => '(?, ?, ?, ?)').join(', ');
          const sql = `INSERT INTO contacts (list_name, email, fields, user_id) VALUES ${placeholders}`;
          const params = [];
          chunk.forEach(c => {
            params.push(listName, c.email, c.fieldsJson, req.userId);
          });
          await txDb.prepare(sql).run(params);
          added += chunk.length;
        }
      });
      await insertTransaction();
    }

    // Trigger background sync to immediately enqueue new contacts for active campaigns
    syncContactListsToActiveCampaigns(db).catch(() => {});

    res.json({
      success: true,
      added,
      skipped,
      total: added + skipped,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Add a single contact to a list. */
router.post('/', async (req, res) => {
  const { list_name, email } = req.body;
  if (!list_name || !email) {
    return res.status(400).json({ error: 'list_name and email are required.' });
  }

  try {
    const db = await getDb();
    const existing = await db.prepare(
      'SELECT id FROM contacts WHERE list_name = ? AND email = ? AND user_id = ?'
    ).get(list_name, email, req.userId);

    if (existing) {
      return res.status(409).json({ error: 'Contact already exists in this list.' });
    }

    const result = await db.prepare(
      'INSERT INTO contacts (list_name, email, user_id) VALUES (?, ?, ?)'
    ).run(list_name, email, req.userId);

    // Trigger background sync
    syncContactListsToActiveCampaigns(db).catch(() => {});

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Delete an entire contact list. */
router.delete('/:listName', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db
      .prepare('DELETE FROM contacts WHERE list_name = ? AND user_id = ?')
      .run(req.params.listName, req.userId);
    res.json({ success: true, deleted: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** Delete a single contact from a list. */
router.delete('/:listName/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.prepare('DELETE FROM contacts WHERE id = ? AND list_name = ? AND user_id = ?')
      .run(req.params.id, req.params.listName, req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

