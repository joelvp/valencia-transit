# Phase 8 — UX & Usability ✅

Improve the bot's user experience: fuzzy search, command menu, line colors, disambiguation, HTML formatting, and graceful "no more trains" messages.

## 8A — Fuzzy Station Search (pg_trgm) ✅

- [x] Hand-written SQL migration: `CREATE EXTENSION IF NOT EXISTS pg_trgm` + GIN index on `stations.name`
- [x] Update `StationRepositoryDrizzle.searchByName` — trigram similarity + `ILIKE` fallback, ordered by relevance
- [x] Integration tests: fuzzy matches ("Xativa" → "Xàtiva", "nou octubre" → "Nou d'Octubre")

## 8B — "Did you mean...?" with Inline Keyboards ✅

- [x] `SearchNextDepartures` returns discriminated union: `departures | disambiguation | no_more_today`
- [x] `departureHandler` — show inline keyboard with station candidates on ambiguity
- [x] `callbackHandler` — handle button press, re-run search with resolved station, conversational wizard flow
- [x] Register callback handler in `TelegramBot`

## 8C — Command Menu (setMyCommands) ✅

- [x] `bot.api.setMyCommands()` in `TelegramBot.start()`, per-chat scopes for language variants

## 8D — Alias `/s` for `/salida` ✅

- [x] `/s` registered as alias command

## 8E — Line Colors ✅

- [x] `LineColor` VO — validates hex color (6 chars, no `#` prefix)
- [x] `Line` entity — `color: LineColor | null`
- [x] Schema: `color` column in `lines` table
- [x] `LineMapper`, `GtfsParser` updated
- [x] `GetLineStations`, `ListLines` use cases with terminal stations and color emojis

## 8F — Improved Departure Format (HTML) ✅

- [x] All handlers use `{ parse_mode: "HTML" }`
- [x] Departures formatted with bold times, line color emojis, duration suffix

## 8G — "No More Trains Today" ✅

- [x] `SearchResult` with `no_more_today` variant including first tomorrow departure
- [x] `departureHandler` — friendly message with next day's first train

**Exit criteria**: ✅ Fuzzy search works, command menu visible, disambiguation with buttons, HTML-formatted responses, stations show line colors, graceful handling of last train.
