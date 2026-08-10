require('dotenv').config();
const crypto = require('crypto');
const path = require('path');
const { getDb } = require('../db');

async function main() {
  const aiKeyEnv = process.env.AI_ENCRYPTION_KEY || null;
  const jwtSecret = process.env.JWT_SECRET || null;

  if (!aiKeyEnv && !jwtSecret) {
    console.error('ERROR: Neither AI_ENCRYPTION_KEY nor JWT_SECRET is set. Migration requires a secret to derive encryption key.');
    process.exit(1);
  }

  if (!aiKeyEnv) {
    console.warn('Warning: AI_ENCRYPTION_KEY not set, falling back to JWT_SECRET to derive encryption key. This is less secure than specifying AI_ENCRYPTION_KEY.');
  }

  const KEY_SOURCE = aiKeyEnv || jwtSecret;
  const MASTER_KEY = crypto.createHash('sha256').update(String(KEY_SOURCE)).digest(); // 32 bytes

  // AES-256-GCM helpers (same format used by routes/ai.js)
  function encryptAES(key) {
    if (!key) return '';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(Buffer.from(key, 'utf-8')), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `ENC:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  function decryptAES(encKey) {
    if (!encKey) return '';
    if (!encKey.startsWith('ENC:')) return encKey;
    const parts = encKey.split(':');
    if (parts.length !== 4) return '';
    const iv = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    const cipherText = Buffer.from(parts[3], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
    return decrypted.toString('utf-8');
  }

  // Legacy XOR obfuscation used before: ENC:<hex> (single-part after ENC:)
  const LEGACY_SALT = jwtSecret || 'peakxender-ai-key-salt';
  function decryptLegacyXor(encKey) {
    if (!encKey) return '';
    if (!encKey.startsWith('ENC:')) return '';
    const hex = encKey.slice(4);
    if (!hex) return '';
    const buf = Buffer.from(hex, 'hex');
    const saltBuf = Buffer.from(LEGACY_SALT, 'utf-8');
    const out = Buffer.alloc(buf.length);
    for (let i = 0; i < buf.length; i++) {
      out[i] = buf[i] ^ saltBuf[i % saltBuf.length];
    }
    return out.toString('utf-8');
  }

  const db = await getDb();
  const rows = await db.prepare('SELECT id, api_key_encrypted FROM ai_config').all();
  if (!rows || rows.length === 0) {
    console.log('No ai_config rows found; nothing to migrate.');
    process.exit(0);
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const r of rows) {
    const id = r.id;
    const cur = r.api_key_encrypted || '';

    try {
      let plaintext = '';
      if (!cur) {
        console.log(`Row ${id}: empty api key, skipping.`);
        skipped++;
        continue;
      }

      if (cur.startsWith('ENC:')) {
        const parts = cur.split(':');
        if (parts.length === 4) {
          // Already in new AES format — attempt to decrypt to verify we can read it with MASTER_KEY
          const dec = (function(){
            try { return decryptAES(cur); } catch (e) { return ''; }
          })();
          if (!dec) {
            console.warn(`Row ${id}: ENCRYPTED with AES but decryption failed with current key — skipping (possible wrong key).`);
            failed++;
            continue;
          }
          // Already AES and decryptable — no-op
          console.log(`Row ${id}: already AES-encrypted and decryptable — skipping.`);
          skipped++;
          continue;
        } else if (parts.length === 2) {
          // Legacy XOR format 'ENC:<hex>'
          plaintext = decryptLegacyXor(cur);
          if (!plaintext) {
            console.warn(`Row ${id}: legacy XOR decryption produced empty plaintext — skipping.`);
            failed++;
            continue;
          }
        } else {
          console.warn(`Row ${id}: unrecognized ENC format (parts=${parts.length}) — skipping.`);
          skipped++;
          continue;
        }
      } else {
        // Plaintext stored directly
        plaintext = cur;
      }

      if (!plaintext) {
        console.warn(`Row ${id}: plaintext empty after decoding — skipping.`);
        skipped++;
        continue;
      }

      const newEnc = encryptAES(plaintext);
      await db.prepare('UPDATE ai_config SET api_key_encrypted = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newEnc, id);
      console.log(`Row ${id}: re-encrypted and updated.`);
      updated++;
    } catch (err) {
      console.error(`Row ${r.id}: migration failed:`, err.message || err);
      failed++;
    }
  }

  console.log('\nMigration Summary:\n', { total: rows.length, updated, skipped, failed });
  process.exit(failed > 0 ? 2 : 0);
}

main().catch(err => { console.error('Migration failed', err); process.exit(1); });
