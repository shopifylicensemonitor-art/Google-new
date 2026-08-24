# Peak Xender Architecture & Build Policies

This document establishes the mandatory architectural, security, multi-tenancy, and code quality policies governing the Peak Xender codebase. All agents and developers must strictly follow these rules.

---

## 1. Multi-Tenancy & Tenant Data Isolation (CRITICAL)

- **Mandatory User Scoping (`user_id`)**:
  - Every SQL query accessing user data (`accounts`, `campaigns`, `contacts`, `campaign_recipients`, `queue`, `logs`, `inbox_messages`, `ai_config`, `ai_rules`, `templates`, `suppression_list`) **MUST** filter by `user_id = ?` (or join on an owned parent resource like `c.user_id = ?`).
  - **NEVER** perform an unbounded `SELECT`, `UPDATE`, or `DELETE` across tenant tables.
  - **Account & Prospect Isolation**: One user connecting an account or uploading a prospect list must never overwrite, view, or link to another user's rows. Lookups on emails/domains must include `AND user_id = ?`.

- **Authorization Defaults**:
  - Newly created users must default to `role = 'user'`. The `'admin'` role must be granted explicitly and must not automatically bypass user scoping unless performing administrative platform health checks.
  - All `/api/*` endpoints (excluding public RFC 8058 unsubscribe and tracking pixels in `routes/tracking.js`) must be protected by `authenticateSession` middleware.

- **Legacy Data Migration & Backfill Safety**:
  - Auto-backfilling orphan rows to user #1 is only permitted if there is strictly **one** user in the system (`COUNT(*) === 1`). In multi-user setups, unowned rows must remain isolated.

---

## 2. Security & Credentials Policy

- **Credential Encryption**:
  - All sensitive keys (AI API keys, SMTP passwords, OAuth refresh tokens) stored in the database must be encrypted using AES-256-GCM (`crypto.js` or `encryptKey` helpers).
  - Never log plaintext tokens, API keys, or raw email payloads in production logs.

- **Safe Rate Limiting & Input Validation**:
  - Auth and public endpoints must use rate-limiting (`express-rate-limit`) to prevent brute-force attacks.
  - Password strength validation and email sanitization must be enforced on registration and updates.

---

## 3. Database Compatibility & Schema Standards

- **Dual Engine Compatibility (PostgreSQL + SQLite)**:
  - Code must remain compatible with both PostgreSQL (Supabase) and local SQLite (`better-sqlite3`).
  - Always use parameterized queries (`?` or `$1`) — never concatenate raw user input into SQL strings.
  - Ensure all new tables have `user_id` columns with indexes on `(user_id)` for high-performance multi-tenant querying.

---

## 4. Background Workers & Queue Management

- **Isolated Dispatching**:
  - Background workers (`scheduler.js`) must process queue items according to the campaign owner's active sending accounts only.
  - Synchronizing contact lists to active campaigns must strictly query accounts where `user_id = campaign.user_id`.
  - Recipient lifecycle updates upon incoming replies must join with `campaigns` to verify campaign ownership before updating status.

---

## 5. Frontend & API Client Architecture

- **Token Attachment**:
  - All API calls in `gfg-main/src/api.ts` must use `apiFetch` or attach `Authorization: Bearer <token>`.
  - Local state and cached data must be cleared upon user logout.

- **Component & Build Verification**:
  - All UI changes must build cleanly via `npm run build` with zero TypeScript or JSX compile errors.
  - Design aesthetics must follow the modern Tailwind/CSS glassmorphism dark-theme standards with rich feedback states.
