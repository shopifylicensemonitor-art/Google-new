-- ============================================================================
-- Peak Xender — Complete Multi-User PostgreSQL Schema
-- ============================================================================
-- Safe to run multiple times (fully idempotent with IF NOT EXISTS)
-- For: Google-new (Fresh Install or Complete Rebuild)
-- ============================================================================

-- ── 1. users ────────────────────────────────────────────────────────────────
-- Store all users that sign in with Google OAuth
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT DEFAULT '',
  picture TEXT DEFAULT '',
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. accounts ─────────────────────────────────────────────────────────────
-- Connected email accounts (Gmail, Outlook, SMTP, IMAP)
-- Each account belongs to exactly ONE user
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry BIGINT,
  daily_sent INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 450,
  last_reset TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  display_name TEXT DEFAULT '',
  type TEXT DEFAULT 'oauth',  -- 'oauth', 'smtp', 'imap'
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_pass TEXT,
  smtp_secure INTEGER DEFAULT 1,
  imap_host TEXT,
  imap_port INTEGER,
  imap_user TEXT,
  imap_pass TEXT,
  imap_secure INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, email)  -- Each user can connect this email only once
);

-- ── 3. contacts ─────────────────────────────────────────────────────────────
-- Recipient lists (email contacts)
-- Each contact belongs to exactly ONE user
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  list_name TEXT NOT NULL,
  email TEXT NOT NULL,
  fields TEXT,  -- JSON: {"first_name":"John","last_name":"Doe","company":"Acme"}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. campaigns ────────────────────────────────────────────────────────────
-- Email campaigns (bulk sending)
-- Each campaign belongs to exactly ONE user
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_plain TEXT,
  contact_list TEXT NOT NULL,  -- list_name to filter contacts
  delay_seconds INTEGER DEFAULT 30,
  start_time TEXT DEFAULT '08:00',  -- HH:mm format
  end_time TEXT DEFAULT '22:00',    -- HH:mm format
  status TEXT DEFAULT 'draft',      -- draft, active, paused, completed
  total_contacts INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  content_variations TEXT,          -- JSON array of variations
  content_mode TEXT DEFAULT 'single', -- single, spintax, random
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. queue ────────────────────────────────────────────────────────────────
-- Email dispatch queue (pending/sent emails)
-- Each queue item belongs to exactly ONE user
CREATE TABLE IF NOT EXISTS queue (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  account_id INTEGER REFERENCES accounts(id),
  status TEXT DEFAULT 'pending',  -- pending, sent, failed, bounced
  retry_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error TEXT,
  fields TEXT,                    -- JSON: recipient-specific data
  final_subject TEXT,             -- After personalization
  final_body TEXT,                -- After personalization
  opens_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  locked_at TIMESTAMPTZ,          -- For distributed scheduler
  locked_by TEXT,                 -- Worker ID that locked this
  next_attempt_at TIMESTAMPTZ,    -- For retry logic
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. logs ─────────────────────────────────────────────────────────────────
-- Audit trail and event logs
-- Each log entry belongs to exactly ONE user
CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id INTEGER,
  account_id INTEGER,
  recipient_email TEXT,
  status TEXT,                    -- sent, failed, opened, clicked
  message TEXT,
  queue_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. templates ────────────────────────────────────────────────────────────
-- Reusable email templates
-- Each template belongs to exactly ONE user
CREATE TABLE IF NOT EXISTS templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_plain TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)  -- Each user's templates must have unique names
);

-- ── 8. settings ─────────────────────────────────────────────────────────────
-- Per-user settings and configuration
CREATE TABLE IF NOT EXISTS settings (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  PRIMARY KEY (user_id, key)
);

-- ── 9. inbox_messages ───────────────────────────────────────────────────────
-- Synced inbox messages from connected accounts
CREATE TABLE IF NOT EXISTS inbox_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id INTEGER,
  sender_email TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Accounts: Fast lookup by user
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_email ON accounts(user_id, email);

-- Contacts: Fast lookup by user
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_list ON contacts(user_id, list_name);

-- Campaigns: Fast lookup by user and status
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_status ON campaigns(user_id, status);

-- Queue: Fast lookup by user, status, and campaign
CREATE INDEX IF NOT EXISTS idx_queue_user_id ON queue(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_user_status ON queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_campaign_status ON queue(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_account_status ON queue(account_id, status);

-- Logs: Fast lookup by user
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);

-- Templates: Fast lookup by user
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);

-- Settings: Fast lookup by user
CREATE INDEX IF NOT EXISTS idx_settings_user ON settings(user_id);

-- Inbox: Fast lookup by user
CREATE INDEX IF NOT EXISTS idx_inbox_user_id ON inbox_messages(user_id);

-- ============================================================================
-- INSERT DEFAULT ADMIN USER
-- ============================================================================

INSERT INTO users (id, email, name, role) 
VALUES (1, 'admin@local', 'Admin', 'admin')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify the schema is created:
-- SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
--   'users', 'accounts', 'contacts', 'campaigns', 'queue', 'logs', 'templates', 'settings', 'inbox_messages'
-- );

-- View all tables created:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- View all indexes created:
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;
