/**
 * routes/ai.js â€” Universal OpenAI-compatible AI API router for Peak Xender.
 *
 * Supports 10+ providers (OpenRouter, Nvidia NIM, OpenAI, Gemini, Groq, DeepSeek, Together, Ollama, etc.)
 * by communicating with standard OpenAI-compatible `/v1/chat/completions` endpoints.
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const logger = require('../logger');
const { GoogleGenAI, Modality } = require('@google/genai');

// Initialize Gemini SDK with process.env.GEMINI_API_KEY
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Secure AES-256-GCM encryption helpers for API keys stored in DB
const crypto = require('crypto');
// Use an explicit env var for the encryption key if provided, otherwise fall back to JWT_SECRET for compatibility.
// In production, set AI_ENCRYPTION_KEY (a strong secret) to avoid relying on JWT_SECRET.
const KEY_SOURCE = process.env.AI_ENCRYPTION_KEY || process.env.JWT_SECRET || 'dev-fallback-ai-encryption-key';
const MASTER_KEY = crypto.createHash('sha256').update(String(KEY_SOURCE)).digest(); // 32 bytes

function encryptKey(key) {
  if (!key) return '';
  try {
    const iv = crypto.randomBytes(12); // 96-bit nonce for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(Buffer.from(key, 'utf-8')), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Store as: ENC:<ivHex>:<tagHex>:<cipherHex>
    return `ENC:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (err) {
    logger.error({ err }, 'encryptKey failed');
    return '';
  }
}

function decryptKey(encKey) {
  if (!encKey) return '';
  if (!encKey.startsWith('ENC:')) return encKey; // legacy plain text
  try {
    const parts = encKey.split(':');
    if (parts.length !== 4) return '';
    const iv = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    const cipherText = Buffer.from(parts[3], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
    return decrypted.toString('utf-8');
  } catch (err) {
    logger.error({ err }, 'decryptKey failed');
    return '';
  }
}

function maskKey(key) {
  if (!key) return '';
  if (key.length <= 8) return '********';
  return key.slice(0, 4) + '...' + key.slice(-4);
}

/** Helper: Fetch active AI configuration from DB (user-scoped with fallback) */
async function getActiveAIConfig(userId = null) {
  const db = await getDb();
  let row = null;
  if (userId) {
    row = await db.prepare('SELECT * FROM ai_config WHERE is_active = 1 AND user_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1').get(userId);
    if (!row) {
      row = await db.prepare('SELECT * FROM ai_config WHERE user_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1').get(userId);
    }
  }
  if (!row) {
    row = await db.prepare('SELECT * FROM ai_config WHERE is_active = 1 AND user_id IS NULL ORDER BY updated_at DESC, id DESC LIMIT 1').get();
  }
  if (!row) {
    row = await db.prepare('SELECT * FROM ai_config WHERE user_id IS NULL ORDER BY updated_at DESC, id DESC LIMIT 1').get();
  }
  if (!row) {
    return null;
  }
  const decrypted = decryptKey(row.api_key_encrypted);
  return {
    id: row.id,
    provider: row.provider,
    apiKey: decrypted,
    baseUrl: (row.base_url || '').replace(/\/+$/, ''), // strip trailing slash
    model: row.model,
    isActive: row.is_active === 1,
  };
}

/** Helper: Call the configured AI completions endpoint or fallback to Gemini */
async function callAI(messages, systemOverride = null, userId = null) {
  const config = await getActiveAIConfig(userId);

  // Fetch AI Rules & Knowledge Base context to append to system instructions
  const db = await getDb();
  let rulesRows = [];
  if (userId) {
    rulesRows = await db.prepare('SELECT rule_type, content FROM ai_rules WHERE user_id = ?').all(userId);
  }
  if (!rulesRows || rulesRows.length === 0) {
    rulesRows = await db.prepare('SELECT rule_type, content FROM ai_rules WHERE user_id IS NULL').all();
  }

  let rulesContext = '';
  if (rulesRows && rulesRows.length > 0) {
    rulesContext = '\n\n=== BRAND KNOWLEDGE BASE & OUTREACH RULES ===\n' +
      rulesRows.map(r => `[${r.rule_type.toUpperCase()}]: ${r.content}`).join('\n');
  }

  const defaultSystem = 'You are Peak Xender AI, an elite cold email outreach assistant and high-converting copywriter.' + rulesContext;
  const systemPrompt = systemOverride ? systemOverride + rulesContext : defaultSystem;

  // Try custom configured endpoint if available
  if (config && config.apiKey) {
    let baseUrl = (config.baseUrl || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
    if (!baseUrl.endsWith('/v1') && !baseUrl.includes('/v1/') && !baseUrl.endsWith('/chat/completions')) {
      baseUrl = `${baseUrl}/v1`;
    }
    const endpointUrl = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
    const fullMessages = [{ role: 'system', content: systemPrompt }, ...messages];

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      ...(config.provider === 'openrouter' ? { 'HTTP-Referer': 'https://send.peakconix.site', 'X-Title': 'Peak Xender' } : {})
    };

    try {
      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model || 'openai/gpt-4o-mini',
          messages: fullMessages,
          temperature: 0.7,
          max_tokens: 1500,
        })
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content.trim();
      }
    } catch (err) {
      logger.warn({ err: err.message }, 'Custom AI call failed, trying Gemini fallback');
    }
  }

  // Fallback to Gemini via process.env.GEMINI_API_KEY
  if (genAI) {
    const userPrompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
      }
    });
    if (response.text) return response.text.trim();
  }

  const hasMissingGemini = !process.env.GEMINI_API_KEY;
  const hasCustomConfig = config && config.apiKey;
  
  if (hasMissingGemini && !hasCustomConfig) {
    throw new Error('❌ AI Provider is not configured. Please:' +
      '\n1. Get an API Key (OpenAI, Gemini, OpenRouter, Groq, DeepSeek, or Nvidia NIM)' +
      '\n2. Configure and save your API Key under AI Settings' +
      '\n\nWithout an AI provider, content generation features will not work.');
  }

  throw new Error('AI Provider is not configured yet. Please configure your API key in AI Settings or system environment.');
}

// ---------------------------------------------------------------------------
// Configuration Routes
// ---------------------------------------------------------------------------

/** GET /api/ai/configs — Retrieve all configured AI providers for current user */
router.get('/configs', async (req, res) => {
  try {
    const db = await getDb();
    const uid = req.userId;
    const rows = await db.prepare('SELECT * FROM ai_config WHERE user_id = ? OR user_id IS NULL ORDER BY is_active DESC, updated_at DESC, id DESC').all(uid);
    const configs = (rows || []).map(row => {
      const decrypted = decryptKey(row.api_key_encrypted);
      return {
        id: row.id,
        provider: row.provider,
        baseUrl: row.base_url,
        model: row.model,
        isActive: row.is_active === 1,
        hasKey: Boolean(decrypted),
        maskedApiKey: maskKey(decrypted),
        apiKey: decrypted, // plaintext key so user can view/copy under the model
        updatedAt: row.updated_at
      };
    });

    const activeConfig = configs.find(c => c.isActive) || configs[0] || null;

    res.json({
      success: true,
      configs,
      activeProvider: activeConfig ? activeConfig.provider : null,
      activeConfig
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/ai/config — Retrieve current active AI config for user */
router.get('/config', async (req, res) => {
  try {
    const config = await getActiveAIConfig(req.userId);
    if (!config) {
      return res.json({ configured: false });
    }
    res.json({
      configured: true,
      provider: config.provider,
      baseUrl: config.baseUrl,
      model: config.model,
      maskedApiKey: maskKey(config.apiKey),
      apiKey: config.apiKey,
      isActive: config.isActive
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/ai/config — Save/update AI provider config for current user */
router.post('/config', async (req, res) => {
  const { provider, apiKey, baseUrl, model, setActive = true } = req.body;
  const provKey = (provider || 'custom').trim().toLowerCase();
  const uid = req.userId;

  try {
    const db = await getDb();
    const cleanBaseUrl = (baseUrl || '').trim().replace(/\/+$/, '') || 'https://openrouter.ai/api/v1';
    const cleanModel = (model || '').trim() || 'openai/gpt-4o-mini';

    const existing = await db.prepare('SELECT * FROM ai_config WHERE provider = ? AND user_id = ?').get(provKey, uid);

    let encKey = '';
    if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
      encKey = encryptKey(apiKey.trim());
    } else if (existing && existing.api_key_encrypted) {
      encKey = existing.api_key_encrypted;
    } else {
      return res.status(400).json({ error: `API Key is required for provider ${provKey}.` });
    }

    if (setActive) {
      // Set all other providers for this user to inactive
      await db.prepare('UPDATE ai_config SET is_active = 0 WHERE user_id = ?').run(uid);
    }

    const isActiveVal = setActive ? 1 : (existing ? (existing.is_active || 0) : 0);

    if (existing) {
      await db.prepare('UPDATE ai_config SET api_key_encrypted = ?, base_url = ?, model = ?, is_active = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
        .run(encKey, cleanBaseUrl, cleanModel, isActiveVal, existing.id, uid);
    } else {
      await db.prepare('INSERT INTO ai_config (provider, api_key_encrypted, base_url, model, is_active, user_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(provKey, encKey, cleanBaseUrl, cleanModel, isActiveVal, uid);
    }

    logger.info({ provider: provKey, model: cleanModel, setActive, userId: uid }, 'AI configuration saved successfully');
    res.json({ 
      success: true, 
      message: `${provKey.toUpperCase()} configuration saved successfully.`,
      provider: provKey,
      model: cleanModel,
      isActive: Boolean(isActiveVal)
    });
  } catch (err) {
    logger.error({ err }, 'Failed to save AI config');
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/ai/active — Switch active AI provider for current user */
router.post('/active', async (req, res) => {
  const { provider } = req.body;
  if (!provider) return res.status(400).json({ error: 'Provider is required.' });
  const provKey = String(provider).trim().toLowerCase();
  const uid = req.userId;

  try {
    const db = await getDb();
    const target = await db.prepare('SELECT * FROM ai_config WHERE provider = ? AND user_id = ?').get(provKey, uid);
    if (!target) {
      return res.status(404).json({ error: `No configuration found for provider "${provKey}". Please save an API key first.` });
    }

    await db.prepare('UPDATE ai_config SET is_active = 0 WHERE user_id = ?').run(uid);
    await db.prepare('UPDATE ai_config SET is_active = 1, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?').run(target.id, uid);

    res.json({ success: true, message: `Activated ${provKey.toUpperCase()} as active AI provider.`, provider: provKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/ai/config/:provider — Delete/clear configuration for a provider for current user */
router.delete('/config/:provider', async (req, res) => {
  const provKey = String(req.params.provider).trim().toLowerCase();
  const uid = req.userId;
  try {
    const db = await getDb();
    await db.prepare('DELETE FROM ai_config WHERE provider = ? AND user_id = ?').run(provKey, uid);
    res.json({ success: true, message: `Configuration for ${provKey} removed.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/ai/test — Test a specific AI connection or the active connection */
router.post('/test', async (req, res) => {
  const { provider, apiKey, baseUrl, model } = req.body || {};
  try {
    // If specific parameters provided, test with them directly
    if (apiKey && apiKey.trim().length > 0) {
      const cleanBaseUrl = (baseUrl || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
      let endpointUrl = cleanBaseUrl;
      if (!endpointUrl.endsWith('/v1') && !endpointUrl.includes('/v1/') && !endpointUrl.endsWith('/chat/completions')) {
        endpointUrl = `${endpointUrl}/v1`;
      }
      if (!endpointUrl.endsWith('/chat/completions')) {
        endpointUrl = `${endpointUrl}/chat/completions`;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
        ...(provider === 'openrouter' ? { 'HTTP-Referer': 'https://send.peakconix.site', 'X-Title': 'Peak Xender' } : {})
      };

      const resp = await fetch(endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model || 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: 'Say "Peak Xender AI connection test successful!"' }],
          temperature: 0.7,
          max_tokens: 50
        })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Provider returned error ${resp.status}: ${errText.slice(0, 300)}`);
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || 'Connection verified!';
      return res.json({ success: true, response: content.trim() });
    }

    // Otherwise test using provider from DB or default active AI
    if (provider) {
      const db = await getDb();
      const row = await db.prepare('SELECT * FROM ai_config WHERE provider = ? AND user_id = ?').get(provider.toLowerCase(), req.userId) || await db.prepare('SELECT * FROM ai_config WHERE provider = ? AND user_id IS NULL').get(provider.toLowerCase());
      if (row && row.api_key_encrypted) {
        const decryptedKey = decryptKey(row.api_key_encrypted);
        const cleanBaseUrl = (row.base_url || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
        let endpointUrl = cleanBaseUrl;
        if (!endpointUrl.endsWith('/v1') && !endpointUrl.includes('/v1/') && !endpointUrl.endsWith('/chat/completions')) {
          endpointUrl = `${endpointUrl}/v1`;
        }
        if (!endpointUrl.endsWith('/chat/completions')) {
          endpointUrl = `${endpointUrl}/chat/completions`;
        }

        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${decryptedKey}`,
          ...(row.provider === 'openrouter' ? { 'HTTP-Referer': 'https://send.peakconix.site', 'X-Title': 'Peak Xender' } : {})
        };

        const resp = await fetch(endpointUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: row.model || 'openai/gpt-4o-mini',
            messages: [{ role: 'user', content: 'Say "Peak Xender AI connection test successful!"' }],
            temperature: 0.7,
            max_tokens: 50
          })
        });

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`Provider returned error ${resp.status}: ${errText.slice(0, 300)}`);
        }

        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content || 'Connection verified!';
        return res.json({ success: true, response: content.trim() });
      }
    }

    const response = await callAI([
      { role: 'user', content: 'Say "Peak Xender AI connection test successful!"' }
    ], null, req.userId);
    res.json({ success: true, response });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/** POST /api/ai/validate-all — Health check and validate all saved AI API keys against their endpoints */
router.post('/validate-all', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.prepare('SELECT * FROM ai_config WHERE user_id = ? OR user_id IS NULL').all(req.userId);
    const results = {};

    for (const row of rows || []) {
      const prov = row.provider;
      const decryptedKey = decryptKey(row.api_key_encrypted);
      if (!decryptedKey) {
        results[prov] = { valid: false, status: 'no_key', error: 'No API key stored' };
        continue;
      }

      const cleanBaseUrl = (row.base_url || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
      let endpointUrl = cleanBaseUrl;
      if (!endpointUrl.endsWith('/v1') && !endpointUrl.includes('/v1/') && !endpointUrl.endsWith('/chat/completions')) {
        endpointUrl = `${endpointUrl}/v1`;
      }
      if (!endpointUrl.endsWith('/chat/completions')) {
        endpointUrl = `${endpointUrl}/chat/completions`;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${decryptedKey}`,
        ...(prov === 'openrouter' ? { 'HTTP-Referer': 'https://send.peakconix.site', 'X-Title': 'Peak Xender' } : {})
      };

      const startTime = Date.now();
      try {
        const resp = await fetch(endpointUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: row.model || 'openai/gpt-4o-mini',
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 5,
          }),
          signal: AbortSignal.timeout(8000), // 8s timeout
        });

        const latencyMs = Date.now() - startTime;
        if (resp.ok) {
          results[prov] = {
            valid: true,
            status: 'valid',
            latencyMs,
            model: row.model,
            message: 'API Key verified & operational'
          };
        } else {
          const errText = await resp.text();
          let parsedError = `HTTP ${resp.status}`;
          try {
            const errJson = JSON.parse(errText);
            parsedError = errJson.error?.message || errJson.message || parsedError;
          } catch (_) {
            if (errText) parsedError = `${parsedError}: ${errText.slice(0, 150)}`;
          }
          results[prov] = {
            valid: false,
            status: 'invalid',
            latencyMs,
            model: row.model,
            error: parsedError
          };
        }
      } catch (fErr) {
        results[prov] = {
          valid: false,
          status: 'error',
          model: row.model,
          error: fErr.message || 'Connection timeout/failure'
        };
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// AI Stage Rules & Knowledge Base Routes
// ---------------------------------------------------------------------------

/** GET /api/ai/rules — Get all AI stage rules for current user */
router.get('/rules', async (req, res) => {
  try {
    const db = await getDb();
    const uid = req.userId;
    let rules = await db.prepare('SELECT rule_type, content FROM ai_rules WHERE user_id = ?').all(uid);
    if (!rules || rules.length === 0) {
      rules = await db.prepare('SELECT rule_type, content FROM ai_rules WHERE user_id IS NULL').all();
    }
    const rulesMap = {};
    (rules || []).forEach(r => { rulesMap[r.rule_type] = r.content; });
    res.json(rulesMap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/ai/rules — Save or update AI stage rules for current user */
router.post('/rules', async (req, res) => {
  const { rules } = req.body;
  const uid = req.userId;
  if (!rules || typeof rules !== 'object') {
    return res.status(400).json({ error: 'Rules object is required.' });
  }

  try {
    const db = await getDb();
    for (const [ruleType, content] of Object.entries(rules)) {
      const existing = await db.prepare('SELECT id FROM ai_rules WHERE rule_type = ? AND user_id = ?').get(ruleType, uid);
      if (existing) {
        await db.prepare('UPDATE ai_rules SET content = ?, updated_at = datetime(\'now\') WHERE rule_type = ? AND user_id = ?')
          .run(String(content || ''), ruleType, uid);
      } else {
        await db.prepare('INSERT INTO ai_rules (rule_type, content, user_id) VALUES (?, ?, ?)')
          .run(ruleType, String(content || ''), uid);
      }
    }
    res.json({ success: true, message: 'AI Rules updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// AI Features (Generator, Rewriter, Spintax, Subjects, Reply Draft)
// ---------------------------------------------------------------------------

/** POST /api/ai/generate — Generate email content from a prompt */
router.post('/generate', async (req, res) => {
  const { prompt, stage = 'initial', contactFields = {} } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

  try {
    const contextStr = Object.keys(contactFields).length > 0 
      ? `\nProspect Variables available: ${Object.keys(contactFields).map(k => `{${k}}`).join(', ')}` 
      : '';

    const text = await callAI([
      { 
        role: 'user', 
        content: `Write a high-converting cold email for stage "${stage}".\nPrompt/Goal: ${prompt}${contextStr}\nFormat the output as JSON with keys "subject" and "body_html". Do not include markdown code block backticks.` 
      }
    ], null, req.userId);

    let result = { subject: 'Outreach Request', body_html: text };
    try {
      const cleanJsonStr = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      result = JSON.parse(cleanJsonStr);
    } catch (_) {}

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/ai/rewrite — Rewrite or improve existing email copy */
router.post('/rewrite', async (req, res) => {
  const { subject, body, instruction = 'Improve readability, deliverability, and urgency' } = req.body;
  if (!body) return res.status(400).json({ error: 'Email body is required.' });

  try {
    const text = await callAI([
      {
        role: 'user',
        content: `Rewrite and polish this cold email copy to maximize response rates.\nInstruction: ${instruction}\nOriginal Subject: ${subject || ''}\nOriginal Body:\n${body}\n\nReturn JSON with keys "subject" and "body_html". Do not use code block formatting.`
      }
    ], null, req.userId);

    let result = { subject: subject || 'Polished Outreach', body_html: text };
    try {
      const cleanJsonStr = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      result = JSON.parse(cleanJsonStr);
    } catch (_) {}

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/ai/spintax — Convert flat text to spintax format {hi|hello|hey} */
router.post('/spintax', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required.' });

  try {
    const spintaxText = await callAI([
      {
        role: 'user',
        content: `Convert the following email copy into high-deliverability Spintax format using {option1|option2|option3} syntax for key greetings, phrases, and verbs. Preserve any variable tags like {store_name} or {first_name}.\n\nOriginal Text:\n${text}`
      }
    ], null, req.userId);
    res.json({ success: true, spintax: spintaxText });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/ai/subjects — Generate subject line variants for A/B testing */
router.post('/subjects', async (req, res) => {
  const { body, count = 5 } = req.body;
  if (!body) return res.status(400).json({ error: 'Email body context is required.' });

  try {
    const text = await callAI([
      {
        role: 'user',
        content: `Generate ${count} punchy, high-open-rate cold email subject lines based on this email body:\n${body}\n\nReturn JSON as an array of strings under key "subjects".`
      }
    ], null, req.userId);

    let subjects = [];
    try {
      const cleanJsonStr = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJsonStr);
      subjects = parsed.subjects || parsed;
    } catch (_) {
      subjects = text.split('\n').filter(Boolean).map(s => s.replace(/^\d+\.\s*/, '').trim());
    }

    res.json({ success: true, subjects });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/ai/reply-draft — Generate AI response to an incoming prospect reply */
router.post('/reply-draft', async (req, res) => {
  const { incomingSubject, incomingBody, senderEmail, contactFields = {} } = req.body;
  if (!incomingBody) return res.status(400).json({ error: 'Incoming email body is required.' });

  try {
    const dossierStr = Object.entries(contactFields).map(([k, v]) => `${k}: ${v}`).join(', ');

    const draft = await callAI([
      {
        role: 'user',
        content: `A prospect (${senderEmail}) replied to your email campaign.\nProspect Details: ${dossierStr}\nSubject: ${incomingSubject || ''}\nMessage Body:\n${incomingBody}\n\nWrite a friendly, professional, and conversion-focused reply addressing their message according to our AI Stage Rules.`
      }
    ], null, req.userId);

    res.json({ success: true, replyDraft: draft });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/ai/chat — Multi-turn Gemini chatbot with deep app integration via Function Calling */
router.post('/chat', async (req, res) => {
  const { messages, systemInstruction, currentPage } = req.body;
  const uid = req.userId;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required.' });
  }

  try {
    const sysPrompt = (systemInstruction || 
      'You are Peak Xender AI Operating System Advisor, an autonomous AI assistant deeply integrated into Peak Xender cold email platform. You can inspect campaigns, launch/pause outreach, list prospect lists, analyze inbox replies & hot leads, check deliverability sending accounts, create templates, and navigate users across the interface. Be proactive, crisp, professional, and actionable.') +
      (currentPage ? `\n[User is currently viewing page: ${currentPage}]` : '');

    if (genAI) {
      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      // Define App-wide Gemini Function Declarations
      const appTools = [{
        functionDeclarations: [
          {
            name: 'get_app_overview',
            description: 'Fetch real-time stats of active campaigns, unread inbox messages, hot leads, prospect lists, and sending accounts.',
            parameters: { type: 'OBJECT', properties: {} }
          },
          {
            name: 'list_campaigns',
            description: 'List all campaigns in Peak Xender with status, recipient count, and performance metrics.',
            parameters: {
              type: 'OBJECT',
              properties: {
                status: { type: 'STRING', description: 'Filter status: draft, sending, paused, completed, or all' }
              }
            }
          },
          {
            name: 'create_campaign',
            description: 'Create a new email outreach campaign.',
            parameters: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING', description: 'Campaign title/name' },
                subject: { type: 'STRING', description: 'Subject line' },
                body_html: { type: 'STRING', description: 'HTML message body' },
                contact_list: { type: 'STRING', description: 'Assigned prospect list name' }
              },
              required: ['name', 'subject', 'body_html']
            }
          },
          {
            name: 'control_campaign',
            description: 'Start, pause, or resume an existing campaign by ID.',
            parameters: {
              type: 'OBJECT',
              properties: {
                campaign_id: { type: 'NUMBER', description: 'Campaign ID' },
                action: { type: 'STRING', description: 'Action: start, pause, resume' }
              },
              required: ['campaign_id', 'action']
            }
          },
          {
            name: 'list_prospect_lists',
            description: 'Get all prospect contact lists and recipient counts.',
            parameters: { type: 'OBJECT', properties: {} }
          },
          {
            name: 'search_inbox_messages',
            description: 'Search or view recent inbox replies and sentiment badges (hot_lead, question, etc.).',
            parameters: {
              type: 'OBJECT',
              properties: {
                sentiment: { type: 'STRING', description: 'Filter: hot_lead, question, neutral, unsubscribe, or all' }
              }
            }
          },
          {
            name: 'get_sending_accounts',
            description: 'Get list of configured sending accounts, daily limits, and deliverability status.',
            parameters: { type: 'OBJECT', properties: {} }
          },
          {
            name: 'create_template',
            description: 'Save a reusable email template.',
            parameters: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING', description: 'Template name' },
                subject: { type: 'STRING', description: 'Email subject' },
                body_html: { type: 'STRING', description: 'HTML body' }
              },
              required: ['name', 'subject', 'body_html']
            }
          },
          {
            name: 'navigate_to_page',
            description: 'Direct or navigate the user interface to a specific app screen.',
            parameters: {
              type: 'OBJECT',
              properties: {
                page: { type: 'STRING', description: 'Destination route: /campaigns, /contacts, /inbox, /accounts, /templates, /ai-settings, /tracker' },
                reason: { type: 'STRING', description: 'Reason for navigation' }
              },
              required: ['page']
            }
          }
        ]
      }];

      // Function execution dispatcher (strictly scoped to req.userId)
      const executeToolCall = async (call) => {
        const db = await getDb();
        const args = call.args || {};

        if (call.name === 'get_app_overview') {
          const totalCampaignsRow = await db.prepare('SELECT COUNT(*) as cnt FROM campaigns WHERE user_id = ?').get(uid);
          const activeCampaignsRow = await db.prepare("SELECT COUNT(*) as cnt FROM campaigns WHERE status='sending' AND user_id = ?").get(uid);
          const unreadInboxRow = await db.prepare('SELECT COUNT(*) as cnt FROM inbox_messages WHERE is_read=0 AND user_id = ?').get(uid);
          const hotLeadsRow = await db.prepare("SELECT COUNT(*) as cnt FROM inbox_messages WHERE sentiment='hot_lead' AND user_id = ?").get(uid);
          const accountsCountRow = await db.prepare('SELECT COUNT(*) as cnt FROM accounts WHERE user_id = ?').get(uid);
          const lists = await db.prepare('SELECT list_name, COUNT(*) as count FROM contacts WHERE user_id = ? GROUP BY list_name').all(uid);
          return {
            totalCampaigns: totalCampaignsRow?.cnt || 0,
            activeCampaigns: activeCampaignsRow?.cnt || 0,
            unreadInbox: unreadInboxRow?.cnt || 0,
            hotLeads: hotLeadsRow?.cnt || 0,
            accountsCount: accountsCountRow?.cnt || 0,
            lists: lists || []
          };
        }

        if (call.name === 'list_campaigns') {
          const query = args.status && args.status !== 'all' ? 'SELECT * FROM campaigns WHERE status = ? AND user_id = ?' : 'SELECT * FROM campaigns WHERE user_id = ?';
          const params = args.status && args.status !== 'all' ? [args.status, uid] : [uid];
          const campaigns = await db.prepare(query).all(...params);
          return { campaigns: campaigns || [] };
        }

        if (call.name === 'create_campaign') {
          let totalContacts = 0;
          if (args.contact_list) {
            const cntRow = await db.prepare('SELECT COUNT(*) as cnt FROM contacts WHERE list_name = ? AND user_id = ?').get(args.contact_list, uid);
            totalContacts = cntRow?.cnt || 0;
          }
          const plainText = (args.body_html || '').replace(/<[^>]+>/g, '');
          const result = await db.prepare('INSERT INTO campaigns (name, subject, body_html, body_plain, contact_list, total_contacts, status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .run(args.name, args.subject, args.body_html, plainText, args.contact_list || null, totalContacts, 'draft', uid);
          const id = result.lastInsertRowid || result.id || 0;
          return { success: true, campaign_id: id, name: args.name, status: 'draft', total_contacts: totalContacts, navigate: '/campaigns' };
        }

        if (call.name === 'control_campaign') {
          let newStatus = 'draft';
          if (args.action === 'start' || args.action === 'resume') newStatus = 'sending';
          if (args.action === 'pause') newStatus = 'paused';
          await db.prepare('UPDATE campaigns SET status = ? WHERE id = ? AND user_id = ?').run(newStatus, args.campaign_id, uid);
          return { success: true, campaign_id: args.campaign_id, status: newStatus };
        }

        if (call.name === 'list_prospect_lists') {
          const lists = await db.prepare('SELECT list_name, COUNT(*) as count FROM contacts WHERE user_id = ? GROUP BY list_name').all(uid);
          return { lists: lists || [] };
        }

        if (call.name === 'search_inbox_messages') {
          let query = 'SELECT * FROM inbox_messages WHERE user_id = ? ORDER BY id DESC LIMIT 10';
          let params = [uid];
          if (args.sentiment && args.sentiment !== 'all') {
            query = 'SELECT * FROM inbox_messages WHERE sentiment = ? AND user_id = ? ORDER BY id DESC LIMIT 10';
            params = [args.sentiment, uid];
          }
          const messages = await db.prepare(query).all(...params);
          return { messages: messages || [] };
        }

        if (call.name === 'get_sending_accounts') {
          const accounts = await db.prepare('SELECT id, email, status, daily_limit, daily_sent, display_name FROM accounts WHERE user_id = ?').all(uid);
          return { accounts: accounts || [] };
        }

        if (call.name === 'create_template') {
          const result = await db.prepare('INSERT INTO templates (name, subject, body_html, user_id) VALUES (?, ?, ?, ?)')
            .run(args.name, args.subject, args.body_html, uid);
          const id = result.lastInsertRowid || result.id || 0;
          return { success: true, template_id: id, name: args.name, navigate: '/templates' };
        }

        if (call.name === 'navigate_to_page') {
          return { success: true, action: 'navigate', page: args.page, reason: args.reason };
        }

        return { error: 'Unknown function' };
      };

      // Turn 1
      let response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction: sysPrompt,
          temperature: 0.7,
          tools: appTools,
        }
      });

      let clientAction = null;

      // Handle function execution turns (up to 3 turns)
      for (let turn = 0; turn < 3; turn++) {
        const functionCalls = response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall).map(p => p.functionCall);
        if (!functionCalls || functionCalls.length === 0) break;

        // Add candidate output
        contents.push(response.candidates[0].content);

        // Execute function calls
        const functionResponses = [];
        for (const call of functionCalls) {
          const result = await executeToolCall(call);
          if (result && result.navigate) clientAction = { action: 'navigate', page: result.navigate };
          if (result && result.action === 'navigate') clientAction = { action: 'navigate', page: result.page };

          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: result,
            }
          });
        }

        contents.push({
          role: 'user',
          parts: functionResponses,
        });

        // Get final answer
        response = await genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
          config: {
            systemInstruction: sysPrompt,
            temperature: 0.7,
            tools: appTools,
          }
        });
      }

      const reply = response.text ? response.text.trim() : 'I have performed your request across the application.';
      return res.json({ success: true, reply, clientAction });
    } else {
      // Fallback via callAI
      const reply = await callAI(messages, sysPrompt, uid);
      return res.json({ success: true, reply });
    }
  } catch (err) {
    logger.error({ err }, 'AI Chat endpoint failed');
    try {
      const fallbackReply = await callAI(messages, systemInstruction || 'You are Peak Xender AI Advisor. Be helpful and concise.', uid);
      return res.json({ success: true, reply: fallbackReply });
    } catch (fErr) {
      res.status(500).json({ error: 'AI Service is temporarily busy. Please try again in a moment.' });
    }
  }
});

/** POST /api/ai/search-grounding — Grounded real-time Google search for company/lead research */
router.post('/search-grounding', async (req, res) => {
  const { query, topic = 'Lead & Company Outreach Research' } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Search query is required.' });
  }

  try {
    if (!genAI) {
      // Fallback if genAI not initialized
      const fallbackText = await callAI([
        { role: 'user', content: `Research and summarize key insights about: ${query} for ${topic}.` }
      ], null, req.userId);
      return res.json({ success: true, text: fallbackText, sources: [] });
    }

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Perform up-to-date real-time research on: "${query}". Provide a crisp, structured dossier containing company summary, recent developments, target angles for cold email outreach, and personalizing hooks.`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: 'You are a real-time intelligence agent providing grounded facts and insights for cold email personalization.',
      }
    });

    const text = response.text ? response.text.trim() : '';
    
    // Extract grounding URLs and sources
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter(c => c.web)
      .map(c => ({ title: c.web.title, uri: c.web.uri }));

    res.json({ success: true, text, sources });
  } catch (err) {
    logger.error({ err }, 'Search Grounding failed');
    try {
      const fallbackText = await callAI([
        { role: 'user', content: `Research and summarize key insights about: ${query} for ${topic}.` }
      ], null, req.userId);
      return res.json({ success: true, text: fallbackText, sources: [] });
    } catch (fErr) {
      res.status(500).json({ error: 'Search grounding failed.' });
    }
  }
});

/** POST /api/ai/tts — Speech audio generation using Gemini TTS */
router.post('/tts', async (req, res) => {
  const { text, voice = 'Kore' } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text prompt is required.' });
  }

  try {
    if (!genAI) {
      return res.status(400).json({ error: 'Gemini API is required for voice synthesis.' });
    }

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('No audio output returned from Gemini TTS.');
    }

    res.json({ success: true, audioBase64: base64Audio });
  } catch (err) {
    logger.error({ err }, 'TTS generation failed');
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


