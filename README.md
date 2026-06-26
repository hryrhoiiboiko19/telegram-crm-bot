# Telegram CRM Bot

A CRM (Customer Relationship Management) Telegram bot for service businesses. The bot handles customer order intake through step-by-step conversations, provides an admin panel for order management, and exports data to Google Sheets.

## Features

### Customer-facing

- **Step-by-step order intake** — guided conversation collects service type, problem description, and phone number
- **Input validation (Zod)** — strict validation of all user input; invalid data triggers a retry prompt instead of polluting the database
- **Multi-language support** — English and Ukrainian locales, auto-selected from the user's Telegram language code
- **Order status notifications** — users receive a Telegram message when their order is confirmed or cancelled

### Admin panel (`/admin`)

- **View pending orders** — paginated list of orders with inline keyboard buttons
- **Confirm / cancel orders** — one-click status updates with automatic customer notification
- **Business analytics (`/stats`)** — aggregated metrics: pending/confirmed/completed/cancelled counts, conversion rate, most popular service
- **Broadcast (`/broadcast`)** — send a message to all registered users (rate-limited at 50ms/user to avoid Telegram Flood Wait)
- **Google Sheets export** — one-click export of all orders to a Google Spreadsheet via Apps Script webhook
- **Admin access control** — restricted to whitelisted Telegram user IDs

### Reliability & Security

- **Error boundary middleware** — global `bot.catch` handler intercepts crashes, logs stack traces, and replies a localized error message so the UI never freezes for the user
- **Logger with profiling** — `Logger.profile(label)` returns a closure that logs elapsed time of critical operations (e.g. Google Sheets export)
- **Rate limiting (Redis-based)** — max 3 requests/second per user via Redis `INCR`/`EXPIRE`; spam is blocked before any handler runs
- **Background notification queue (BullMQ)** — order status notifications are queued and processed asynchronously with exponential backoff retry (3 attempts)

## Tech Stack

| Layer           | Technology                                  |
| --------------- | ------------------------------------------- |
| Bot framework   | [grammY](https://grammy.dev/)               |
| ORM             | [Drizzle ORM](https://orm.drizzle.team/)    |
| Database        | PostgreSQL 17                               |
| Cache / Queue   | Redis 7 + [BullMQ](https://docs.bullmq.io/) |
| Validation      | [Zod](https://zod.dev/)                     |
| Session storage | Redis (`@grammyjs/storage-redis`)           |
| i18n            | `@grammyjs/i18n` (Fluent)                   |
| Runtime         | Node.js 20 + TypeScript                     |

## Project Structure

```
src/
├── bot/
│   ├── bot.ts                    # Bot setup, middleware chain, command routing
│   ├── conversations/           # Step-by-step order conversation
│   ├── handlers/
│   │   ├── admin.ts             # Admin panel, export, stats, broadcast
│   │   ├── admin-orders.ts      # Order viewing, confirm/cancel, pagination
│   │   ├── admin-keyboard.ts    # Inline keyboard builders
│   │   ├── commands.ts          # /start handler
│   │   └── order.ts             # /order command entry
│   ├── middlewares/
│   │   ├── rateLimit.middleware.ts   # Redis rate limiting (3 req/s)
│   │   ├── error.middleware.ts       # Global error boundary
│   │   ├── i18n.middleware.ts        # i18n setup
│   │   └── logger.middleware.ts      # Request logging
│   ├── locales/                 # Fluent translation files (en, uk)
│   └── ...
├── database/
│   ├── schema.ts                # Drizzle table definitions
│   └── validation.ts            # Zod schemas (UserInsert, OrderInsert)
├── repositories/                # Data access layer
├── services/                    # Google Sheets export, notifications
├── queue/                       # BullMQ queue + worker
├── utils/logger/                # Logger with profile() method
└── config/                      # Environment + database config
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### Setup

1. **Clone and install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Fill in your `.env` — see `.env.example` for descriptions of each variable.

3. **Run with Docker**

   ```bash
   docker-compose up --build
   ```

   This starts PostgreSQL, Redis, and the bot together.

4. **Run database migrations**

   ```bash
   npm run db:push    # push schema directly
   # or
   npm run db:generate && npm run db:migrate
   ```

5. **Local development** (without Docker)
   ```bash
   npm run dev
   ```

### Bot Commands

| Command                | Who      | Description                                |
| ---------------------- | -------- | ------------------------------------------ |
| `/start`               | Everyone | Registers the user in the database         |
| `/order`               | Everyone | Starts the step-by-step order conversation |
| `/admin`               | Admins   | Opens the admin panel with inline buttons  |
| `/stats`               | Admins   | Shows business analytics report            |
| `/broadcast <message>` | Admins   | Sends a message to all users               |

## Google Sheets Integration

The bot exports orders to a Google Spreadsheet via an Apps Script Web App. To set it up:

1. Create a Google Spreadsheet with a sheet named **"Orders"**.
2. Open **Extensions → Apps Script** and paste the following code:

```javascript
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var rowsToInsert = payload.data;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Orders");

    if (rowsToInsert && rowsToInsert.length > 0) {
      for (var i = 0; i < rowsToInsert.length; i++) {
        var currentOrderRow = rowsToInsert[i];
        var finalRowData = [new Date()].concat(currentOrderRow);
        sheet.appendRow(finalRowData);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.toString()}))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. **Deploy** as a Web App (`Deploy → New deployment → Web app`) with access set to "Anyone".
4. Copy the deployment URL and set it as `GOOGLE_SHEETS_WEBHOOK_URL` in your `.env`.

> Each exported row is written as: `Timestamp | Order ID | User ID | Service Type | Description | Status`

## AI Development Disclosure

This project was developed using **LLM-assisted coding** — a combination of:

- **[LLM-Chat](https://gemini.google.com)** for architectural planning, pseudocode generation, and code review
- **[Agent Coding](https://opencode.ai)** (autonomous CLI agent powered by LLMs) for implementation, refactoring, and iterative debugging

All generated code was reviewed, tested, and adjusted by the developer. LLMs assisted with:

- Designing the Zod validation layer and conversation flow
- Implementing the Redis-based rate limiter and error boundary middleware
- Refactoring the admin handler into focused modules
- Writing locale files and ensuring consistent i18n key usage
- Generating this README

## License

MIT
