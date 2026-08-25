/**
 * routes/domains.js — Sender Domain & EMSP DNS Management.
 *
 * Provides complete domain sending capabilities, automated 2048-bit RSA DKIM
 * keypair generation, live SPF/DKIM/DMARC/MX/CNAME DNS resolver checks, and
 * branded custom tracking domain verification.
 *
 * Endpoints:
 *   GET    /api/domains           → List user domains
 *   POST   /api/domains           → Register new sender domain & generate DKIM
 *   POST   /api/domains/:id/verify → Run live DNS verification
 *   PUT    /api/domains/:id/tracking → Configure custom tracking domain
 *   DELETE /api/domains/:id       → Delete domain
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const dns = require('dns').promises;
const { getDb } = require('../db');
const logger = require('../logger');
const { encrypt, decrypt } = require('../crypto');

/** Generate 2048-bit RSA Keypair for DKIM Signing */
function generateDkimKeypair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  // Strip PEM headers to extract pure base64 public key for DNS TXT record
  const cleanPublicKey = publicKey
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '');

  return {
    publicKeyClean: cleanPublicKey,
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
  };
}

/** Format clean domain string */
function sanitizeDomain(domainStr) {
  if (!domainStr || typeof domainStr !== 'string') return '';
  return domainStr
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '');
}

/** GET /api/domains — List all registered domains for user */
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db
      .prepare('SELECT id, domain, status, spf_record, dkim_selector, dkim_public_key, dmarc_record, custom_tracking_domain, tracking_status, mx_verified, created_at FROM domains WHERE user_id = ? ORDER BY id DESC')
      .all(req.userId);

    const domains = (rows || []).map(row => ({
      ...row,
      dkim_record: `v=DKIM1; k=rsa; p=${row.dkim_public_key || ''}`,
      dkim_host: `${row.dkim_selector || 'peak'}._domainkey.${row.domain}`,
      dmarc_host: `_dmarc.${row.domain}`,
      spf_host: row.domain,
      tracking_host: row.custom_tracking_domain || `track.${row.domain}`,
      tracking_target: process.env.TRACKING_CNAME_TARGET || 'send.peakconix.site'
    }));

    res.json({ domains });
  } catch (err) {
    logger.error({ err }, 'Error fetching domains');
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/domains — Register new sender domain & auto-generate DKIM keys */
router.post('/', async (req, res) => {
  try {
    const rawDomain = req.body.domain;
    const domain = sanitizeDomain(rawDomain);
    const customTracking = sanitizeDomain(req.body.custom_tracking_domain) || `track.${domain}`;
    const selector = (req.body.dkim_selector || 'peak').trim().toLowerCase();

    if (!domain || !domain.includes('.')) {
      return res.status(400).json({ error: 'Please enter a valid domain name (e.g. outreach.company.com).' });
    }

    const db = await getDb();
    const existing = await db
      .prepare('SELECT id FROM domains WHERE domain = ? AND user_id = ?')
      .get(domain, req.userId);

    if (existing) {
      return res.status(400).json({ error: `Domain ${domain} is already registered.` });
    }

    // Generate 2048-bit RSA DKIM Keypair
    const { publicKeyClean, privateKeyPem } = generateDkimKeypair();
    const encryptedPrivateKey = encrypt(privateKeyPem);

    const spfRecord = `v=spf1 include:_spf.google.com ~all`;
    const dmarcRecord = `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc-reports@${domain}`;

    const result = await db.prepare(`
      INSERT INTO domains (
        user_id, domain, status, spf_record, dkim_selector, dkim_public_key, 
        dkim_private_key, dmarc_record, custom_tracking_domain, tracking_status
      ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
      req.userId,
      domain,
      spfRecord,
      selector,
      publicKeyClean,
      encryptedPrivateKey,
      dmarcRecord,
      customTracking
    );

    res.status(201).json({
      success: true,
      domain_id: result.lastInsertRowid,
      domain,
      status: 'pending',
      dns_instructions: {
        spf: { host: '@', type: 'TXT', value: spfRecord },
        dkim: { host: `${selector}._domainkey`, type: 'TXT', value: `v=DKIM1; k=rsa; p=${publicKeyClean}` },
        dmarc: { host: '_dmarc', type: 'TXT', value: dmarcRecord },
        tracking: { host: customTracking.replace(`.${domain}`, ''), type: 'CNAME', value: process.env.TRACKING_CNAME_TARGET || 'send.peakconix.site' },
        mx: { host: '@', type: 'MX', value: `10 mail.${domain}`, priority: 10 }
      }
    });
  } catch (err) {
    logger.error({ err }, 'Error creating domain');
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/domains/:id/verify — Perform live DNS query verification */
router.post('/:id/verify', async (req, res) => {
  try {
    const db = await getDb();
    const domainRow = await db
      .prepare('SELECT * FROM domains WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.userId);

    if (!domainRow) {
      return res.status(404).json({ error: 'Domain not found.' });
    }

    const domain = domainRow.domain;
    const selector = domainRow.dkim_selector || 'peak';
    const trackingHost = domainRow.custom_tracking_domain || `track.${domain}`;

    const verification = {
      spf: { valid: false, record: null, message: '' },
      dkim: { valid: false, record: null, message: '' },
      dmarc: { valid: false, record: null, message: '' },
      mx: { valid: false, records: [], message: '' },
      tracking: { valid: false, target: null, message: '' },
    };

    // 1. Verify SPF Record
    try {
      const txtRecords = await dns.resolveTxt(domain);
      const flat = (txtRecords || []).map(r => r.join(''));
      const spf = flat.find(t => t.toLowerCase().startsWith('v=spf1'));
      if (spf) {
        verification.spf.valid = true;
        verification.spf.record = spf;
        verification.spf.message = 'SPF TXT record verified.';
      } else {
        verification.spf.message = 'No v=spf1 TXT record found.';
      }
    } catch (e) {
      verification.spf.message = `SPF lookup failed: ${e.code || e.message}`;
    }

    // 2. Verify DKIM Record
    try {
      const dkimHost = `${selector}._domainkey.${domain}`;
      const dkimTxt = await dns.resolveTxt(dkimHost);
      const flatDkim = (dkimTxt || []).map(r => r.join(''));
      const dkimFound = flatDkim.find(t => t.toLowerCase().startsWith('v=dkim1') || t.includes(domainRow.dkim_public_key.slice(0, 30)));
      if (dkimFound) {
        verification.dkim.valid = true;
        verification.dkim.record = dkimFound;
        verification.dkim.message = 'DKIM public key TXT verified.';
      } else {
        verification.dkim.message = `No matching DKIM key at ${dkimHost}`;
      }
    } catch (e) {
      verification.dkim.message = `DKIM lookup failed: ${e.code || e.message}`;
    }

    // 3. Verify DMARC Record
    try {
      const dmarcHost = `_dmarc.${domain}`;
      const dmarcTxt = await dns.resolveTxt(dmarcHost);
      const flatDmarc = (dmarcTxt || []).map(r => r.join(''));
      const dmarcFound = flatDmarc.find(t => t.toLowerCase().startsWith('v=dmarc1'));
      if (dmarcFound) {
        verification.dmarc.valid = true;
        verification.dmarc.record = dmarcFound;
        verification.dmarc.message = 'DMARC policy TXT verified.';
      } else {
        verification.dmarc.message = `No DMARC TXT record at ${dmarcHost}`;
      }
    } catch (e) {
      verification.dmarc.message = `DMARC lookup failed: ${e.code || e.message}`;
    }

    // 4. Verify MX Mail Routing
    try {
      const mxRecords = await dns.resolveMx(domain);
      if (mxRecords && mxRecords.length > 0) {
        verification.mx.valid = true;
        verification.mx.records = mxRecords.map(r => r.exchange);
        verification.mx.message = 'Inbound MX records detected.';
      } else {
        verification.mx.message = 'No MX records found.';
      }
    } catch (e) {
      verification.mx.message = `MX lookup failed: ${e.code || e.message}`;
    }

    // 5. Verify Custom Tracking CNAME
    try {
      const cnames = await dns.resolveCname(trackingHost);
      if (cnames && cnames.length > 0) {
        verification.tracking.valid = true;
        verification.tracking.target = cnames[0];
        verification.tracking.message = `CNAME resolves to ${cnames[0]}`;
      }
    } catch (e) {
      verification.tracking.message = `Tracking CNAME lookup failed: ${e.code || e.message}`;
    }

    // Compute Overall Status
    const isFullyVerified = verification.spf.valid && verification.dkim.valid && verification.dmarc.valid;
    const overallStatus = isFullyVerified ? 'verified' : (verification.spf.valid || verification.dkim.valid ? 'partial' : 'failed');
    const trackingStatus = verification.tracking.valid ? 'verified' : 'pending';

    await db.prepare(`
      UPDATE domains 
      SET status = ?, tracking_status = ?, mx_verified = ?
      WHERE id = ? AND user_id = ?
    `).run(
      overallStatus,
      trackingStatus,
      verification.mx.valid ? 1 : 0,
      domainRow.id,
      req.userId
    );

    res.json({
      success: true,
      domain,
      status: overallStatus,
      is_fully_verified: isFullyVerified,
      verification
    });
  } catch (err) {
    logger.error({ err }, 'Error verifying domain DNS');
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/domains/:id/tracking — Update custom tracking domain */
router.put('/:id/tracking', async (req, res) => {
  try {
    const customTracking = sanitizeDomain(req.body.custom_tracking_domain);
    if (!customTracking || !customTracking.includes('.')) {
      return res.status(400).json({ error: 'Please enter a valid tracking subdomain (e.g. track.company.com).' });
    }

    const db = await getDb();
    await db.prepare(`
      UPDATE domains 
      SET custom_tracking_domain = ?, tracking_status = 'pending'
      WHERE id = ? AND user_id = ?
    `).run(customTracking, req.params.id, req.userId);

    res.json({ success: true, custom_tracking_domain: customTracking });
  } catch (err) {
    logger.error({ err }, 'Error updating tracking domain');
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/domains/:id — Remove domain */
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    await db.prepare('DELETE FROM domains WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
    res.json({ success: true, message: 'Domain removed.' });
  } catch (err) {
    logger.error({ err }, 'Error deleting domain');
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
