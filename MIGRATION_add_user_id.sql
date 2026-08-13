-- ============================================================================
-- QUICK FIX: Add user_id to Google-new (PostgreSQL/Supabase)
-- ============================================================================
-- Just copy-paste this entire script into Supabase SQL Editor
-- ============================================================================

-- STEP 1: Add user_id column to all tables
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE queue ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE logs ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- STEP 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_email ON accounts(user_id, email);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_user_id ON queue(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_user_status ON queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);

-- STEP 3: Migrate existing data to user_id = 1
UPDATE accounts SET user_id = 1 WHERE user_id IS NULL;
UPDATE contacts SET user_id = 1 WHERE user_id IS NULL;
UPDATE campaigns SET user_id = 1 WHERE user_id IS NULL;
UPDATE queue SET user_id = 1 WHERE user_id IS NULL;
UPDATE logs SET user_id = 1 WHERE user_id IS NULL;
UPDATE templates SET user_id = 1 WHERE user_id IS NULL;

-- STEP 4: Verify the migration
SELECT 'accounts' as table_name, COUNT(*) as total, COUNT(user_id) as with_user_id FROM accounts
UNION ALL
SELECT 'contacts', COUNT(*), COUNT(user_id) FROM contacts
UNION ALL
SELECT 'campaigns', COUNT(*), COUNT(user_id) FROM campaigns
UNION ALL
SELECT 'queue', COUNT(*), COUNT(user_id) FROM queue
UNION ALL
SELECT 'logs', COUNT(*), COUNT(user_id) FROM logs
UNION ALL
SELECT 'templates', COUNT(*), COUNT(user_id) FROM templates;

-- DONE! All tables now have user_id scoping.
-- Next: Update routes in Google-new to use req.user.id
