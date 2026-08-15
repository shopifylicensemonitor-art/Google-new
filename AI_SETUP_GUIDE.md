# 🤖 Peak Xender AI Setup & Configuration Guide

## Overview

Peak Xender supports multiple AI providers for intelligent email generation, rewriting, and analysis:
- **Gemini** (Google) - Primary fallback via environment variable
- **OpenRouter** - Custom OpenAI-compatible endpoints
- **OpenAI, DeepSeek, Groq, Together, Ollama** - Any OpenAI-compatible provider

---

## ⚡ Quick Start (5 minutes)

### Step 1: Get Gemini API Key
1. Go to **https://ai.google.dev**
2. Click "**Get API Key**" (top right)
3. Select your Google account or create a new one
4. Create a new API key
5. **Copy the key**

### Step 2: Add to `.env`
```bash
GEMINI_API_KEY=your_api_key_here
```

### Step 3: Restart the server
```bash
npm run dev
```

### Step 4: Test AI Connection
- Go to **Settings → AI Settings**
- Click "**Test Connection**" button
- You should see: `✅ "Peak Xender AI connection test successful!"`

---

## 🔧 Configuration Options

### Option A: Environment Variable (Recommended for Development)

**File:** `.env`

```env
# Primary AI provider (uses Google's Gemini 2.5 Flash)
GEMINI_API_KEY=your_gemini_api_key_here

# Encryption key for storing API keys in database
AI_ENCRYPTION_KEY=your_32_byte_hex_key_or_falls_back_to_jwt_secret
```

**Pros:**
- ✅ Simple, no UI required
- ✅ Works immediately on restart
- ✅ Gemini is free tier generous

**Cons:**
- ❌ Hardcoded, not flexible for multiple providers
- ❌ Restart required to change

---

### Option B: UI Configuration (Recommended for Production)

**Access:** Settings → AI Settings

**Supports:**
- OpenRouter
- OpenAI
- DeepSeek
- Groq
- Together
- Ollama
- Any OpenAI-compatible endpoint

**Steps:**
1. Log in to Peak Xender
2. Go to **Settings → AI Settings**
3. Select **Provider** (e.g., "OpenRouter")
4. Enter **API Key** (encrypted in DB)
5. Enter **Base URL** (e.g., `https://openrouter.ai/api/v1`)
6. Enter **Model** (e.g., `openai/gpt-4-turbo`)
7. Click **Save Configuration**
8. Click **Test Connection**

---

## 🌐 Provider Setup Instructions

### Google Gemini (Recommended - Free & Fast)
**Cost:** Free tier: 15 requests/min | Paid: $0.075 per 1M input tokens

1. Visit https://ai.google.dev
2. Click "Get API Key"
3. Create a new API key
4. Add to `.env`: `GEMINI_API_KEY=your_key`
5. Restart server

**Supported Models:**
- `gemini-2.5-flash` (Default, fastest)
- `gemini-1.5-pro`
- `gemini-1.5-flash`

---

### OpenRouter (Multi-Provider)
**Cost:** Pay-per-use (varies by model, typically $0.01-$0.10 per 1M tokens)

1. Visit https://openrouter.ai
2. Create account
3. Go to Settings → API Keys
4. Create new key
5. In Peak Xender:
   - Provider: `openrouter`
   - API Key: Your OpenRouter key
   - Base URL: `https://openrouter.ai/api/v1`
   - Model: `openai/gpt-4-turbo` (or your choice)

**Popular Models:**
- `openai/gpt-4-turbo` - Best quality
- `openai/gpt-4o-mini` - Fast & cheap
- `anthropic/claude-3-sonnet` - Strong reasoning
- `deepseek/deepseek-chat` - Cost-effective

---

### OpenAI (Direct API)
**Cost:** $0.15 per 1M input tokens (GPT-4o)

1. Visit https://platform.openai.com/account/api-keys
2. Create new API key
3. In Peak Xender:
   - Provider: `openai`
   - API Key: Your OpenAI key
   - Base URL: `https://api.openai.com/v1`
   - Model: `gpt-4o` or `gpt-4-turbo`

---

### DeepSeek (Cost-Effective)
**Cost:** $0.03 per 1M input tokens

1. Visit https://platform.deepseek.com/api_keys
2. Create new API key
3. In Peak Xender:
   - Provider: `deepseek`
   - API Key: Your DeepSeek key
   - Base URL: `https://api.deepseek.com/v1`
   - Model: `deepseek-chat`

---

### Ollama (Local)
**Cost:** Free (self-hosted)

1. Install Ollama: https://ollama.ai
2. Run: `ollama run llama2`
3. In Peak Xender:
   - Provider: `ollama`
   - API Key: (leave blank or use `ollama`)
   - Base URL: `http://localhost:11434/v1`
   - Model: `llama2` or your local model

---

## 🚨 Troubleshooting

### Error: "AI Provider is not configured"

**Cause:** GEMINI_API_KEY is missing and no custom provider configured

**Fix:**
1. Add `GEMINI_API_KEY` to `.env` OR
2. Configure provider in Settings → AI Settings
3. Restart server

---

### Error: "Connection test failed"

**Cause:** Invalid API key or network issue

**Solutions:**
1. Verify API key is correct (no extra spaces)
2. Check internet connection
3. Try different provider
4. Check server logs: `npm run dev` (watch for errors)

---

### Error: "API Rate Limit Exceeded"

**Cause:** Too many requests to AI provider

**Solutions:**
- Gemini: Wait 1 minute (free tier: 15 req/min)
- OpenRouter/OpenAI: Check billing & rate limits
- Use cheaper model (GPT-4o-mini instead of GPT-4-turbo)

---

## 📊 AI Features Enabled

Once configured, these features become available:

### Email Generation
- **Generate** from prompt → produces subject + body
- **Rewrite** existing copy for better conversions
- **Spintax** conversion for deliverability
- **Subject Line** variants for A/B testing

### Reply Analysis
- **Reply Draft** - Auto-generate responses to prospect replies
- **Sentiment Detection** - Classify incoming messages
- **Hot Lead** identification

### Advanced Features
- **AI Chat** - Conversational assistant with app integration
- **Search Grounding** - Real-time company research (Gemini only)
- **TTS** - Text-to-speech voice generation (Gemini only)

### Brand Rules
- Store AI outreach rules in **Settings → AI Settings → Rules**
- Rules automatically included in all AI prompts
- Examples:
  - "Always mention ROI metrics"
  - "Keep emails under 150 words"
  - "Use formal tone for B2B"

---

## 🔐 Security Best Practices

### Environment Variables
- ✅ Store in `.env` (git-ignored)
- ✅ Rotate keys regularly
- ✅ Use strong AI_ENCRYPTION_KEY

### Database Storage
- ✅ API keys encrypted with AES-256-GCM
- ✅ Master key: `AI_ENCRYPTION_KEY` (or falls back to `JWT_SECRET`)
- ✅ IV + Tag + Ciphertext stored securely

### Production Deployment
1. Set `NODE_ENV=production`
2. Use strong `AI_ENCRYPTION_KEY` (not JWT_SECRET)
3. Store secrets in Netlify/Railway/Render dashboard
4. Don't commit `.env` to git
5. Monitor API usage for cost control

---

## 💡 Tips & Recommendations

### Development
- Use **Gemini** (free tier, sufficient for testing)
- Or **DeepSeek** (very cheap)

### Production (Cheap)
- Use **DeepSeek** (~$0.03 per 1M tokens)
- Or **Gemini** (free tier might be insufficient)

### Production (Best Quality)
- Use **GPT-4-turbo** via OpenRouter ($0.10 per 1M tokens)
- Or **Claude-3-Sonnet** ($0.08 per 1M tokens)

### Hybrid Strategy
- **Gemini** for rules & config testing
- **OpenRouter** for production campaigns
- Different models for different stages (faster = cheaper)

---

## 📝 Example `.env` Setup

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Auth
JWT_SECRET=your_jwt_secret_here
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# Encryption
ENCRYPTION_KEY=your_32_byte_hex_key
AI_ENCRYPTION_KEY=your_32_byte_hex_key

# AI (Primary: Gemini)
GEMINI_API_KEY=your_gemini_key_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

## ✅ Verification Checklist

- [ ] GEMINI_API_KEY added to `.env`
- [ ] Server restarted (`npm run dev`)
- [ ] Can access Settings → AI Settings
- [ ] "Test Connection" button shows success
- [ ] AI features visible in campaign builder
- [ ] Generated content appears in emails

---

## 📞 Support

- Google AI Docs: https://ai.google.dev
- Gemini API Docs: https://ai.google.dev/docs
- OpenRouter Docs: https://openrouter.ai/docs
- Peak Xender Issues: Check app logs with `npm run dev`

---

**Last Updated:** 2026-08-14  
**Peak Xender Version:** 1.0.0+
