const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'app-secret-key-12345';
process.env.SUPABASE_JWT_SECRET = 'supabase-secret-key-67890';

const { verifyJwtToken } = require('../middleware/session');

const supabaseToken = jwt.sign({ id: 42, email: 'user@example.com' }, process.env.SUPABASE_JWT_SECRET, { expiresIn: '5m' });
const appToken = jwt.sign({ id: 7, email: 'admin@example.com' }, process.env.JWT_SECRET, { expiresIn: '5m' });

assert.deepEqual(verifyJwtToken(supabaseToken).id, 42);
assert.deepEqual(verifyJwtToken(appToken).id, 7);
console.log('jwt-secret-compatibility: ok');
