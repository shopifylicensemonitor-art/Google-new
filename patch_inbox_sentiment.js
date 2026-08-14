const fs = require('fs');
let code = fs.readFileSync('routes/inbox.js', 'utf8');

const sentimentEndpoint = `
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
    const promptText = "Analyze the sentiment of the following recent email replies. Categorize the general vibe as positive, negative, or neutral, and give a 2-3 sentence summary of what leads are saying. Replies:\\n\\n" + messages.map(m => "Subject: " + m.subject + "\\nBody: " + m.text_body).join('\\n---\\n');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
    });

    res.json({ summary: response.text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
`;

code = code.replace("module.exports = router;", sentimentEndpoint + "\nmodule.exports = router;");
fs.writeFileSync('routes/inbox.js', code);
console.log('patched routes/inbox.js');
