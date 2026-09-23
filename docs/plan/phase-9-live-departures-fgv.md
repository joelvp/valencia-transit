# Phase 9 — Live Departures (FGV real-time provider)

> Sequential phase: one part per branch/PR, reviewed and merged before the next starts. No parallel execution. Each part below names the single subagent responsible for it (see `CLAUDE.md` § Agent Delegation).

Add an optional live-data source (Metrovalencia/FGV's undocumented real-time endpoint) on top of the existing GTFS-static departure search, with graceful fallback to scheduled data. Static GTFS remains the source of truth for station/line connectivity and ordering (FGV's own `lineas.stops` is not reliably ordered — see `/home/joelvp/Work/fgv/SESSION_SUMMARY.md`); the live endpoint only supplies fresher "minutes remaining" for trains already confirmed valid by our own static line/direction resolution.

Research context (do not re-derive, read first): `/home/joelvp/Work/fgv/SESSION_SUMMARY.md`, `/home/joelvp/Work/fgv/fgv-api-notes.md`, `/home/joelvp/Work/fgv/fgv_stations.json`.

## 9A — Domain: live-departure port + source-aware `Departure`

**Agent: `domain-expert`**

- [ ] `LiveDepartureProvider` port (interface) in `core/domain/shared/` (or a new `core/domain/departure/` folder if it grows) — method to fetch live arrivals for a given `StationId`, returning a domain-shaped result (line reference, headsign/destination, minutes remaining). No FGV vocabulary (`seconds`, `previsiones`, `vehicle`) leaking past the port boundary.
- [ ] `Departure` gains a `source` discriminant (`'live' | 'scheduled'`) — decide VO vs. plain union type; current constructor is already 6 positional params (`Departure.ts:6-13`), consider whether this is the point to move to a options object.
- [ ] `SearchNextDepartures` takes a new **optional** constructor dependency `liveDepartureProvider?: LiveDepartureProvider`. With it absent, behavior must be byte-for-byte identical to today (existing tests keep passing unmodified).
- [ ] Inside `execute()`, after `matchingLines`/`filteredTrips` are computed (unchanged): if a live provider is injected, try it (wrapped so any failure falls back silently, per design-principles.md #8 fail-safe); filter live results to `line_id ∈ matchingLineIds` AND headsign/destino matching the direction already validated by `filteredTrips`; sort by minutes remaining; if fewer than `maxDepartures` valid live results, top up with the existing static-derived departures (marked `source: 'scheduled'`); if still short, existing `firstTomorrow` logic applies unchanged.
- [ ] Split into private helper methods (e.g. `tryLiveDepartures()`, `buildScheduledDepartures()`) rather than one branchy `execute()`.
- [ ] Unit tests: `SearchNextDepartures` with `liveDepartureProvider` mocked — scenarios: live returns ≥5 valid matches (all live), live returns <5 (live + scheduled top-up), live throws (pure scheduled fallback, unchanged behavior), no provider injected (unchanged behavior — regression guard).

**Exit criteria**: port + updated use case merge with full test coverage; no adapter exists yet, everything is mocked; existing `SearchNextDepartures` tests still pass unmodified.

## 9B — Adapters: FGV station-id mapping + live HTTP adapter

**Agent: `adapters`**

- [ ] Migration: `fgv_station_ids` table (`station_id` FK → `stations`, `fgv_station_id`, `updated_at`). Scoped to FGV only — no speculative `provider` column (see chat decision: EMT/Renfe would be different stations entirely, not a remap of the same ones; generalize later only if a second provider hits the same live-id-vs-GTFS-id mismatch).
- [ ] `scripts/sync-fgv-station-ids.ts` — `GET /estaciones` (public, no session needed — see `/home/joelvp/Work/fgv/fgv-api-notes.md`), match against our `StationRepository` by normalized name + coordinate proximity (`StationLocation`), upsert into `fgv_station_ids`. Log/report any FGV station without a confident match instead of silently mismapping.
- [ ] `LiveDepartureProviderFgv.ts` — implements `LiveDepartureProvider` from 9A:
  - Session bootstrap (`comprobar-version-minima-v2` or a catalogue `GET` — verify which still works, FGV changed session requirements around 2026-09-21) + cookie reuse + reset-and-retry-once on expiry.
  - Resolves `StationId` → `fgv_station_id` via the mapping table (repository from this same part).
  - Calls `horarios-prevision-3/{fgv_station_id}`, maps `previsiones[].trains[]` to the port's domain-shaped return type.
  - Honest `User-Agent` identifying our bot and a contact point — never spoofs the official app in production code (see "FGV usage & legal note" below).
- [ ] Tests: mock the HTTP layer (undocumented third-party endpoint — do not hit the real FGV API in CI; this isn't "our own infra" per the testing-conventions table, treat as a unit test with a fake HTTP client, not a true integration test). Cover: session priming, cookie reuse across calls, retry-once on session expiry, station-id resolution, mapping/parsing.
- [ ] `provider-fgv/NOTES.md` (or similar, co-located with the adapter) — short, public write-up of which FGV endpoints we call, why, and the legal reasoning below, so the usage is documented in the open rather than left implicit in code.

**Exit criteria**: `LiveDepartureProviderFgv` works standalone (verifiable via a throwaway script against the real endpoint), fully unit-tested with mocked HTTP, not yet wired into the bot.

### FGV usage & legal note

`horarios-prevision-3` is undocumented (built for FGV's own app, not published as a public API), so this gets documented in the open rather than hidden:

- FGV is a public body (Generalitat Valenciana); the data is transit information of clear public interest. Reuse of public-sector information is favoured by the EU PSI Directive (2003/98/EC, amended 2013/37/EU), transposed in Spain by Ley 37/2007, and the EU ITS Directive (2010/40/EU) specifically pushes for open travel data via National Access Points.
- No authentication is bypassed and no access control is circumvented (Código Penal art. 197 bis requires exactly that to apply) — the endpoint answers anonymous, unauthenticated requests, same as any visitor's browser or the official app.
- Endpoints touching personal or financial data (`tarjetas*`, `usuarios/*`, `mensajes/*`, purchase/account flows) are out of scope and never called.
- Mitigations we commit to, mirroring how we'd want a third party to treat our own service: an honest `User-Agent` identifying the bot and a contact address (never impersonating the official app), conservative polling (`arrivalsPollMs`-style throttling, no tighter than the bot actually needs), and isolating the FGV-specific client entirely behind the `LiveDepartureProvider` port so it can be swapped or disabled without touching the rest of the app if FGV ever objects.

## 9C — Adapters: DI wiring + Telegram live/scheduled labeling

**Agent: `adapters`**

- [ ] Wire `LiveDepartureProviderFgv` into `container.ts` / `main.ts` per the existing composition-root convention.
- [ ] Public config flag (`src/config/environments/`) to disable live fetching entirely without a deploy — fail-safe kill switch for an undocumented endpoint we don't control.
- [ ] Telegram handler: label each departure line by `source` (e.g. 🔴 en directo vs 📅 previsto); the "next metro tomorrow morning" message already exists via `firstTomorrow`/`no_more_today` — verify it still reads correctly when the preceding departures came from live data.

**Exit criteria**: live data visible end-to-end in the real bot, clearly labeled, degrades silently to today's behavior if the FGV endpoint is down or the config flag is off.

## 9D — Cross-cutting verification

**Agent: `test-engineer`**

- [ ] Component test: `SearchNextDepartures` + real DB + `LiveDepartureProviderFgv` with mocked HTTP responses — full merge/fallback scenarios (live ≥5, live <5 with scheduled top-up, live failure) against real station/schedule data, not just mocked ports.
- [ ] Verify fail-safe behavior end-to-end: FGV endpoint erroring must never surface an error to the Telegram user, only silently fall back (principle 8).

**Exit criteria**: full phase verified against real DB + real domain data, not just unit-level mocks. Ready to close the phase.
