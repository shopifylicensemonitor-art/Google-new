-- ============================================================================
-- Peak Xender -- Complete Supabase PostgreSQL Schema (v3 Production Ready)
-- ============================================================================
-- Safe to run MULTIPLE times -- fully idempotent via IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- Paste into Supabase SQL Editor and Run All.
-- ============================================================================

-- 1. users
CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  email            TEXT NOT NULL UNIQUE,
  name             TEXT DEFAULT '''',
  picture          TEXT DEFAULT '''',
  role             TEXT DEFAULT ''user'',
  password_hash    TEXT,
  otp_code         TEXT,
  otp_expires_at   TIMESTAMPTZ,
  otp_verified     BOOLEAN DEFAULT FALSE,
  refresh_token    TEXT,
  refresh_expires_at TIMESTAMPTZ,
  workspace_id     INTEGER,
  workspace_role   TEXT DEFAULT ''member'',
  last_login       TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2. workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL DEFAULT ''Default Workspace'',
  owner_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  plan       TEXT DEFAULT ''free'',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. accounts
CREATE TABLE IF NOT EXISTS accounts (
  id                   SERIAL PRIMARY KEY,
  email                TEXT NOT NULL,
  access_token         TEXT,
  refresh_token        TEXT,
  token_expiry         BIGINT,
  daily_sent           INTEGER DEFAULT 0,
  daily_limit          INTEGER DEFAULT 450,
  last_reset           TIMESTAMPTZ,
  status               TEXT DEFAULT ''active'',
  display_name         TEXT DEFAULT '''',
  type                 TEXT DEFAULT ''oauth'',
  smtp_host            TEXT,
  smtp_port            INTEGER,
  smtp_user            TEXT,
  smtp_pass            TEXT,
  smtp_secure          INTEGER DEFAULT 1,
  imap_host            TEXT,
  imap_port            INTEGER,
  imap_user            TEXT,
  imap_pass            TEXT,
  imap_secure          INTEGER DEFAULT 1,
  warmup_enabled       BOOLEAN DEFAULT FALSE,
  warmup_daily_target  INTEGER DEFAULT 40,
  user_id              INTEGER REFERENCES users(id) ON DELETE CASCADE,
  workspace_id         INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 4. contacts
CREATE TABLE IF NOT EXISTS contacts (
  id           SERIAL PRIMARY KEY,
  list_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  fields       TEXT,
  status       TEXT DEFAULT ''active'',
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 5. suppression
CREATE TABLE IF NOT EXISTS suppression (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL,
  reason     TEXT DEFAULT ''unsubscribe'',
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (email, user_id)
);

-- 6. campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id                           SERIAL PRIMARY KEY,
  name                         TEXT NOT NULL,
  subject                      TEXT NOT NULL DEFAULT '''',
  body_html                    TEXT,
  body_plain                   TEXT,
  contact_list                 TEXT NOT NULL DEFAULT '''',
  delay_seconds                INTEGER DEFAULT 30,
  start_time                   TEXT DEFAULT ''08:00'',
  end_time                     TEXT DEFAULT ''22:00'',
  status                       TEXT DEFAULT ''draft'',
  total_contacts               INTEGER DEFAULT 0,
  sent_count                   INTEGER DEFAULT 0,
  failed_count                 INTEGER DEFAULT 0,
  content_variations           TEXT,
  content_mode                 TEXT DEFAULT ''single'',
  ignore_window                INTEGER DEFAULT 0,
  timezone                     TEXT DEFAULT ''Africa/Lagos'',
  account_ids                  TEXT,
  target_limit                 INTEGER DEFAULT 0,
  target_range_start           INTEGER DEFAULT 0,
  target_range_end             INTEGER DEFAULT 0,
  exclude_previously_contacted INTEGER DEFAULT 0,
  custom_filters               TEXT,
  format_type                  TEXT DEFAULT ''html'',
  timing_mode                  TEXT DEFAULT ''smart'',
  min_delay                    INTEGER DEFAULT 30,
  max_delay                    INTEGER DEFAULT 90,
  cooldown_enabled             INTEGER DEFAULT 1,
  cooldown_batch_size          INTEGER DEFAULT 15,
  cooldown_duration_minutes    INTEGER DEFAULT 5,
  user_id                      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  workspace_id                 INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
  created_at                   TIMESTAMPTZ DEFAULT NOW()
);

-- 7. campaign_steps
CREATE TABLE IF NOT EXISTS campaign_steps (
  id            SERIAL PRIMARY KEY,
  campaign_id   INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  step_number   INTEGER NOT NULL,
  subject       TEXT NOT NULL DEFAULT '''',
  body_html     TEXT,
  body_plain    TEXT,
  delay_seconds INTEGER DEFAULT 86400,
  trigger_event TEXT DEFAULT ''wait'',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 8. campaign_recipients
CREATE TABLE IF NOT EXISTS campaign_recipients (
  campaign_id     INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  status          TEXT DEFAULT ''active'',
  current_step    INTEGER DEFAULT 1,
  last_sent_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (campaign_id, recipient_email)
);

-- 9. queue
CREATE TABLE IF NOT EXISTS queue (
  id               SERIAL PRIMARY KEY,
  campaign_id      INTEGER NOT NULL REFERENCES campaigns(id),
  recipient_email  TEXT NOT NULL,
  account_id       INTEGER REFERENCES accounts(id),
  status           TEXT DEFAULT ''pending'',
  retry_count      INTEGER DEFAULT 0,
  scheduled_at     TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ,
  error            TEXT,
  fields           TEXT,
  final_subject    TEXT,
  final_body       TEXT,
  opens_count      INTEGER DEFAULT 0,
  clicks_count     INTEGER DEFAULT 0,
  step_number      INTEGER DEFAULT 1,
  campaign_step_id INTEGER,
  locked_at        TIMESTAMPTZ,
  locked_by        TEXT,
  attempt_count    INTEGER DEFAULT 0,
  last_error       TEXT,
  next_attempt_at  TIMESTAMPTZ,
  user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
  workspace_id     INTEGER REFERENCES workspaces(id) ON DELETE SET NULL
);

-- 10. logs
CREATE TABLE IF NOT EXISTS logs (
  id              SERIAL PRIMARY KEY,
  campaign_id     INTEGER,
  account_id      INTEGER,
  recipient_email TEXT,
  status          TEXT,
  message         TEXT,
  queue_id        INTEGER,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 11. templates
CREATE TABLE IF NOT EXISTS templates (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  subject      TEXT NOT NULL DEFAULT '''',
  body_html    TEXT,
  body_plain   TEXT,
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 12. settings
CREATE TABLE IF NOT EXISTS settings (
  key      TEXT NOT NULL,
  value    TEXT,
  user_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (key, user_id)
);

-- 13. ai_config
CREATE TABLE IF NOT EXISTS ai_config (
  id                SERIAL PRIMARY KEY,
  provider          TEXT NOT NULL DEFAULT ''openrouter'',
  api_key_encrypted TEXT NOT NULL,
  base_url          TEXT NOT NULL DEFAULT ''https://openrouter.ai/api/v1'',
  model             TEXT NOT NULL DEFAULT ''openai/gpt-4o-mini'',
  is_active         INTEGER DEFAULT 1,
  user_id           INTEGER REFERENCES users(id) ON DELETE CASCADE,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 14. ai_rules
CREATE TABLE IF NOT EXISTS ai_rules (
  id          SERIAL PRIMARY KEY,
  rule_type   TEXT NOT NULL,
  content     TEXT NOT NULL,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (rule_type, user_id)
);

-- 15. inbox_messages
CREATE TABLE IF NOT EXISTS inbox_messages (
  id              SERIAL PRIMARY KEY,
  account_id      INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  sender_email    TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject         TEXT,
  body_text       TEXT,
  body_html       TEXT,
  sentiment       TEXT DEFAULT ''neutral'',
  is_read         INTEGER DEFAULT 0,
  user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 16. device_states
CREATE TABLE IF NOT EXISTS device_states (
  device_id  TEXT PRIMARY KEY,
  ip_address TEXT,
  state_data TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. domains
CREATE TABLE IF NOT EXISTS domains (
  id          SERIAL PRIMARY KEY,
  domain      TEXT NOT NULL,
  spf         TEXT,
  dkim        TEXT,
  dmarc       TEXT,
  mx          TEXT,
  last_check  TIMESTAMPTZ,
  status      TEXT DEFAULT ''unknown'',
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (domain, user_id)
);

-- ============================================================================
-- Safe Migrations
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_role TEXT DEFAULT ''member'';

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS warmup_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS warmup_daily_target INTEGER DEFAULT 40;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 450;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS imap_host TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS imap_port INTEGER;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS imap_user TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS imap_pass TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS imap_secure INTEGER DEFAULT 1;

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT ''active'';

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ignore_window INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT ''Africa/Lagos'';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS account_ids TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_limit INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_range_start INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_range_end INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS exclude_previously_contacted INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS custom_filters TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS format_type TEXT DEFAULT ''html'';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS timing_mode TEXT DEFAULT ''smart'';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS min_delay INTEGER DEFAULT 30;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS max_delay INTEGER DEFAULT 90;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cooldown_enabled INTEGER DEFAULT 1;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cooldown_batch_size INTEGER DEFAULT 15;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cooldown_duration_minutes INTEGER DEFAULT 5;

ALTER TABLE campaign_steps ADD COLUMN IF NOT EXISTS body_plain TEXT;
ALTER TABLE campaign_steps ADD COLUMN IF NOT EXISTS delay_seconds INTEGER DEFAULT 86400;
ALTER TABLE campaign_steps ADD COLUMN IF NOT EXISTS trigger_event TEXT DEFAULT ''wait'';

ALTER TABLE queue ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS step_number INTEGER DEFAULT 1;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS campaign_step_id INTEGER;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS locked_by TEXT;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;

ALTER TABLE logs ADD COLUMN IF NOT EXISTS queue_id INTEGER;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS user_id INTEGER;

ALTER TABLE templates ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS workspace_id INTEGER;

ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 1;

ALTER TABLE ai_rules ADD COLUMN IF NOT EXISTS user_id INTEGER;

ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- ============================================================================
-- Performance Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_queue_status_sched    ON queue(status, scheduled_at) WHERE status = ''pending'';
CREATE INDEX IF NOT EXISTS idx_queue_status_campaign ON queue(status, campaign_id);
CREATE INDEX IF NOT EXISTS idx_queue_scheduled_at    ON queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_queue_locked_at       ON queue(locked_at);
CREATE INDEX IF NOT EXISTS idx_queue_user_id         ON queue(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_recipient       ON queue(recipient_email);

CREATE INDEX IF NOT EXISTS idx_contacts_list_name    ON contacts(list_name);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id      ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email        ON contacts(email);

CREATE INDEX IF NOT EXISTS idx_campaigns_status      ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id     ON campaigns(user_id);

CREATE INDEX IF NOT EXISTS idx_accounts_email        ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id      ON accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_logs_created_at       ON logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_user_id          ON logs(user_id);

CREATE INDEX IF NOT EXISTS idx_inbox_recipient       ON inbox_messages(recipient_email);
CREATE INDEX IF NOT EXISTS idx_inbox_created_at      ON inbox_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_inbox_user_id         ON inbox_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_suppression_email     ON suppression(email);
CREATE INDEX IF NOT EXISTS idx_suppression_user_id   ON suppression(user_id);

CREATE INDEX IF NOT EXISTS idx_domains_user_id       ON domains(user_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE IF EXISTS accounts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contacts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suppression         ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suppression_list    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campaigns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campaign_steps      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS queue               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS templates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS settings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workspaces          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workspace_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_config           ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ai_rules            ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inbox_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS device_states       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS domains             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS refresh_tokens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tracking_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications       ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Done! All 23 public tables secured with Row Level Security.
-- ============================================================================

