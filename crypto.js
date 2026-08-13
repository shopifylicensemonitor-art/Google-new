/**
 * crypto.js — UNIFIED AES-256-GCM Secret Encryption Module
 *
 * Supports BOTH encryption formats for seamless database sharing:
 *   - New format: enc:v1:<iv-b64>:<tag-b64>:<ciphertext-b64>
 *   - Legacy format: ENC:<iv-hex>:<tag-hex>:<ciphertext-hex>
 * 
 * New secrets encrypted with enc:v1 format (URL-safe base64).
 * Existing ENC: format secrets automatically handled.
 */

const crypto = require('crypto');

const PREFIX_NEW = 'enc:v1:';
const PREFIX_LEGACY = 'ENC:';

function getKey() {
  const secret =
    process.env.ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'peakxender-dev-secret-change-me';
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/**
 * Encrypt a string using AES-256-GCM.
 * New format: enc:v1:<iv-b64>:<tag-b64>:<ciphertext-b64>
 */
function encrypt(value) {
  if (value === null || value === undefined || value === '') return value;
  const str = String(value);
  if (str.startsWith(PREFIX_NEW) || str.startsWith(PREFIX_LEGACY)) return str;
  
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(str, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    PREFIX_NEW +
    iv.toString('base64') + ':' + tag.toString('base64') + ':' + ciphertext.toString('base64')
  );
}

/**
 * Decrypt an AES-256-GCM encrypted value.
 * Supports both enc:v1 (base64) and ENC: (hex) formats.
 */
function decrypt(value) {
  if (value === null || value === undefined || value === '') return value;
  const str = String(value);
  
  // New format: enc:v1:<b64>:<b64>:<b64>
  if (str.startsWith(PREFIX_NEW)) {
    try {
      const [ivB64, tagB64, dataB64] = str.slice(PREFIX_NEW.length).split(':');
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        getKey(),
        Buffer.from(ivB64, 'base64')
      );
      decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(dataB64, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch (_) {
      return '';
    }
  }
  
  // Legacy format: ENC:<hex>:<hex>:<hex>
  if (str.startsWith(PREFIX_LEGACY)) {
    try {
      const parts = str.split(':');
      if (parts.length !== 4) return str;
      const iv = Buffer.from(parts[1], 'hex');
      const tag = Buffer.from(parts[2], 'hex');
      const cipherText = Buffer.from(parts[3], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(cipherText), decipher.final()]).toString('utf-8');
    } catch (_) {
      return '';
    }
  }
  
  // Plain text (legacy or unencrypted)
  return str;
}

function isEncrypted(value) {
  const str = String(value || '');
  return str.startsWith(PREFIX_NEW) || str.startsWith(PREFIX_LEGACY);
}

module.exports = { encrypt, decrypt, isEncrypted };
