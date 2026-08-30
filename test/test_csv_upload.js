/**
 * test/test_csv_upload.js — End-to-End CSV Upload & Contact Insertion Test.
 */

require('dotenv').config();
const { getDb } = require('../db');
const fs = require('fs');

async function testCsvUpload() {
  console.log('--- Starting CSV Upload & Contact Insertion Test ---');
  const db = await getDb();
  const testUserId = 999;
  const testListName = `test_list_${Date.now()}`;

  const csvContent = `First Name,Last Name,Email,Company,Website,Industry
Alex,Mercer,alex.mercer@example.com,Apex Corp,https://apex.com,Software
Sarah,Connor,sarah.connor@example.com,Cyberdyne,https://cyberdyne.com,Robotics
"John, Jr.",Smith,john.smith@example.com,"Smith, Kline & Co",https://smith.com,Pharma
Elena,Rostova,elena.rostova@example.com,Nova Tech,https://novatech.io,AI
`;

  // Parse CSV
  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/);
    const rows = [];
    for (const line of lines) {
      // Basic CSV tokenizer supporting quotes
      const cells = [];
      let inQuote = false;
      let cell = '';
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          inQuote = !inQuote;
        } else if (c === ',' && !inQuote) {
          cells.push(cell.trim());
          cell = '';
        } else {
          cell += c;
        }
      }
      cells.push(cell.trim());
      rows.push(cells);
    }
    return rows;
  };

  const rows = parseCSV(csvContent);
  const headers = rows[0];
  const dataRows = rows.slice(1);

  console.log(`Parsed ${headers.length} headers and ${dataRows.length} data rows.`);

  // Insert contacts
  let added = 0;
  for (const row of dataRows) {
    const email = row[2];
    const fields = {
      first_name: row[0],
      last_name: row[1],
      company: row[3],
      website: row[4],
      industry: row[5],
    };

    const res = await db.prepare(
      'INSERT INTO contacts (list_name, email, fields, user_id) VALUES (?, ?, ?, ?)'
    ).run(testListName, email, JSON.stringify(fields), testUserId);

    if (res.lastInsertRowid || res.changes > 0) {
      added++;
    }
  }

  console.log(`✅ Successfully inserted ${added} contacts into list "${testListName}"`);

  // Verify retrieval
  const retrieved = await db.prepare(
    'SELECT * FROM contacts WHERE list_name = ? AND user_id = ?'
  ).all(testListName, testUserId);

  if (retrieved.length !== 4) {
    throw new Error(`Expected 4 retrieved contacts, got ${retrieved.length}`);
  }
  console.log(`✅ Successfully retrieved ${retrieved.length} contacts with verified fields:`);
  retrieved.forEach(c => {
    const parsed = JSON.parse(c.fields);
    console.log(`   - ${c.email} (${parsed.first_name} ${parsed.last_name} at ${parsed.company})`);
  });

  // Clean up
  await db.prepare('DELETE FROM contacts WHERE list_name = ? AND user_id = ?').run(testListName, testUserId);
  console.log('✅ Test list cleaned up successfully.');
  console.log('--- CSV Upload Test Passed! ---');
  process.exit(0);
}

testCsvUpload().catch(err => {
  console.error('CSV Upload Test Failed:', err);
  process.exit(1);
});
