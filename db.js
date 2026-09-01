/**
 * db.js — Dual-mode database connector (SQLite + PostgreSQL).
 *
 * If DATABASE_URL is set in .env, connects to PostgreSQL (e.g. Supabase).
 * Otherwise, uses sql.js (pure JS/WASM) for local SQLite storage.
 *
 * Both adapters expose the same async API:
 *   db.prepare(sql).all(...params)   → Promise<[{ col: val, … }, …]>
 *   db.prepare(sql).get(...params)   → Promise<{ col: val, … } | undefined>
 *   db.prepare(sql).run(...params)   → Promise<{ changes, lastInsertRowid }>
 *   db.exec(sql)                     → Promise<void>
 *   db.transaction(fn)               → async callable wrapper
 */

require('dotenv').config();

let ready = null; // Promise that resolves to the wrapped db

// ============================================================================
// PostgreSQL Adapter
// ============================================================================

function createPgAdapter() {
  const { Pool } = require('pg');
  const dbUrl = process.env.DATABASE_URL || '';
  const isSupabase = dbUrl.includes('supabase') || dbUrl.includes('pooler');
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: isSupabase || dbUrl.includes('sslmode=') ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 20000,
    idleTimeoutMillis: 30000,
    max: 10,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });

  pool.on('error', (err) => {
    console.warn('Supabase PG pool connection error (transient, reconnecting):', err.message);
  });

  /** Convert SQLite-style `?` placeholders to PG-style `$1, $2, ...` */
  function convertPlaceholders(sql) {
    let idx = 0;
    return sql.replace(/\?/g, () => `$${++idx}`);
  }

  /** Convert SQLite datetime('now') to PG NOW() */
  function convertDatetime(sql) {
    return sql.replace(/datetime\('now'\)/gi, 'NOW()');
  }

  function convertInsertOrIgnore(sql) {
    const trimmed = (sql || '').trim();
    if (/^INSERT\s+OR\s+IGNORE\s+INTO\s+/i.test(trimmed)) {
      let converted = trimmed.replace(/^INSERT\s+OR\s+IGNORE\s+INTO\s+/i, 'INSERT INTO ');
      if (!/ON\s+CONFLICT/i.test(converted)) {
        converted = converted.replace(/;?\s*$/, ' ON CONFLICT DO NOTHING');
      }
      return converted;
    }
    return trimmed;
  }

  /** Append RETURNING id to INSERT statements so lastInsertRowid works */
  function appendReturning(sql) {
    const trimmed = sql.trim();
    // Do NOT append RETURNING id to tables that do not have an `id` column
    if (
      /^INSERT\s/i.test(trimmed) &&
      !/RETURNING\s/i.test(trimmed) &&
      !/INSERT\s+INTO\s+(campaign_recipients|settings|device_states|user_settings|workspace_members)\b/i.test(trimmed)
    ) {
      return trimmed.replace(/;?\s*$/, ' RETURNING id');
    }
    return sql;
  }

  /** Full SQL conversion pipeline */
  function convertSql(sql) {
    return appendReturning(convertInsertOrIgnore(convertDatetime(convertPlaceholders(sql))));
  }

  const wrapped = {
    _isPg: true,

    async close() {
      await pool.end();
    },

    async exec(sql) {
      // PG exec: run raw SQL (for DDL)
      await pool.query(sql);
    },

    prepare(sql) {
      const pgSql = convertSql(sql);
      return {
        async all(...params) {
          const flat = flattenParams(params);
          try {
            const result = await pool.query(pgSql, flat);
            return result.rows;
          } catch (err) {
            if (err.message && (err.message.includes('timeout') || err.message.includes('Connection terminated') || err.message.includes('closed'))) {
              console.warn('PostgreSQL transient query retry:', err.message);
              const retryResult = await pool.query(pgSql, flat);
              return retryResult.rows;
            }
            throw err;
          }
        },
        async get(...params) {
          const flat = flattenParams(params);
          try {
            const result = await pool.query(pgSql, flat);
            return result.rows[0] || undefined;
          } catch (err) {
            if (err.message && (err.message.includes('timeout') || err.message.includes('Connection terminated') || err.message.includes('closed'))) {
              console.warn('PostgreSQL transient query retry:', err.message);
              const retryResult = await pool.query(pgSql, flat);
              return retryResult.rows[0] || undefined;
            }
            throw err;
          }
        },
        async run(...params) {
          const flat = flattenParams(params);
          let result;
          try {
            result = await pool.query(pgSql, flat);
          } catch (err) {
            if (err.message && err.message.includes('column "id" does not exist')) {
              const fallbackSql = pgSql.replace(/\s+RETURNING\s+id/gi, '');
              result = await pool.query(fallbackSql, flat);
            } else if (err.message && (err.message.includes('timeout') || err.message.includes('Connection terminated') || err.message.includes('closed'))) {
              console.warn('PostgreSQL transient query retry:', err.message);
              result = await pool.query(pgSql, flat);
            } else {
              throw err;
            }
          }
          // Try to extract lastInsertRowid from RETURNING clause
          let lastId = 0;
          if (result.rows && result.rows[0] && result.rows[0].id) {
            lastId = result.rows[0].id;
          }
          return { changes: result.rowCount || 0, lastInsertRowid: lastId };
        },
      };
    },

    transaction(fn) {
      return async (...args) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          // Replace pool with client for the duration of the transaction
          const txDb = { ...wrapped };
          txDb.prepare = (sql) => {
            const pgSql = convertSql(sql);
            return {
              async all(...params) {
                const flat = flattenParams(params);
                const result = await client.query(pgSql, flat);
                return result.rows;
              },
              async get(...params) {
                const flat = flattenParams(params);
                const result = await client.query(pgSql, flat);
                return result.rows[0] || undefined;
              },
              async run(...params) {
                const flat = flattenParams(params);
                let result;
                try {
                  result = await client.query(pgSql, flat);
                } catch (err) {
                  if (err.message && err.message.includes('column "id" does not exist')) {
                    const fallbackSql = pgSql.replace(/\s+RETURNING\s+id/gi, '');
                    result = await client.query(fallbackSql, flat);
                  } else {
                    throw err;
                  }
                }
                let lastId = 0;
                if (result.rows && result.rows[0] && result.rows[0].id) {
                  lastId = result.rows[0].id;
                }
                return { changes: result.rowCount || 0, lastInsertRowid: lastId };
              },
            };
          };
          const result = await fn(txDb, ...args);
          await client.query('COMMIT');
          return result;
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      };
    },
  };

  return wrapped;
}

// ============================================================================
// SQLite Adapter (wrapped in Promises for API compatibility)
// ============================================================================

function createSqliteAdapter() {
  const initSqlJs = require('sql.js');
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  const isServerless = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL);
  const DB_PATH = isServerless 
    ? path.join(os.tmpdir(), 'mailflow.db') 
    : path.join(__dirname, 'mailflow.db');
  let rawDb = null;

  // Debounced async save to avoid blocking the event loop on every write.
  let saveTimer = null;
  let saveInProgress = null;

  async function doSave() {
    if (!rawDb) return;
    try {
      const data = rawDb.export();
      saveInProgress = fs.promises.writeFile(DB_PATH, Buffer.from(data));
      await saveInProgress;
    } catch (err) {
      console.warn('SQLite disk save skipped (read-only filesystem or serverless context):', err.message);
    } finally {
      saveInProgress = null;
    }
  }

  function scheduleSave(delay = 1000) {
    if (!rawDb) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      // fire and forget, errors logged
      doSave().catch((err) => console.error('SQLite async save error', err));
      saveTimer = null;
    }, delay);
  }

  async function flushSave() {
    if (!rawDb) return;
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      // ensure one final save
      await doSave();
    }
    if (saveInProgress) {
      await saveInProgress;
    }
  }

  return (async () => {
    const SQL = await initSqlJs({
      locateFile: file => {
        const candidatePaths = [
          path.join(__dirname, file),
          path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file),
          path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
          path.join(process.cwd(), 'gfg-main', 'node_modules', 'sql.js', 'dist', file)
        ];
        for (const p of candidatePaths) {
          if (fs.existsSync(p)) return p;
        }
        return file;
      }
    });

    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      rawDb = new SQL.Database(fileBuffer);
      console.log('SQLite database loaded from disk.');
    } else {
      rawDb = new SQL.Database();
      console.log('New SQLite database created.');
    }

    const wrapped = {
      _isPg: false,

        async close() {
          await flushSave();
          if (rawDb) {
            rawDb.close();
          }
        },

      async exec(sql) {
        rawDb.run(sql);
        scheduleSave();
      },

      prepare(sql) {
        return {
          async all(...params) {
            const flat = flattenParams(params);
            try {
              const stmt = rawDb.prepare(sql);
              if (flat.length) stmt.bind(flat);
              const rows = [];
              while (stmt.step()) {
                rows.push(stmt.getAsObject());
              }
              stmt.free();
              return rows;
            } catch (err) {
              throw err;
            }
          },

          async get(...params) {
            const flat = flattenParams(params);
            try {
              const stmt = rawDb.prepare(sql);
              if (flat.length) stmt.bind(flat);
              let row;
              if (stmt.step()) {
                row = stmt.getAsObject();
              }
              stmt.free();
              return row;
            } catch (err) {
              throw err;
            }
          },

          async run(...params) {
            const flat = flattenParams(params);
            try {
              rawDb.run(sql, flat);
              scheduleSave();
              const info = rawDb.getRowsModified
                ? rawDb.getRowsModified()
                : 0;
              let lastId = 0;
              try {
                const idStmt = rawDb.prepare('SELECT last_insert_rowid() as id');
                if (idStmt.step()) {
                  lastId = idStmt.getAsObject().id;
                }
                idStmt.free();
              } catch (_) { /* ignore */ }
              return { changes: info, lastInsertRowid: lastId };
            } catch (err) {
              throw err;
            }
          },
        };
      },

      transaction(fn) {
        return async (...args) => {
          rawDb.run('BEGIN TRANSACTION');
          try {
            const result = await fn(wrapped, ...args);
            rawDb.run('COMMIT');
            scheduleSave();
            return result;
          } catch (err) {
            rawDb.run('ROLLBACK');
            throw err;
          }
        };
      },
    };

    // Expose flushSave as `save` for compatibility (returns a Promise)
    return { rawDb, wrapped, save: flushSave };
  })();
}

// ============================================================================
// Shared Helpers
// ============================================================================

/** Fully flatten params so callers can do .run(a, b, c), .run([a, b, c]), or mixed nested arrays. */
function flattenParams(params) {
  if (!params || params.length === 0) return [];
  const flat = [];
  function recurse(item) {
    if (Array.isArray(item)) {
      for (let i = 0; i < item.length; i++) {
        recurse(item[i]);
      }
    } else if (item !== undefined) {
      flat.push(item);
    }
  }
  recurse(params);
  return flat;
}

// ============================================================================
// DDL — Table creation
// ============================================================================

const SQLITE_DDL = `
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    access_token TEXT,
    refresh_token TEXT,
    token_expiry INTEGER,
    daily_sent INTEGER DEFAULT 0,
    daily_limit INTEGER DEFAULT 450,
    last_reset TEXT,
    status TEXT DEFAULT 'active',
    display_name TEXT DEFAULT '',
    type TEXT DEFAULT 'oauth',
    smtp_host TEXT,
    smtp_port INTEGER,
    smtp_user TEXT,
    smtp_pass TEXT,
    smtp_secure INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_name TEXT NOT NULL,
    email TEXT NOT NULL,
    fields TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT,
    body_plain TEXT,
    contact_list TEXT NOT NULL,
    delay_seconds INTEGER DEFAULT 30,
    start_time TEXT DEFAULT '08:00',
    end_time TEXT DEFAULT '22:00',
    status TEXT DEFAULT 'draft',
    total_contacts INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    content_variations TEXT,
    content_mode TEXT DEFAULT 'single',
    ignore_window INTEGER DEFAULT 0,
    timezone TEXT DEFAULT 'Africa/Lagos',
    account_ids TEXT,
    target_limit INTEGER DEFAULT 0,
    custom_filters TEXT,
    format_type TEXT DEFAULT 'html',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    recipient_email TEXT NOT NULL,
    account_id INTEGER,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    scheduled_at TEXT,
    sent_at TEXT,
    error TEXT,
    fields TEXT,
    final_subject TEXT,
    final_body TEXT,
    opens_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER,
    account_id INTEGER,
    recipient_email TEXT,
    status TEXT,
    message TEXT,
    queue_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT,
    body_plain TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT DEFAULT '',
    picture TEXT DEFAULT '',
    role TEXT DEFAULT 'user',
    last_login TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    password_hash TEXT,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_code TEXT,
    verification_code_expires TEXT,
    access_token_expires_at TEXT,
    refresh_token_expires_at TEXT,
    auth_provider TEXT DEFAULT 'email'
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    revoked INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    used_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS campaign_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    step_number INTEGER NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT,
    body_plain TEXT,
    delay_seconds INTEGER DEFAULT 86400,
    trigger_event TEXT DEFAULT 'wait',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS campaign_recipients (
    campaign_id INTEGER NOT NULL,
    recipient_email TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    current_step INTEGER DEFAULT 1,
    last_sent_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (campaign_id, recipient_email),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS device_states (
    device_id TEXT PRIMARY KEY,
    user_id INTEGER,
    ip_address TEXT,
    state_data TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workspace_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(workspace_id, key),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_column_prefs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    workspace_id INTEGER,
    table_name TEXT NOT NULL,
    column_name TEXT NOT NULL,
    hidden INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, workspace_id, table_name, column_name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS saved_filters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    workspace_id INTEGER,
    name TEXT NOT NULL,
    entity TEXT NOT NULL DEFAULT 'campaigns',
    filter_json TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, workspace_id, name, entity),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS delegation_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER,
    user_id INTEGER NOT NULL,
    actor_user_id INTEGER,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    payload TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ai_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL DEFAULT 'openrouter',
    api_key_encrypted TEXT NOT NULL,
    base_url TEXT NOT NULL DEFAULT 'https://openrouter.ai/api/v1',
    model TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
    is_active INTEGER DEFAULT 0,
    user_id INTEGER,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ai_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_type TEXT NOT NULL,
    content TEXT NOT NULL,
    user_id INTEGER,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS inbox_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    account_id INTEGER,
    sender_email TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    sentiment TEXT DEFAULT 'neutral',
    is_read INTEGER DEFAULT 0,
    message_id TEXT,
    thread_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS suppression_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL DEFAULT 'email',
    value TEXT NOT NULL,
    reason TEXT DEFAULT 'unsubscribed',
    user_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    domain TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    spf_record TEXT,
    dkim_selector TEXT DEFAULT 'peak',
    dkim_public_key TEXT,
    dkim_private_key TEXT,
    dmarc_record TEXT,
    custom_tracking_domain TEXT,
    tracking_status TEXT DEFAULT 'pending',
    mx_verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feature_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    enabled INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feature_flag_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feature_flag_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    enabled INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(feature_flag_id, user_id),
    FOREIGN KEY (feature_flag_id) REFERENCES feature_flags(id) ON DELETE CASCADE
  );
`;

const PG_DDL = `
  CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    access_token TEXT,
    refresh_token TEXT,
    token_expiry BIGINT,
    daily_sent INTEGER DEFAULT 0,
    daily_limit INTEGER DEFAULT 450,
    last_reset TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    display_name TEXT DEFAULT '',
    type TEXT DEFAULT 'oauth',
    smtp_host TEXT,
    smtp_port INTEGER,
    smtp_user TEXT,
    smtp_pass TEXT,
    smtp_secure INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    list_name TEXT NOT NULL,
    email TEXT NOT NULL,
    fields TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(list_name, email)
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT,
    body_html TEXT,
    body_plain TEXT,
    status TEXT DEFAULT 'draft',
    contact_list TEXT,
    account_ids TEXT,
    delay_seconds INTEGER DEFAULT 30,
    daily_limit INTEGER DEFAULT 450,
    start_time TEXT,
    end_time TEXT,
    schedule_cron TEXT,
    track_opens INTEGER DEFAULT 1,
    track_clicks INTEGER DEFAULT 1,
    custom_domain TEXT,
    content_mode TEXT DEFAULT 'single',
    content_variations TEXT,
    auto_followups TEXT,
    total_contacts INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    ignore_window INTEGER DEFAULT 0,
    timezone TEXT DEFAULT 'Africa/Lagos',
    target_limit INTEGER DEFAULT 0,
    target_range_start INTEGER DEFAULT 0,
    target_range_end INTEGER DEFAULT 0,
    exclude_previously_contacted INTEGER DEFAULT 0,
    custom_filters TEXT,
    format_type TEXT DEFAULT 'html',
    timing_mode TEXT DEFAULT 'smart',
    min_delay INTEGER DEFAULT 30,
    max_delay INTEGER DEFAULT 90,
    cooldown_enabled INTEGER DEFAULT 1,
    cooldown_batch_size INTEGER DEFAULT 15,
    cooldown_duration_minutes INTEGER DEFAULT 5,
    user_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT,
    body_html TEXT,
    user_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS campaign_recipients (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    fields TEXT,
    status TEXT DEFAULT 'active',
    current_step INTEGER DEFAULT 1,
    last_sent_at TIMESTAMPTZ,
    last_activity TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, email)
  );

  CREATE TABLE IF NOT EXISTS campaign_steps (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    wait_days INTEGER DEFAULT 3,
    subject TEXT,
    body_html TEXT,
    body_plain TEXT,
    delay_seconds INTEGER DEFAULT 86400,
    trigger_event TEXT DEFAULT 'wait',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, step_number)
  );

  CREATE TABLE IF NOT EXISTS queue (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    fields TEXT,
    final_subject TEXT,
    final_body TEXT,
    status TEXT DEFAULT 'pending',
    scheduled_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    step_number INTEGER DEFAULT 1,
    campaign_step_id INTEGER,
    opens_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
    account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    recipient_email TEXT,
    status TEXT NOT NULL,
    message TEXT,
    queue_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    picture TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS tracking_events (
    id SERIAL PRIMARY KEY,
    queue_id INTEGER,
    event_type TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    link_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS ai_rules (
    id SERIAL PRIMARY KEY,
    rule_type TEXT NOT NULL,
    content TEXT NOT NULL,
    user_id INTEGER,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS inbox_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    account_id INTEGER,
    sender_email TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    sentiment TEXT DEFAULT 'neutral',
    is_read INTEGER DEFAULT 0,
    message_id TEXT,
    thread_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS device_states (
    device_id TEXT PRIMARY KEY,
    user_id INTEGER,
    ip_address TEXT,
    state_data TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'info',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, key)
  );

  CREATE TABLE IF NOT EXISTS workspace_settings (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, key)
  );

  CREATE TABLE IF NOT EXISTS user_column_prefs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    column_name TEXT NOT NULL,
    hidden BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, workspace_id, table_name, column_name)
  );

  CREATE TABLE IF NOT EXISTS saved_filters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    entity TEXT NOT NULL DEFAULT 'campaigns',
    filter_json TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, workspace_id, name, entity)
  );

  CREATE TABLE IF NOT EXISTS delegation_log (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    payload TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS ai_config (
    id SERIAL PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'openrouter',
    api_key_encrypted TEXT NOT NULL,
    base_url TEXT NOT NULL DEFAULT 'https://openrouter.ai/api/v1',
    model TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
    is_active INTEGER DEFAULT 0,
    user_id INTEGER,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS suppression_list (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'email',
    value TEXT NOT NULL,
    reason TEXT DEFAULT 'unsubscribed',
    user_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS domains (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    domain TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    spf_record TEXT,
    dkim_selector TEXT DEFAULT 'peak',
    dkim_public_key TEXT,
    dkim_private_key TEXT,
    dmarc_record TEXT,
    custom_tracking_domain TEXT,
    tracking_status TEXT DEFAULT 'pending',
    mx_verified INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS feature_flags (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS feature_flag_overrides (
    id SERIAL PRIMARY KEY,
    feature_flag_id INTEGER NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(feature_flag_id, user_id)
  );
`;

// ============================================================================
// Initialisation
// ============================================================================

/** Tables whose rows belong to a single application user. */
const TENANT_TABLES = [
  'accounts', 'contacts', 'campaigns', 'templates', 'suppression_list',
  'inbox_messages', 'ai_config', 'ai_rules', 'notifications', 'user_settings',
  'device_states', 'logs', 'queue', 'domains'
];

const TENANT_INDEX_DDL = `
  CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
  CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
  CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);
  CREATE INDEX IF NOT EXISTS idx_templates_user ON templates(user_id);
  CREATE INDEX IF NOT EXISTS idx_inbox_messages_user ON inbox_messages(user_id);
  CREATE INDEX IF NOT EXISTS idx_ai_config_user ON ai_config(user_id);
  CREATE INDEX IF NOT EXISTS idx_ai_rules_user ON ai_rules(user_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_device_states_user ON device_states(user_id);
  CREATE INDEX IF NOT EXISTS idx_logs_user ON logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_queue_user ON queue(user_id);
  CREATE INDEX IF NOT EXISTS idx_domains_user ON domains(user_id);
`;

/**
 * One-time backfill: rows created before multi-tenancy have no owner.
 * Assign them to the lowest-id existing user (the original admin) so that
 * scoped queries keep returning historical data instead of silently hiding it.
 */
async function backfillTenantOwnership(db) {
  try {
    const countRow = await db.prepare('SELECT COUNT(*) as c FROM users').get();
    if (!countRow || Number(countRow.c) !== 1) {
      // Only backfill legacy pre-multi-tenancy data when exactly one initial user exists.
      return;
    }
    const owner = await db.prepare('SELECT id FROM users ORDER BY id ASC LIMIT 1').get();
    if (!owner) return;
    for (const t of TENANT_TABLES) {
      try {
        await db.prepare(`UPDATE ${t} SET user_id = ? WHERE user_id IS NULL`).run(owner.id);
      } catch (_) { /* table/column may not exist yet on a fresh db */ }
    }
  } catch (_) { /* non-fatal */ }
}

ready = (async () => {
  const forceSqlite = process.env.USE_SQLITE === 'true';
  const hasPgUrl = !!process.env.DATABASE_URL;
  const usePg = !forceSqlite && hasPgUrl;

  // Performance indexes (idempotent — safe to run on every startup)
  const INDEX_DDL = `
    CREATE INDEX IF NOT EXISTS idx_queue_status_campaign ON queue(status, campaign_id);
    CREATE INDEX IF NOT EXISTS idx_queue_scheduled_at ON queue(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_contacts_list_name ON contacts(list_name);
    CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_inbox_recipient ON inbox_messages(recipient_email);
    CREATE INDEX IF NOT EXISTS idx_inbox_created_at ON inbox_messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_inbox_message_id ON inbox_messages(message_id);
  `;

  if (usePg) {
    console.log('Connecting to PostgreSQL (Supabase)...');
    const adapter = createPgAdapter();
    try {
      await adapter.exec(PG_DDL);
      try {
        await adapter.exec("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 450;");
      } catch (_) {}
      try {
        await adapter.exec("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS imap_host TEXT;");
        await adapter.exec("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS imap_port INTEGER;");
        await adapter.exec("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS imap_user TEXT;");
        await adapter.exec("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS imap_pass TEXT;");
        await adapter.exec("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS imap_secure INTEGER DEFAULT 1;");
      } catch (_) {}
      try {
        await adapter.exec("ALTER TABLE queue ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;");
      } catch (_) {}
      try {
        await adapter.exec("ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';");
      } catch (_) {}
      try {
        await adapter.exec("ALTER TABLE queue ADD COLUMN IF NOT EXISTS step_number INTEGER DEFAULT 1;");
      } catch (_) {}
      try {
        await adapter.exec("ALTER TABLE queue ADD COLUMN IF NOT EXISTS campaign_step_id INTEGER;");
      } catch (_) {}
      try {
        await adapter.exec("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS ignore_window INTEGER DEFAULT 0;");
        await adapter.exec("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Africa/Lagos';");
        await adapter.exec("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS account_ids TEXT;");
        await adapter.exec("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_limit INTEGER DEFAULT 0;");
        await adapter.exec("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_range_start INTEGER DEFAULT 0;");
        await adapter.exec("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_range_end INTEGER DEFAULT 0;");
        await adapter.exec("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS exclude_previously_contacted INTEGER DEFAULT 0;");
        await adapter.exec("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS custom_filters TEXT;");
        await adapter.exec("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS format_type TEXT DEFAULT 'html';");
        await adapter.exec("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS timing_mode TEXT DEFAULT 'smart';");
        await adapter.exec("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS min_delay INTEGER DEFAULT 30;");
        await adapter.exec("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS max_delay INTEGER DEFAULT 90;");
        await adapter.exec("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cooldown_enabled INTEGER DEFAULT 1;");
        await adapter.exec("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cooldown_batch_size INTEGER DEFAULT 15;");
        await adapter.exec("ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cooldown_duration_minutes INTEGER DEFAULT 5;");
      } catch (_) {}
      try {
        await adapter.exec("ALTER TABLE campaign_steps ADD COLUMN IF NOT EXISTS body_plain TEXT;");
        await adapter.exec("ALTER TABLE campaign_steps ADD COLUMN IF NOT EXISTS delay_seconds INTEGER DEFAULT 86400;");
        await adapter.exec("ALTER TABLE campaign_steps ADD COLUMN IF NOT EXISTS trigger_event TEXT DEFAULT 'wait';");
      } catch (_) {}
      try {
        await adapter.exec("ALTER TABLE logs ADD COLUMN IF NOT EXISTS queue_id INTEGER;");
      } catch (_) {}
      try {
        await adapter.exec("ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 0;");
        await adapter.exec("ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Primary Key';");
        await adapter.exec("ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;");
      } catch (_) {}
      try {
        await adapter.exec("ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS is_starred INTEGER DEFAULT 0;");
        await adapter.exec("ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS starred_at TIMESTAMPTZ;");
        await adapter.exec("ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';");
      } catch (_) {}
      // Email/password authentication columns
      try {
        await adapter.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;");
      } catch (_) {}
      // Account lockout and email verification columns
      try {
        await adapter.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;");
      } catch (_) {}
      try {
        await adapter.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TEXT;");
      } catch (_) {}
      try {
        await adapter.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;");
      } catch (_) {}
      try {
        await adapter.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code TEXT;");
      } catch (_) {}
      try {
        await adapter.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_expires TEXT;");
      } catch (_) {}
      // PHASE 4: Add refresh token columns
      try {
        await adapter.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS access_token_expires_at TEXT;");
      } catch (_) {}
      try {
        await adapter.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_expires_at TEXT;");
      } catch (_) {}
      try {
        await adapter.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';");
      } catch (_) {}
      // Create refresh_tokens table if not exists (fallback for direct DB init)
      try {
        await adapter.exec(`
          CREATE TABLE IF NOT EXISTS refresh_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            revoked INTEGER DEFAULT 0
          );
        `);
      } catch (_) {}
      // Workspace/multi-tenant support tables
      try {
        await adapter.exec(`
          CREATE TABLE IF NOT EXISTS workspaces (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);
      } catch (_) {}
      try {
        await adapter.exec(`
          CREATE TABLE IF NOT EXISTS workspace_members (
            id SERIAL PRIMARY KEY,
            workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role TEXT DEFAULT 'member',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(workspace_id, user_id)
          );
        `);
      } catch (_) {}
      try {
        await adapter.exec(`
          CREATE TABLE IF NOT EXISTS workspace_settings (
            id SERIAL PRIMARY KEY,
            workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            key TEXT NOT NULL,
            value TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(workspace_id, key)
          );
        `);
        await adapter.exec(`
          CREATE TABLE IF NOT EXISTS user_column_prefs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
            table_name TEXT NOT NULL,
            column_name TEXT NOT NULL,
            hidden BOOLEAN DEFAULT FALSE,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, workspace_id, table_name, column_name)
          );
        `);
        await adapter.exec(`
          CREATE TABLE IF NOT EXISTS saved_filters (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            entity TEXT NOT NULL DEFAULT 'campaigns',
            filter_json TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, workspace_id, name, entity)
          );
        `);
        await adapter.exec(`
          CREATE TABLE IF NOT EXISTS delegation_log (
            id SERIAL PRIMARY KEY,
            workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            action TEXT NOT NULL,
            target_type TEXT,
            target_id INTEGER,
            payload TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `);
      } catch (_) {}
      try {
        await adapter.exec("ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS message_id TEXT;");
        await adapter.exec("ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS thread_id TEXT;");
      } catch (_) {}
      // Multi-tenancy: owner column on all user-scoped tables.
      for (const t of TENANT_TABLES) {
        try {
          await adapter.exec(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS user_id INTEGER;`);
        } catch (_) {}
      }
      try {
        await adapter.exec("ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_email_key;");
        await adapter.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_user_email ON accounts(user_id, email);");
      } catch (_) {}
      // Atomic Queue Leasing & Worker fields (H-02, H-03)
      try {
        await adapter.exec("ALTER TABLE queue ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;");
        await adapter.exec("ALTER TABLE queue ADD COLUMN IF NOT EXISTS locked_by TEXT;");
        await adapter.exec("ALTER TABLE queue ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0;");
        await adapter.exec("ALTER TABLE queue ADD COLUMN IF NOT EXISTS last_error TEXT;");
        await adapter.exec("ALTER TABLE queue ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;");
        await adapter.exec("ALTER TABLE queue ADD COLUMN IF NOT EXISTS workspace_id INTEGER;");
        await adapter.exec("CREATE INDEX IF NOT EXISTS idx_queue_atomic_claim ON queue(status, scheduled_at, locked_at);");
      } catch (_) {}

      try {
        await adapter.exec(INDEX_DDL);
      } catch (_) {}
      try {
        await adapter.exec(TENANT_INDEX_DDL);
      } catch (_) {}
      await backfillTenantOwnership(adapter);
      console.log('PostgreSQL database initialised successfully.');
      return adapter;
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        console.error('FATAL: PostgreSQL connection failed in production:', err.message);
        throw new Error(`Production database connection failed: ${err.message}`);
      }
      console.warn('PostgreSQL unavailable, falling back to SQLite in development:', err.message);
    }
  }

  // Fallback to SQLite ONLY in development / test environments if DATABASE_URL is missing (H-06)
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: DATABASE_URL is required in production environment. SQLite fallback is strictly prohibited.');
  }

  {
    console.log('Using local SQLite database in development...');
    const { wrapped } = await createSqliteAdapter();
    await wrapped.exec(SQLITE_DDL);
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN ignore_window INTEGER DEFAULT 0;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE accounts ADD COLUMN daily_limit INTEGER DEFAULT 450;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE contacts ADD COLUMN fields TEXT;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE contacts ADD COLUMN status TEXT DEFAULT 'active';");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaign_recipients ADD COLUMN status TEXT DEFAULT 'active';");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaign_recipients ADD COLUMN current_step INTEGER DEFAULT 1;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaign_recipients ADD COLUMN last_sent_at TEXT;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN total_contacts INTEGER DEFAULT 0;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN sent_count INTEGER DEFAULT 0;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN failed_count INTEGER DEFAULT 0;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN content_variations TEXT;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN content_mode TEXT DEFAULT 'single';");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN body_plain TEXT;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN timezone TEXT DEFAULT 'Africa/Lagos';");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN account_ids TEXT;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN target_limit INTEGER DEFAULT 0;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN target_range_start INTEGER DEFAULT 0;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN target_range_end INTEGER DEFAULT 0;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN exclude_previously_contacted INTEGER DEFAULT 0;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN custom_filters TEXT;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN format_type TEXT DEFAULT 'html';");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN timing_mode TEXT DEFAULT 'smart';");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN min_delay INTEGER DEFAULT 30;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN max_delay INTEGER DEFAULT 90;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN cooldown_enabled INTEGER DEFAULT 1;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN cooldown_batch_size INTEGER DEFAULT 15;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE campaigns ADD COLUMN cooldown_duration_minutes INTEGER DEFAULT 5;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE queue ADD COLUMN fields TEXT;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE queue ADD COLUMN final_subject TEXT;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE queue ADD COLUMN final_body TEXT;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE queue ADD COLUMN retry_count INTEGER DEFAULT 0;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE queue ADD COLUMN step_number INTEGER DEFAULT 1;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE queue ADD COLUMN campaign_step_id INTEGER;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE queue ADD COLUMN opens_count INTEGER DEFAULT 0;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE queue ADD COLUMN clicks_count INTEGER DEFAULT 0;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE logs ADD COLUMN queue_id INTEGER;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE inbox_messages ADD COLUMN message_id TEXT;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE inbox_messages ADD COLUMN thread_id TEXT;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE inbox_messages ADD COLUMN is_starred INTEGER DEFAULT 0;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE inbox_messages ADD COLUMN starred_at TEXT;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE inbox_messages ADD COLUMN status TEXT DEFAULT 'new';");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE ai_config ADD COLUMN is_active INTEGER DEFAULT 0;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE ai_config ADD COLUMN name TEXT DEFAULT 'Primary Key';");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE ai_config ADD COLUMN priority INTEGER DEFAULT 1;");
    } catch (_) {}
    // Email/password authentication columns
    try {
      await wrapped.exec("ALTER TABLE users ADD COLUMN password_hash TEXT;");
    } catch (_) {}
    // Account lockout and email verification columns
    try {
      await wrapped.exec("ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE users ADD COLUMN locked_until TEXT;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE users ADD COLUMN verification_code TEXT;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE users ADD COLUMN verification_code_expires TEXT;");
    } catch (_) {}
    try {
      await wrapped.exec("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'email';");
    } catch (_) {}
    // Workspace/multi-tenant support tables
    try {
      await wrapped.exec(`
        CREATE TABLE IF NOT EXISTS workspaces (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);
    } catch (_) {}
    try {
      await wrapped.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          type TEXT DEFAULT 'info',
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          is_read INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
    } catch (_) {}
    try {
      await wrapped.exec(`
        CREATE TABLE IF NOT EXISTS user_settings (
          user_id INTEGER NOT NULL,
          key TEXT NOT NULL,
          value TEXT,
          updated_at TEXT DEFAULT (datetime('now')),
          PRIMARY KEY (user_id, key),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
    } catch (_) {}
    try {
      await wrapped.exec(`
        CREATE TABLE IF NOT EXISTS workspace_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workspace_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          role TEXT DEFAULT 'member',
          created_at TEXT DEFAULT (datetime('now')),
          UNIQUE(workspace_id, user_id),
          FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
    } catch (_) {}
    try {
      await wrapped.exec(`
        CREATE TABLE IF NOT EXISTS workspace_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workspace_id INTEGER NOT NULL,
          key TEXT NOT NULL,
          value TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          UNIQUE(workspace_id, key),
          FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        );
      `);
      await wrapped.exec(`
        CREATE TABLE IF NOT EXISTS user_column_prefs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          workspace_id INTEGER,
          table_name TEXT NOT NULL,
          column_name TEXT NOT NULL,
          hidden INTEGER DEFAULT 0,
          sort_order INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          UNIQUE(user_id, workspace_id, table_name, column_name),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        );
      `);
      await wrapped.exec(`
        CREATE TABLE IF NOT EXISTS saved_filters (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          workspace_id INTEGER,
          name TEXT NOT NULL,
          entity TEXT NOT NULL DEFAULT 'campaigns',
          filter_json TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          UNIQUE(user_id, workspace_id, name, entity),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        );
      `);
      await wrapped.exec(`
        CREATE TABLE IF NOT EXISTS delegation_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workspace_id INTEGER,
          user_id INTEGER NOT NULL,
          actor_user_id INTEGER,
          action TEXT NOT NULL,
          target_type TEXT,
          target_id INTEGER,
          payload TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        );
      `);
    } catch (_) {}
    for (const t of TENANT_TABLES) {
      try {
        await wrapped.exec(`ALTER TABLE ${t} ADD COLUMN user_id INTEGER;`);
      } catch (_) {}
    }
    try {
      await wrapped.exec(INDEX_DDL);
    } catch (_) {}
    try {
      await wrapped.exec(TENANT_INDEX_DDL);
    } catch (_) {}
    await backfillTenantOwnership(wrapped);
    console.log('SQLite database initialised successfully.');
    return wrapped;
  }
})();

// Export
module.exports = {
  /** Resolves once the DB is ready. Returns the wrapped db object. */
  getDb: () => ready,
  TENANT_TABLES,
  backfillTenantOwnership,
};
