# Phase 5 — Departure Calculation & Station Queries (Core Use Cases) ✅

Implement the main business logic: given origin and destination, find the next departures. Also build station query use cases needed by the bot.

- [x] `SearchNextDepartures.ts` use case:
  1. Receive `originName: string`, `destinationName: string`, `now: Date`
  2. Find origin and destination stations — exact match first, fuzzy fallback, error if ambiguous
  3. Find lines that connect both stations in the correct order (`connectsInOrder`)
  4. Find active schedules for the given date
  5. Find trips departing from origin station after current time
  6. Filter trips by connecting lines and correct stop order
  7. Sort by departure time
  8. Map to `Departure[]` (time, lineName, headsign, minutesUntilDeparture)
  9. Return top N (default: 5)
  10. Publish `DepartureSearched` event
- [x] Handle domain errors: `StationNotFoundError`, `NoActiveServiceError`, `NoConnectionError`
- [x] `Departure.ts` — added `headsign: string | null` param (replacing removed `LineDirection`)
- [x] `TimeOfDay.fromDate(date: Date)` static factory
- [x] **Unit test** `SearchNextDepartures` — 7 scenarios with all ports mocked
- [x] **Component test** with real DB — seeding via repositories directly (not via ImportTransitData + ZIP)
- [x] `SearchStations.ts` use case + unit test (mocked `StationRepository`)
- [x] `ListAllStations.ts` use case + unit test (mocked `StationRepository`)

**Exit criteria**: ✅ `SearchNextDepartures.execute("Colón", "Xàtiva", now)` returns correct departures. 233 tests pass.
