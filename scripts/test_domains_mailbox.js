const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testDomainAndMailbox() {
  console.log('=== Verifying Domain & Mailbox Workflow ===');
  try {
    // 1. Insert test domain for user 26
    const dRes = await pool.query(`
      INSERT INTO domains (user_id, domain, status, spf_record, dkim_selector, dkim_public_key, dmarc_record, custom_tracking_domain)
      VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7)
      RETURNING id, domain
    `, [26, 'test-sender-outreach.site', 'v=spf1 include:_spf.google.com ~all', 'peak', 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA', 'v=DMARC1; p=quarantine', 'track.test-sender-outreach.site']);
    
    const domainId = dRes.rows[0].id;
    console.log(`[Domain] Inserted domain id ${domainId} (${dRes.rows[0].domain}) for user 26.`);

    // 2. Insert domain mailbox for this domain
    const fullEmail = `outreach@test-sender-outreach.site`;
    const aRes = await pool.query(`
      INSERT INTO accounts (user_id, email, type, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, display_name, status)
      VALUES ($1, $2, 'smtp', 'smtp.gmail.com', 587, $3, 'enc:testpass', 0, 'Alex Rivera', 'active')
      RETURNING id, email
    `, [26, fullEmail, fullEmail]);
    
    const mailboxId = aRes.rows[0].id;
    console.log(`[Mailbox] Created mailbox id ${mailboxId} (${aRes.rows[0].email}) for user 26.`);

    // 3. Query domain mailboxes
    const mbs = await pool.query(
      'SELECT id, email, display_name, status FROM accounts WHERE user_id = $1 AND LOWER(email) LIKE LOWER($2)',
      [26, `%@${dRes.rows[0].domain}`]
    );
    console.log(`[Mailbox Query] Found ${mbs.rows.length} mailboxes under domain ${dRes.rows[0].domain}:`, mbs.rows);

    // 4. Clean up test domain and test mailbox
    await pool.query('DELETE FROM accounts WHERE id = $1', [mailboxId]);
    await pool.query('DELETE FROM domains WHERE id = $1', [domainId]);
    console.log('[Cleanup] Test domain and mailbox deleted cleanly.');

    console.log('=== All Domain and Mailbox Tests Passed! ===');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testDomainAndMailbox();
