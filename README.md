# Peak Xender - Unified Bulk Email Outreach Platform

A production-ready email outreach platform with automated campaign management, multi-account support, and 24/7 background processing. Send 25-50x faster than manual UI automation with automatic retries, tracking, and fallback support.

**Live Demo:** https://send.peakconix.site  
**Documentation:** See [`QUICKSTART.md`](QUICKSTART.md)

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 20+ and npm (or Bun)
- PostgreSQL 14+ (for production) or SQLite (for development)
- Google OAuth 2.0 credentials (for Gmail integration, optional)

### Local Development Setup

```bash
# Clone repository
git clone <repo-url>
cd peak-xender

# Install dependencies
npm install

# Create .env from template
cp .env.example .env

# Edit .env with your configuration
# - Set DATABASE_URL (local SQLite or remote PostgreSQL)
# - Set JWT_SECRET and ENCRYPTION_KEY (generate with: openssl rand -hex 32)
# - Set Google OAuth credentials if using Gmail

# Start development server
npm run dev
```

This starts:
- Backend API on `http://localhost:3000`
- Frontend dev server on `http://localhost:5173`
- Background worker for email processing

### Production Deployment

```bash
# Build and start
npm run build
npm start
```

**Deploy to Render or Railway:** Use `render.yaml` or `railway.json` included in repo.

---

## 📊 What's Included

### Backend Features
- ✅ **Express.js REST API** with JWT authentication
- ✅ **Multi-account support** (Gmail, Outlook, SMTP)
- ✅ **Background email worker** (processes 24/7, independent of browser)
- ✅ **Atomic queue system** (no race conditions, PostgreSQL/SQLite support)
- ✅ **Automatic retries** (exponential backoff: 5m → 15m → 45m)
- ✅ **Email tracking** (open tracking, click tracking, bounce detection)
- ✅ **Rate limiting** to prevent abuse
- ✅ **Health checks** for monitoring

### Frontend Features
- ✅ **React + Vite SPA** with Tailwind CSS
- ✅ **Responsive design** (works on desktop & mobile)
- ✅ **Campaign builder** with template editor
- ✅ **Recipient management** with CSV import
- ✅ **Account configuration** (Gmail, Outlook, SMTP)
- ✅ **Real-time sending status** with live updates
- ✅ **Analytics dashboard** (sent, opened, clicked)

### Production Infrastructure
- ✅ **Docker containerization** (multi-stage builds)
- ✅ **Deployment configs** for Render.com and Railway.app
- ✅ **PostgreSQL support** for data persistence
- ✅ **Worker process separation** for reliable background job handling
- ✅ **Health checks** integrated into deployment blueprints

---

## 📖 Documentation

- **[`QUICKSTART.md`](QUICKSTART.md)** — 3-step setup + troubleshooting (5 min read)
- **[`DEPLOYMENT.md`](DEPLOYMENT.md)** — Full production deployment guide (15 min read)
- **[`NETLIFY_SCHEDULER_DEPLOYMENT.md`](NETLIFY_SCHEDULER_DEPLOYMENT.md)** — Netlify-specific setup (10 min read)
- **[`INTEGRATION_SUMMARY.md`](INTEGRATION_SUMMARY.md)** — Architecture & performance details (15 min read)
- **[`DELIVERY_SUMMARY.md`](DELIVERY_SUMMARY.md)** — Project overview & deliverables

---

## 🔧 Core Scripts

### Development
```bash
npm run dev              # Full dev mode (API + worker + frontend)
npm run backend:dev      # API server only
npm run worker           # Background worker only
npm run frontend:dev     # Frontend dev server only
npm run build            # Build frontend for production
npm run lint             # Run ESLint
```

### Testing & Validation
```bash
npm test                 # Run all tests
npm run test:security    # Security audit & validation
./test_backend_campaign_api.ps1  # PowerShell integration test (Windows)
```

### Production
```bash
npm start                # Start API server
npm run worker           # Start background worker (separate process)
npm run build            # Build optimized frontend
```

---

## 🚢 Deployment

### Quick Deploy to Render.com

1. Fork/push repo to GitHub
2. Go to [render.com](https://render.com)
3. Click "New Blueprint Instance"
4. Select this repository
5. Follow prompts for PostgreSQL setup
6. Set environment variables in dashboard
7. Deploy! ✨

### Quick Deploy to Railway.app

1. Push to GitHub
2. Go to [railway.app](https://railway.app)
3. Create new project from GitHub repo
4. Railway auto-detects `railway.json`
5. Configure environment variables
6. Deploy!

### Docker (Any Platform)

```bash
# Build image
docker build -t peak-xender .

# Run API server
docker run -p 3000:3000 --env-file .env peak-xender node server.js

# Run background worker
docker run --env-file .env peak-xender node worker.js
```

---

**🚀 Ready to send emails at scale?** Start with [`QUICKSTART.md`](QUICKSTART.md)

For more information, see the full README documentation linked above.
