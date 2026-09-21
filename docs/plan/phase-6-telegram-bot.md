# Phase 6 — Telegram Bot ✅

Wire the Telegram bot to the use cases. Users can search departures and list stations.

## 6A — Bot Setup ✅

- [x] `TelegramBot.ts` — grammY bot wrapper: receives token + use cases via constructor, registers handlers and error middleware in `start()`, validates `BOT_TOKEN` at start time (not construction)
- [x] `main.ts` — entry point: `createContainer()` → instantiate use cases with repos → create `TelegramBot` → `bot.start()`
- [x] Container unchanged — only exposes infra (repos, db, eventBus, secrets). Use cases instantiated in entry points (`main.ts`, scripts), not in the container.
- [x] Configure Telegram env vars in the deployment platform: `BOT_TOKEN`, `ADMIN_CHAT_ID`

## 6B — Handlers & Response Format ✅

- [x] `departureHandler.ts` — `/salida <origin> - <destination>` command:
  - Parses station names via `-` separator, `a` separator, or fallback (first word / rest)
  - Calls `SearchNextDepartures` use case
  - Formats response with emoji header, numbered departures (HH:MM, minutes remaining, line)
  - Handles `StationNotFoundError`, `NoConnectionError`, `NoActiveServiceError` with friendly messages
- [x] `stationHandler.ts` — `/paradas` command: lists all station names
- [x] `helpHandler.ts` — `/help` and `/start` commands: fixed help text
- [x] Unit tests for all handlers (12 tests): happy path, separators, missing args, all error types
- [x] **E2E test** for bot commands (real bot flow, real use cases)

**Exit criteria**: ✅ Bot responds to `/salida Xàtiva - Colón` with correct, formatted departure information. `/paradas` and `/help` work. Error messages are clear and friendly.
