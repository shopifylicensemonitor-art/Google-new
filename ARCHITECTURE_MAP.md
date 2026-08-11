# Peak Xender Architecture Map

## 1. System Overview

Peak Xender is a multi-layer application for outbound email outreach. It combines:

- a React/Vite frontend
- an Express backend API
- a database layer with SQLite/PostgreSQL support
- an authentication and tenant middleware layer
- a background sending worker
- AI, tracking, inbox, and PWA/native integration layers

The main idea is:

1. Users interact with the frontend.
2. The frontend calls backend APIs.
3. Backend routes read and write to the database.
4. Campaign launch creates queue items.
5. A background worker processes those queue items and sends emails.
6. Tracking, logs, AI, and inbox features enrich the process.

---

## 2. High-Level Architecture

```text
User / Browser
   |
   v
React Frontend (Vite)
   |
   v
API Client
   |
   v
Express Backend
   |\n   |-- Auth Middleware
   |-- Tenant Middleware
   |-- Route Handlers
   |-- DB Layer
   |
   +--> Database (SQLite / PostgreSQL)
   |
   +--> Scheduler / Worker
   |
   +--> AI Provider
   |
   +--> Tracking Endpoints
   |
   +--> Inbox / Reply Workflow
```

---

## 3. Frontend Layer

### Main entry points
- [gfg-main/src/App.tsx](gfg-main/src/App.tsx)
- [gfg-main/src/main.tsx](gfg-main/src/main.tsx)

### Primary purpose
- Render pages
- Handle routes
- Protect routes behind auth
- Capture OAuth token from redirect
- Call backend APIs

### Main pages
- Landing page
  - [gfg-main/src/pages/Landing.tsx](gfg-main/src/pages/Landing.tsx)
- Login page
  - [gfg-main/src/pages/Login.tsx](gfg-main/src/pages/Login.tsx)
- Send / compose page
  - [gfg-main/src/pages/Index.tsx](gfg-main/src/pages/Index.tsx)
- Dashboard
  - [gfg-main/src/pages/Dashboard.tsx](gfg-main/src/pages/Dashboard.tsx)
- Accounts
  - [gfg-main/src/pages/Accounts.tsx](gfg-main/src/pages/Accounts.tsx)
- Campaigns
  - [gfg-main/src/pages/Campaigns.tsx](gfg-main/src/pages/Campaigns.tsx)
- Contacts
  - [gfg-main/src/pages/Contacts.tsx](gfg-main/src/pages/Contacts.tsx)
- Templates
  - [gfg-main/src/pages/Templates.tsx](gfg-main/src/pages/Templates.tsx)
- Logs
  - [gfg-main/src/pages/Logs.tsx](gfg-main/src/pages/Logs.tsx)
- AI Settings
  - [gfg-main/src/pages/AISettings.tsx](gfg-main/src/pages/AISettings.tsx)
- Inbox
  - [gfg-main/src/pages/Inbox.tsx](gfg-main/src/pages/Inbox.tsx)

### Shared frontend infrastructure
- [gfg-main/src/api.ts](gfg-main/src/api.ts)
  - Central API wrapper
  - Adds auth headers
  - Handles fetch and error parsing
- [gfg-main/src/components/AppShell.tsx](gfg-main/src/components/AppShell.tsx)
  - Shared shell layout
- [gfg-main/src/components/ui](gfg-main/src/components/ui)
  - Reusable UI components

### Frontend data flow
```text
Page -> API client -> Backend route -> DB / external service
```

---

## 4. Backend API Layer

### Entrypoints
- [app.js](app.js)
- [server.js](server.js)

### Responsibilities
- Create Express app
- Register middleware
- Expose public and protected API routes
- Serve frontend build assets
- Expose health and dashboard endpoints

### Core route families
- Auth routes
  - [routes/auth.js](routes/auth.js)
- Account routes
  - [routes/accounts.js](routes/accounts.js)
- Campaign routes
  - [routes/campaigns.js](routes/campaigns.js)
- Contact routes
  - [routes/contacts.js](routes/contacts.js)
- Template routes
  - [routes/templates.js](routes/templates.js)
- Queue routes
  - [routes/queue.js](routes/queue.js)
- AI routes
  - [routes/ai.js](routes/ai.js)
- Inbox routes
  - [routes/inbox.js](routes/inbox.js)
- Tracking routes
  - [routes/tracking.js](routes/tracking.js)

### Backend flow
```text
Request -> Auth middleware -> Tenant middleware -> Route handler -> DB / external service -> Response
```

---

## 5. Authentication and Tenant Layer

### Files
- [middleware/session.js](middleware/session.js)
- [middleware/tenant.js](middleware/tenant.js)
- [routes/auth.js](routes/auth.js)

### Responsibilities
- Verify JWT tokens
- Support PIN fallback for local development
- Resolve the current user identity
- Attach a tenant/user ID to requests
- Ensure each request talks to the correct user-owned data

### Connection to the rest of the app
- Almost every protected route depends on this layer.
- Routes use request.userId to scope data.

### Flow
```text
Frontend sends token/PIN
   -> session middleware validates
   -> tenant middleware resolves user
   -> route handler uses req.userId
```

---

## 6. Database Layer

### Main file
- [db.js](db.js)

### Responsibilities
- Choose between SQLite and PostgreSQL
- Expose a unified async DB API
- Initialize the schema
- Support migrations and table creation
- Manage tenant-aware tables

### Main tables
- accounts
- contacts
- campaigns
- queue
- logs
- templates
- users
- settings
- campaign_steps
- campaign_recipients
- device_states
- ai_config
- ai_rules
- inbox_messages

### Role in the system
The database is the shared source of truth for:
- connected accounts
- contacts and contact lists
- campaigns and campaign state
- queue items and delivery status
- logs and analytics
- AI config and rules

### Data flow
```text
Routes -> DB adapter -> tables -> scheduler / UI reads
```

---

## 7. Account and Provider Integration

### Main file
- [routes/accounts.js](routes/accounts.js)

### Responsibilities
- Connect Gmail accounts via OAuth
- Refresh access tokens
- Create SMTP connections
- Store encrypted credentials
- Test provider connectivity
- Pause/resume/reset accounts

### Supporting file
- [crypto.js](crypto.js)

### Flow
```text
Frontend account page
   -> account route
   -> provider OAuth / SMTP
   -> store credentials in DB
   -> later used by sending worker
```

---

## 8. Contacts and Campaign Lifecycle

### Files
- [routes/contacts.js](routes/contacts.js)
- [routes/campaigns.js](routes/campaigns.js)

### Responsibilities
- Import contacts from CSV or manual input
- Store contact lists and fields
- Create campaigns
- Resolve recipients from contact lists
- Launch campaigns into the queue
- Pause/resume campaigns

### Flow
```text
Contacts imported
   -> stored in contacts table
   -> campaign created
   -> launch resolves recipients
   -> queue rows inserted
```

### Important output
The launch process creates queue items that the scheduler will later process.

---

## 9. Sending Worker / Scheduler

### Main file
- [scheduler.js](scheduler.js)

### Responsibilities
- Process pending queue items
- Check whether the current time is inside the campaign window
- Personalize subject/body content
- Inject open/click tracking
- Send email via Gmail API or SMTP
- Update queue and campaign status
- Retry or fail gracefully
- Mark campaigns complete when no active queue items remain

### Core functions
- isWithinSendingWindow
- getContent
- personalise
- injectTracking
- sendEmail
- processNextItem
- completeCampaignIfNoActiveQueue
- completeEmptySendingCampaigns
- logEvent

### Flow
```text
Queue rows exist
   -> worker picks next pending rows
   -> validates account and timing
   -> personalizes content
   -> sends email
   -> updates queue / campaign / logs
```

### Key dependency chain
```text
Campaign launch -> queue rows -> scheduler -> account credentials -> email delivery
```

---

## 10. Tracking Layer

### Main file
- [routes/tracking.js](routes/tracking.js)

### Responsibilities
- Track opens via a pixel endpoint
- Track clicks via redirect endpoint
- Update queue counters

### Flow
```text
Email sent with tracking URL/pixel
   -> recipient opens/clicks
   -> tracking endpoint handles it
   -> queue stats updated
```

---

## 11. AI Layer

### Main file
- [routes/ai.js](routes/ai.js)

### Responsibilities
- Configure AI provider
- Encrypt and store API keys
- Test AI connection
- Generate email content or variations
- Manage AI rules/knowledge base

### Frontend page
- [gfg-main/src/pages/AISettings.tsx](gfg-main/src/pages/AISettings.tsx)

### Flow
```text
Frontend AI settings page -> backend AI route -> AI provider -> generated content returned to UI
```

---

## 12. Inbox and Reply Layer

### Files
- [routes/inbox.js](routes/inbox.js)
- [gfg-main/src/pages/Inbox.tsx](gfg-main/src/pages/Inbox.tsx)

### Responsibilities
- Store inbound messages
- Organize replies
- Support lead reply workflows
- Display incoming prospect responses

### Flow
```text
Connected account / provider -> inbox data -> backend -> frontend inbox UI
```

---

## 13. PWA and Native Layer

### Files
- [gfg-main/public/sw.js](gfg-main/public/sw.js)
- [gfg-main/capacitor.config.ts](gfg-main/capacitor.config.ts)
- [gfg-main/src/hooks/usePWAInstall.ts](gfg-main/src/hooks/usePWAInstall.ts)
- [gfg-main/src/lib/capacitor.ts](gfg-main/src/lib/capacitor.ts)

### Responsibilities
- Make the app installable as a PWA
- Support native app shell behavior through Capacitor

### Flow
```text
Frontend experience -> PWA/native wrapper -> browser or mobile shell -> backend APIs
```

---

## 14. Billing Layer

### Current state
No active billing system is implemented in the current codebase.

### Evidence
- [gfg-main/saas_roadmap.md](gfg-main/saas_roadmap.md)

### Meaning
Billing is a planned/roadmap feature rather than an active production system.

---

## 15. Core Execution Flow

### End-to-end campaign flow
```text
1. User opens frontend
2. User logs in / authenticates
3. User connects account(s)
4. User imports contacts
5. User creates campaign
6. Campaign launch resolves recipients
7. Queue items are created
8. Scheduler picks queue items
9. Scheduler personalizes and sends emails
10. Tracking, logs, and inbox data are updated
```

### End-to-end request flow
```text
Frontend page
   -> API client
   -> Express route
   -> Auth / Tenant middleware
   -> DB operations
   -> response back to UI
```

---

## 16. Dependency Map by Area

### Frontend dependencies
- [gfg-main/src/App.tsx](gfg-main/src/App.tsx)
- [gfg-main/src/api.ts](gfg-main/src/api.ts)
- [gfg-main/src/pages](gfg-main/src/pages)
- [gfg-main/src/components](gfg-main/src/components)

### Backend dependencies
- [app.js](app.js)
- [routes](routes)
- [middleware](middleware)
- [db.js](db.js)
- [scheduler.js](scheduler.js)

### Shared dependencies
- [crypto.js](crypto.js)
- [logger.js](logger.js)
- [execution](execution)

---

## 17. Suggested Visual Flow Diagrams

### A. Frontend-to-backend flow
```text
Browser Page
  -> API Client
  -> Auth Middleware
  -> Route Handler
  -> DB / External Service
  -> Response
```

### B. Campaign flow
```text
Contacts + Account + Template
  -> Campaign Create
  -> Campaign Launch
  -> Queue Items
  -> Scheduler
  -> Email Send
  -> Logs / Tracking / Inbox
```

### C. Sending worker flow
```text
Queue Item
  -> Check Window
  -> Verify Account
  -> Personalize Content
  -> Inject Tracking
  -> Send Email
  -> Mark Sent / Retry / Fail
```

### D. Auth flow
```text
Login Page
  -> Auth Route
  -> JWT/PIN Validation
  -> Tenant Resolution
  -> Protected API Access
```

---

## 18. Key Files to Study First

If you want to understand the system quickly, start with these files:

- [gfg-main/src/App.tsx](gfg-main/src/App.tsx)
- [gfg-main/src/api.ts](gfg-main/src/api.ts)
- [app.js](app.js)
- [routes/campaigns.js](routes/campaigns.js)
- [routes/accounts.js](routes/accounts.js)
- [scheduler.js](scheduler.js)
- [db.js](db.js)
- [middleware/session.js](middleware/session.js)
- [middleware/tenant.js](middleware/tenant.js)

---

## 19. Notes on Current State

### Working areas
- frontend routing
- auth middleware
- account integration flow
- campaign lifecycle
- queue-based sending
- tracking and AI support

### Areas that appear incomplete or planned
- billing
- some native/PWA polish
- potential duplication between product and marketing UI layers

---

## 20. Short Summary

The system is built around a simple but effective chain:

```text
Frontend -> Backend -> Database -> Queue -> Worker -> Email delivery
```

The most important supporting layers are:
- auth/tenant resolution
- account credential handling
- campaign queue generation
- background sending worker
- tracking and inbox support
