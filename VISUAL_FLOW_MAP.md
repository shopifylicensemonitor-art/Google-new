# Peak Xender Visual Flow Map

This file contains Mermaid-based flow diagrams for the main systems and workflows in the project.

---

## 1. High-Level System Flow

```mermaid
flowchart TD
    A[User Browser] --> B[React Frontend]
    B --> C[API Client]
    C --> D[Express Backend]
    D --> E[Auth / Tenant Middleware]
    E --> F[Routes]
    F --> G[Database]
    F --> H[Scheduler / Worker]
    F --> I[AI Provider]
    F --> J[Tracking Endpoints]
    F --> K[Inbox / Reply Workflow]
```

---

## 2. Frontend to Backend Request Flow

```mermaid
flowchart LR
    P1[Page Component] --> P2[API Client]
    P2 --> P3[Express Route]
    P3 --> P4[Auth Middleware]
    P4 --> P5[Tenant Middleware]
    P5 --> P6[DB / External Service]
    P6 --> P7[Response to UI]
```

---

## 3. Authentication Flow

```mermaid
flowchart TD
    A[Login Page] --> B[Auth Route]
    B --> C{JWT or PIN?}
    C -->|JWT| D[Verify JWT]
    C -->|PIN| E[Verify PIN]
    D --> F[Tenant Resolution]
    E --> F
    F --> G[Protected API Access]
```

---

## 4. Campaign Lifecycle Flow

```mermaid
flowchart TD
    A[Import Contacts] --> B[Create Campaign]
    B --> C[Launch Campaign]
    C --> D[Resolve Recipients]
    D --> E[Insert Queue Items]
    E --> F[Scheduler Processes Queue]
    F --> G[Send Emails]
    G --> H[Update Logs / Tracking / Status]
```

---

## 5. Sending Worker Flow

```mermaid
flowchart TD
    A[Queue Item] --> B[Check Sending Window]
    B --> C[Verify Sender Account]
    C --> D[Personalize Content]
    D --> E[Inject Tracking]
    E --> F[Send Via Gmail API or SMTP]
    F --> G{Success?}
    G -->|Yes| H[Mark Sent]
    G -->|No| I[Retry or Fail]
    H --> J[Update Campaign / Queue]
    I --> J
```

---

## 6. Account Connection Flow

```mermaid
flowchart TD
    A[Accounts Page] --> B[Account Route]
    B --> C[OAuth or SMTP Setup]
    C --> D[Token / Credentials Handling]
    D --> E[Store Account in DB]
    E --> F[Account Ready for Sending]
```

---

## 7. AI Workflow Flow

```mermaid
flowchart TD
    A[AI Settings Page] --> B[AI Config Route]
    B --> C[Encrypt API Key]
    C --> D[Store AI Config]
    D --> E[Generate Content]
    E --> F[Return Generated Content to UI]
```

---

## 8. Tracking Flow

```mermaid
flowchart TD
    A[Email Sent] --> B[Tracking URL / Pixel Added]
    B --> C[Recipient Opens or Clicks]
    C --> D[Tracking Endpoint]
    D --> E[Update Queue Counters]
```

---

## 9. Inbox / Reply Flow

```mermaid
flowchart TD
    A[Incoming Message] --> B[Inbox Route]
    B --> C[Store Message Data]
    C --> D[Inbox UI]
    D --> E[Reply Draft / Lead Workflow]
```

---

## 10. PWA / Native Wrapper Flow

```mermaid
flowchart TD
    A[Frontend App] --> B[PWA / Capacitor Wrapper]
    B --> C[Browser or Mobile Shell]
    C --> D[Backend APIs]
```

---

## 11. Core Data Model Relationship Flow

```mermaid
flowchart TD
    U[Users] --> A[Accounts]
    U --> C[Campaigns]
    U --> T[Templates]
    U --> CT[Contacts]
    C --> Q[Queue]
    C --> L[Logs]
    C --> CR[Campaign Recipients]
    A --> Q
    CT --> C
```

---

## 12. Suggested Visual Narrative

If you want to narrate this system live, use this order:

1. Start with the high-level system flow
2. Show the auth flow
3. Show the campaign lifecycle
4. Show the sending worker flow
5. Show tracking and inbox integration
6. End with the data model relationships
