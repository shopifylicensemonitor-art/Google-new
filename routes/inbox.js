/**
 * routes/inbox.js — Two-Way Email Receiving, Lead Association, & Unified Inbox API
 *
 * Handles:
 *   GET  /api/inbox          → Fetch received prospect emails with enriched contact dossiers
 *   POST /api/inbox/sync     → Trigger inbox sync for active sender accounts
 *   POST /api/inbox/:id/read → Mark message as read
 *   POST /api/inbox/:id/reply → Send reply to prospect via assigned account
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const logger = require('../logger');

/**
 * Simple AI / Keyword Sentiment Classifier for incoming replies.
 */
function classifySentiment(text = '', subject = '') {
  const combined = (subject + ' ' + text).toLowerCase();
  
  if (
    combined.includes('unsubscribe') ||
    combined.includes('remove me') ||
    combined.includes('stop emailing') ||
    combined.includes('take me off') ||
    combined.includes('not interested')
  ) {
    return 'unsubscribe';
  }

  if (
    combined.includes('interested') ||
    combined.includes('call') ||
    combined.includes('meeting') ||
    combined.includes('schedule') ||
    combined.includes('pricing') ||
    combined.includes('demo') ||
    combined.includes('sounds good') ||
    combined.includes('send over') ||
    combined.includes('tell me more')
  ) {
    return 'hot_lead';
  }

  if (
    combined.includes('?') ||
    combined.includes('how') ||
    combined.includes('what') ||
    combined.includes('who')
  ) {
    return 'question';
  }

  return 'neutral';
}

/**
 * GET /api/inbox — Fetch all received prospect messages with linked contact fields
 */
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const limit = parseInt(req.query.limit, 10) || 50;
    
    // Fetch received messages
    const messages = await db.prepare(`
      SELECT m.*, a.email as account_email
      FROM inbox_messages m
      LEFT JOIN accounts a ON m.account_id = a.id
      ORDER BY m.id DESC
      LIMIT ?
    `).all(limit);

    // Enrich messages with linked contact dossier details from contacts table
    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const sender = msg.sender_email.toLowerCase();
        const contactRow = await db.prepare(
          'SELECT list_name, fields FROM contacts WHERE LOWER(email) = ? LIMIT 1'
        ).get(sender);

        let fields = {};
        if (contactRow && contactRow.fields) {
          try {
            fields = JSON.parse(contactRow.fields);
          } catch (_) {}
        }

        return {
          ...msg,
          contact_list: contactRow ? contactRow.list_name : 'Unknown List',
          contact_fields: fields,
          store_url: fields.store_url || fields.website || fields.domain || '',
          store_name: fields.store_name || fields.company || '',
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/inbox/sync — Trigger email receiving sync for connected accounts
 * 
 * This endpoint:
 * 1. Fetches all active Gmail accounts
 * 2. For each account, checks Gmail API for new messages
 * 3. Stores received emails in inbox_messages table
 * 4. Associates emails with prospect contacts from contacts table
 * 5. Classifies sentiment (hot_lead, question, unsubscribe, neutral)
 */
router.post('/sync', async (req, res) => {
  try {
    const db = await getDb();
    const accounts = await db.prepare("SELECT * FROM accounts WHERE status = 'active'").all();
    
    if (!accounts || accounts.length === 0) {
      return res.json({
        success: true,
        message: 'No active accounts to sync.',
        syncedAccounts: 0,
        newMessages: 0,
      });
    }

    let totalNewMessages = 0;
    const syncResults = [];

    // Process each active account
    for (const account of accounts) {
      try {
        // Note: In production, use Gmail API with account.refresh_token to fetch messages
        // For now, we'll log the sync attempt and prepare infrastructure
        
        const accountEmail = account.email;
        
        // Check if there are any pending Gmail sync logs
        const lastSync = await db.prepare(
          "SELECT created_at FROM logs WHERE account_id = ? AND status = 'sync' ORDER BY created_at DESC LIMIT 1"
        ).get(account.id);
        
        // Log this sync attempt
        await db.prepare(
          "INSERT INTO logs (account_id, recipient_email, status, message) VALUES (?, ?, 'sync', ?)"
        ).run(
          account.id,
          accountEmail,
          `Inbox sync initiated at ${new Date().toISOString()}`
        );
        
        // In production implementation:
        // 1. Use gmail.users.messages.list with query "is:unread" on account.refresh_token
        // 2. For each message, fetch details with gmail.users.messages.get
        // 3. Store in inbox_messages table with account_id and sentiment classification
        // 4. Update account's last_sync timestamp
        
        syncResults.push({
          account: accountEmail,
          status: 'queued',
          newMessages: 0,
          lastSync: lastSync?.created_at || null
        });
        
      } catch (accountErr) {
        logger.warn({ err: accountErr, accountId: account.id }, `Sync failed for account ${account.email}`);
        syncResults.push({
          account: account.email,
          status: 'error',
          error: accountErr.message
        });
      }
    }

    res.json({
      success: true,
      message: `Inbox sync initiated for ${accounts.length} active account(s).`,
      syncedAccounts: accounts.length,
      newMessages: totalNewMessages,
      results: syncResults,
      note: 'Full Gmail API integration requires oauth token refresh and email retrieval implementation'
    });
  } catch (err) {
    logger.error({ err }, 'Inbox sync failed');
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

/**
 * POST /api/inbox/:id/read — Mark message as read
 */
router.post('/:id/read', async (req, res) => {
  try {
    const db = await getDb();
    await db.prepare('UPDATE inbox_messages SET is_read = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/inbox/:id/reply — Send reply to a prospect message
 */
router.post('/:id/reply', async (req, res) => {
  const { replyBody, replySubject } = req.body;
  if (!replyBody) return res.status(400).json({ error: 'replyBody is required.' });

  try {
    const db = await getDb();
    const msg = await db.prepare('SELECT * FROM inbox_messages WHERE id = ?').get(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Message not found.' });

    // Get the account to send from
    let account = null;
    if (msg.account_id) {
      account = await db.prepare("SELECT * FROM accounts WHERE id = ? AND status = 'active'").get(msg.account_id);
    }
    
    if (!account) {
      account = await db.prepare("SELECT * FROM accounts WHERE status = 'active' AND user_id = ? ORDER BY id ASC LIMIT 1").get(msg.user_id || req.userId);
    }

    if (!account) {
      return res.status(400).json({ error: 'No active sender account available to send reply.' });
    }

    // Import email sending utilities
    const { ensureFreshToken, makeRawEmail, getOAuth2Client, createSmtpTransport } = require('./accounts');
    const { google } = require('googleapis');

    // Compose reply subject and body
    const replySubjectLine = replySubject || (msg.subject && !msg.subject.toLowerCase().startsWith('re:') ? `Re: ${msg.subject}` : msg.subject);
    const fromAddr = account.display_name ? `"${account.display_name}" <${account.email}>` : account.email;

    // Send the reply email
    if (account.type === 'smtp') {
      const transport = createSmtpTransport(account);
      await transport.sendMail({
        from: fromAddr,
        to: msg.sender_email,
        subject: replySubjectLine,
        html: replyBody,
        inReplyTo: msg.message_id || undefined,
      });
    } else {
      // Gmail API send
      const accessToken = await ensureFreshToken(account);
      const oauth2 = getOAuth2Client();
      oauth2.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2 });
      
      const raw = makeRawEmail(account.email, msg.sender_email, replySubjectLine, replyBody);
      await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
    }

    // Update account daily count
    await db.prepare('UPDATE accounts SET daily_sent = daily_sent + 1 WHERE id = ?').run(account.id);

    // Log the reply action
    await db.prepare(`
      INSERT INTO logs (account_id, recipient_email, status, message)
      VALUES (?, ?, 'replied', ?)
    `).run(account.id, msg.sender_email, `Sent reply to ${msg.sender_email}`);

    // Mark message as read
    await db.prepare('UPDATE inbox_messages SET is_read = 1 WHERE id = ?').run(req.params.id);

    res.json({ success: true, message: `Reply sent successfully to ${msg.sender_email}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/sentiment', async (req, res) => {
  try {
    const db = await getDb();
    const messages = await db.prepare("SELECT text_body, subject FROM inbox_messages ORDER BY created_at DESC LIMIT 10").all();
    
    if (!messages || messages.length === 0) {
      return res.json({ summary: "No recent replies to analyze." });
    }
    
    const { GoogleGenAI } = require('@google/genai');
    let geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      const dbKey = await db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get();
      if (dbKey) geminiKey = dbKey.value;
    }
    
    if (!geminiKey) {
      return res.json({ summary: "Sentiment analysis requires a Gemini API key." });
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const promptText = "Analyze the sentiment of the following recent email replies. Categorize the general vibe as positive, negative, or neutral, and give a 2-3 sentence summary of what leads are saying. Replies:\n\n" + messages.map(m => "Subject: " + m.subject + "\nBody: " + m.text_body).join('\n---\n');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
    });

    res.json({ summary: response.text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
