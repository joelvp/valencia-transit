# PLAN.md — valencia-transit Project Roadmap

## Goal

Build a transit information system for Valencia's metro. Given an origin and destination station, return the next departures with line, time, and minutes remaining. Initially served via a Telegram bot. Designed to grow into a multi-transport, multi-interface platform.

---

## Tech Stack

| Layer         | Technology                                      | Rationale                                                                  |
| ------------- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| Language      | TypeScript (strict)                             | Type safety, modern ecosystem, single language for all layers              |
| Runtime       | Bun                                             | Fast startup, built-in test runner, Node-compatible                        |
| Bot Framework | grammY                                          | Modern Telegram framework for TS, typed, composable middleware             |
| Database      | PostgreSQL                                      | Solid relational DB, good for schedule queries, `pg_trgm` for fuzzy search |
| ORM / Query   | Drizzle ORM                                     | Type-safe, lightweight, schema-as-code, built-in migrations                |
| Linting       | ESLint + `eslint-plugin-hexagonal-architecture` | Enforce architecture boundaries at lint time                               |
| Formatting    | Prettier                                        | Consistent code style                                                      |
| Deployment    | Railway                                         | Git-based deploy, Postgres included, free tier                             |
| CI/CD         | GitHub Actions                                  | Lint, test, deploy pipeline                                                |

---

## GTFS Data Source

- **Portal**: NAP (National Access Point) — Spanish Ministry of Transport
- **URL**: <https://nap.transportes.gob.es/Files/Detail/967>
- **Format**: GTFS (ZIP with CSVs) — ~2.12 MB
- **Login required**: Yes (credentials stored as env vars, never committed)
- **Volume**: ~144 stops, ~206 routes, ~21,695 trips, ~200K stop_times
- **Validity period**: Typically 4-5 months per dataset
- **Key files**: `stops.txt`, `routes.txt`, `trips.txt`, `stop_times.txt`, `calendar.txt`, `calendar_dates.txt`

---

## Phases

### Phase 0 — Project Scaffold & Tooling ✅

Set up the project from scratch with all tooling, configuration, and folder structure. No business logic yet — just a compilable, lintable, testable skeleton.

- [x] Initialize Bun + TypeScript project
  - `bun init`, `tsconfig.json` with strict mode, ESNext, bundler module resolution
  - Path aliases: `@/` → `src/`
- [x] Install dependencies
  - Production: `grammy`, `drizzle-orm`, `postgres`
  - Dev: `drizzle-kit`, `eslint`, `prettier`, `typescript-eslint`, `eslint-config-prettier`, `eslint-plugin-hexagonal-architecture`, `@eslint/js`
  - Note: Downgraded ESLint to v9 for compatibility with hexagonal-architecture plugin
- [x] Configure ESLint
  - `@typescript-eslint/recommended` + strict rules
  - `eslint-plugin-hexagonal-architecture` with `enforce-boundaries` rule
  - `eslint-config-prettier` to avoid conflicts
  - Excluded `src/main.ts` and `scripts/**/*.ts` from hexagonal enforcement (entry points)
- [x] Configure Prettier (semicolons, double quotes, trailing commas, 100 chars)
- [x] Create folder structure (empty files with `index.ts` barrels where needed):

  ```text
  src/core/domain/{station,line,schedule,trip,shared,event,error}/
  src/core/application/{departure,import,station,analytics}/
  src/adapters/in/telegram/handlers/
  src/adapters/out/persistence/drizzle/mappers/
  src/adapters/out/transit-data/
  src/adapters/out/event-bus/
  src/adapters/out/notification/
  src/config/
  src/main.ts
  tests/e2e/
  ```

- [x] Docker Compose for local Postgres 17
  - DB: `metrovalencia`, user: `metro`, pass: `metro`, port: 5432
  - Removed obsolete `version` field
- [x] `.env.example` with all required env vars (no real values)
- [x] `.env` with real values for local development (DATABASE_URL pointing to Docker Compose Postgres, placeholders for credentials)
- [x] `.gitignore` covering: `.env`, `node_modules/`, `dist/`, `data/gtfs/`, `CLAUDE.md`, `PLAN.md`, `CHANGELOG.md`
- [x] `package.json` scripts: `dev`, `lint`, `format`, `test`, `db:generate`, `db:migrate`, `db:studio`
- [x] Smoke test: verify `tsc --noEmit`, `bun run lint`, `bun test` all pass on empty project
- [x] First commit + GitHub repo

**Exit criteria**: ✅ Project compiles, lints, and runs an empty test suite. Folder structure in place. Docker Compose starts Postgres.

---

### Phase 1 — Domain Model (Entities + Value Objects + Tests)

Build the core domain layer: entities, value objects, and domain errors. Pure business logic, zero infrastructure dependencies. Entities and VOs with meaningful logic have co-located unit tests. Simple VOs (string wrappers) are covered by a shared base class test.

#### 1A — Value Objects ✅

**Base class (shared):**

- [x] `StringValueObject` — abstract base for all simple string VOs: non-empty validation + `equals()`. Lives in `shared/`.
- [x] `StringValueObject.test.ts` — tests validation (empty, whitespace) and equality. Covers all child VOs below.

**Simple string VOs (extend `StringValueObject`, no individual tests needed):**

- [x] `StationId`
- [x] `StationName`
- [x] `LineId`
- [x] `LineName`
- [x] `ScheduleId`
- [x] `TripId`

**Simple composite/enum VOs (no logic, no tests needed):**

- [x] `LineDirection` — enum: `OUTBOUND` | `INBOUND`
- [x] `LineStop` — composite VO: `StationId` + `sequence: number`
- [x] `PassingTime` — composite VO: `StationId` + `arrivalTime: TimeOfDay` + `departureTime: TimeOfDay` + `sequence: number`
- [x] `ScheduleException` — VO: `date: string` + `isActive: boolean`, with trivial `isServiceAdded()` / `isServiceRemoved()` (tested indirectly via `Schedule.test.ts`)

**VOs with meaningful logic (need their own co-located tests):**

- [x] `StationLocation` — latitude (-90 to 90), longitude (-180 to 180), validated in constructor
  - `StationLocation.test.ts` — boundary tests: valid ranges, exact limits, out of range
- [x] `Weekdays` — flags or bitmask for Mon-Sun, with `isActiveOnDay(dayOfWeek)` method
  - `Weekdays.test.ts` — each weekday flag, all active, none active, weekend-only
- [x] `DateRange` — start + end date strings, with `contains(date)` method
  - `DateRange.test.ts` — inside range, outside range, exact boundaries, edge cases
- [x] `TimeOfDay` — HH:MM:SS string with validation, `isAfter()`, `isBefore()`, `minutesUntilFrom()` methods
  - `TimeOfDay.test.ts` — comparison, parsing, >24:00:00 edge case (GTFS next-day trips), midnight boundary
- [x] `Departure` — computed VO: `departureTime: TimeOfDay`, `lineName: string`, `direction: LineDirection`, `minutesRemaining: number`
  - `Departure.test.ts` — minutesRemaining calculation

**Domain errors:**

- [x] `DomainError` — abstract base class for all domain errors (extends `Error`, adds structured fields)
- [x] `InvalidArgumentError` — VO validation failures (extends `DomainError`)
- [x] `StationNotFoundError` — station name/ID doesn't match any known station (extends `DomainError`)
- [x] `NoActiveServiceError` — no schedule is active for the queried date (extends `DomainError`)
- [x] `NoConnectionError` — no line connects origin and destination in order (extends `DomainError`)

#### 1B — Entities ✅

- [x] `Station` — aggregate root. Constructor takes VOs. Factory method `create()` with validation.
- [x] `Line` — aggregate root. Contains `LineStop[]`. Methods:
  - `connectsInOrder(origin: StationId, destination: StationId): boolean`
  - `getSequence(stationId: StationId): number | undefined`
  - `stopsAfter(stationId: StationId): LineStop[]`
- [x] `Schedule` — aggregate root. Contains `Weekdays`, `DateRange`, `ScheduleException[]` (all VOs). Methods:
  - `isActiveOn(date: Date): boolean` (checks weekday + date range + exceptions)
- [x] `Trip` — aggregate root. Contains `PassingTime[]`, references `LineId`, `ScheduleId`. Methods:
  - `getDepartureTimeAt(stationId: StationId): TimeOfDay | undefined`
  - `passesThrough(stationId: StationId): boolean`
  - `stopsInOrder(origin: StationId, destination: StationId): boolean`
- [x] Unit tests for every entity (behavior methods, edge cases, invalid states)

#### 1C — Ports (Interfaces) ✅

- [x] `StationRepository` — `findById(id: StationId)`, `findByName(name: string)`, `searchByName(query: string)`, `findAll()`
- [x] `LineRepository` — `findById(id: LineId)`, `findByStations(origin: StationId, destination: StationId)`, `findAll()`
- [x] `ScheduleRepository` — `findById(id: ScheduleId)`, `findActiveOn(date: Date)`
- [x] `TripRepository` — `findByLineAndSchedule(lineId: LineId, scheduleId: ScheduleId)`, `findDeparturesFromStation(stationId: StationId, after: TimeOfDay, activeScheduleIds: ScheduleId[])`
- [x] `EventBus` — `publish(event: DomainEvent)`, `subscribe(eventName: string, handler: EventHandler)`

#### 1D — Domain Events ✅

- [x] `DomainEvent` — abstract base: `eventId`, `occurredOn`, `eventName`
- [x] `DepartureSearched` — origin, destination, resultsCount, searchedAt
- [x] `DatasetImported` — stationsCount, linesCount, tripsCount, importedAt

**Exit criteria**: ✅ All domain code compiles with zero infrastructure imports. All entity/VO tests pass. Domain layer is a self-contained, testable unit.

---

### Phase 2 — CI/CD & Railway Deployment

Set up continuous integration with GitHub Actions and continuous deployment to Railway via Dockerfile. At this stage there's no database — CI runs lint, format check, typecheck, and unit tests. Railway deploys the app container (which just prints "Starting...").

#### 2A — GitHub Actions CI

- [x] `.github/workflows/ci.yml` — runs on PRs to `dev` and `main`:
  - `bun install --frozen-lockfile`
  - `bun run format:check`
  - `bun run lint`
  - `bun x tsc --noEmit`
  - `bun test`
- [ ] Branch protection on `dev` and `main` (require CI green to merge)

#### 2B — Dockerfile & Docker Compose

- [x] `Dockerfile` — portable app container (Bun runtime)
  - Works on Railway, VPS, Fly.io, any Docker host
- [x] `.dockerignore` — exclude node_modules, .env, data, etc.
- [x] `docker-compose.yml` updated with `app` service
  - `docker-compose up` starts app + postgres locally
  - App depends on postgres healthcheck

#### 2C — Railway Deployment

- [ ] Create Railway project with 2 environments: `staging` (branch `dev`), `production` (branch `main`)
- [ ] Add Postgres addon in each environment
- [ ] Configure env vars: `APP_ENV`, `BOT_TOKEN`, `ADMIN_CHAT_ID`
- [ ] Verify: push to `dev` → Railway builds Dockerfile and deploys

**Pipeline**:

```text
feature/* ──PR──> dev ──PR──> main
                   │            │
              CI runs       CI runs
                   │            │
              Railway       Railway
              DEV env       PROD env
```

**Exit criteria**: PRs run CI automatically. Railway deploys from Dockerfile on merge. `docker-compose up` works locally.

---

### Phase 3 — Database Schema & Persistence Adapters

Define the Drizzle schema, generate migrations, and implement repository adapters. This is where domain meets infrastructure.

#### 3A — Schema & Migrations

- [ ] `config/database.ts` — raw postgres client from `DATABASE_URL`
- [ ] `config/env.ts` — validate all env vars, export typed config
- [ ] `adapters/out/persistence/drizzle/schema.ts` — all tables:
  - `stations` (id, name, latitude, longitude)
  - `lines` (id, name, short_name, transport_type)
  - `line_stations` (line_id, station_id, sequence, direction) — composite PK
  - `schedules` (id, monday..sunday booleans, start_date, end_date)
  - `schedule_exceptions` (schedule_id, date, is_active) — composite PK
  - `trips` (id, line_id, schedule_id, direction) — FKs
  - `passing_times` (trip_id, station_id, arrival_time, departure_time, sequence) — composite PK
  - `dataset_versions` (id serial, detected_at, validity_start, validity_end, status, error_message)
  - `search_logs` (id serial, origin_station_id, destination_station_id, searched_at, results_count)
- [ ] `adapters/out/persistence/drizzle/db.ts` — create Drizzle instance with schema
- [ ] `drizzle.config.ts` pointing to schema
- [ ] Generate initial migration: `bun run db:generate`
- [ ] Apply migration: `bun run db:migrate`
- [ ] Verify tables in Drizzle Studio

#### 3B — Mappers

- [ ] `StationMapper` — `toDomain(row)` / `toPersistence(entity)`
- [ ] `LineMapper` — `toDomain(row, lineStationRows)` / `toPersistence(entity)`
- [ ] `ScheduleMapper` — `toDomain(row, exceptionRows)` / `toPersistence(entity)`
- [ ] `TripMapper` — `toDomain(row, passingTimeRows)` / `toPersistence(entity)`
- [ ] Unit tests for mappers (both directions)

#### 3C — Repository Implementations

- [ ] `StationRepositoryDrizzle` — implements `StationRepository` port
- [ ] `LineRepositoryDrizzle` — implements `LineRepository` (includes JOIN with `line_stations`)
- [ ] `ScheduleRepositoryDrizzle` — implements `ScheduleRepository` (includes JOIN with `schedule_exceptions`)
- [ ] `TripRepositoryDrizzle` — implements `TripRepository` (includes JOIN with `passing_times`)
- [ ] Integration tests for each repository (real DB, Docker Compose)

#### 3D — Expand CI with Postgres

- [ ] Add Postgres service container to GitHub Actions CI
- [ ] Run `bun run db:migrate` before tests
- [ ] Integration tests execute against CI Postgres

**Exit criteria**: All tables created in Postgres. Repositories pass integration tests with real data. Mappers correctly translate between domain and persistence. CI includes database tests.

---

### Phase 4 — GTFS Import Pipeline

Download GTFS data from the NAP portal and import it into the database. This is the data ingestion layer.

#### 4A — GTFS Parser (Adapter)

- [ ] `GtfsParser.ts` — Extract ZIP, validate required CSVs exist, validate headers
- [ ] Parse `stops.txt` → `Station` creation args
- [ ] Parse `routes.txt` → `Line` creation args
- [ ] Parse `trips.txt` + `stop_times.txt` → `Trip` creation args with `PassingTime[]`
- [ ] Parse `calendar.txt` + `calendar_dates.txt` → `Schedule` creation args with `ScheduleException[]`
- [ ] Handle GTFS edge cases: times > 24:00:00 (next-day trips), missing optional fields
- [ ] Unit tests with sample GTFS data (small fixture files)

#### 4B — Import Use Case

- [ ] `ImportTransitData.ts` — orchestrate:
  1. Receive parsed data (from adapter)
  2. Validate business rules
  3. Truncate existing data (within transaction)
  4. Bulk insert via repositories
  5. Verify record counts
  6. Publish `DatasetImported` event
  7. Return import summary
- [ ] Unit test (mocked repos)
- [ ] Integration test (real DB, sample data)

#### 4C — Manual Import Script

- [ ] `scripts/import-gtfs.ts` — CLI script:
  1. Read local GTFS ZIP path from args
  2. Parse with `GtfsParser`
  3. Run `ImportTransitData` use case
  4. Log summary
- [ ] Test with real MetroValencia GTFS file (manually downloaded)
- [ ] Add `import:gtfs` script to `package.json`

**Exit criteria**: Can run `bun run import:gtfs data/gtfs/metrovalencia.zip` and see all data correctly loaded into Postgres. Record counts match expectations (~144 stations, ~200 lines, ~21K trips).

---

### Phase 5 — Departure Calculation & Station Queries (Core Use Cases)

Implement the main business logic: given origin and destination, find the next departures. Also build station query use cases needed by the bot.

- [ ] `SearchNextDepartures.ts` use case:
  1. Receive `originName: string`, `destinationName: string`
  2. Find origin and destination stations (fuzzy search if needed)
  3. Find lines that connect both stations in the correct order
  4. Find active schedules for today
  5. Find trips on those lines with those schedules
  6. Filter trips departing after current time from origin station
  7. Sort by departure time
  8. Map to `Departure[]` (time, line, direction, minutes remaining)
  9. Return top N (default: 5)
  10. Publish `DepartureSearched` event
- [ ] Handle domain errors: `StationNotFoundError`, `NoActiveServiceError`, `NoConnectionError`
- [ ] Unit test with mocked repos (various scenarios: normal, no service, no connection, fuzzy match)
- [ ] Integration test (real DB with imported GTFS data, real departure query)
- [ ] `SearchStations.ts` use case — fuzzy search by name, returns matching stations (for autocomplete and typo tolerance)
  - Unit test with mocked `StationRepository`
- [ ] `ListAllStations.ts` use case — returns all stations, optionally grouped by line
  - Unit test with mocked `StationRepository`

**Exit criteria**: `SearchNextDepartures.execute("Xàtiva", "Colón")` returns correct departures matching the real MetroValencia schedule. All tests pass.

---

### Phase 6 — Telegram Bot

Wire the Telegram bot to the use cases. Users can search departures and list stations.

#### 6A — Bot Setup

- [ ] `TelegramBot.ts` — grammY bot initialization, middleware (error handling, logging)
- [ ] `config/container.ts` — dependency injection wiring (manual factory function)
- [ ] `main.ts` — entry point: load env, create DB, create container, start bot

#### 6B — Handlers

- [ ] `departureHandler.ts` — `/salida <origin> <destination>` command:
  - Parse origin and destination from message
  - Call `SearchNextDepartures` use case
  - Format response (see format below)
  - Handle errors with user-friendly messages
- [ ] `stationHandler.ts` — `/paradas` command:
  - List all stations (grouped by line if possible)
- [ ] `helpHandler.ts` — `/help` command:
  - Usage instructions
- [ ] Tests for handlers (mocked use cases)

#### 6C — Response Format

```text
🚇 Xàtiva → Colón

Next departures:
1. 14:23 (in 4 min) — L3
2. 14:31 (in 12 min) — L5
3. 14:38 (in 19 min) — L3
4. 14:45 (in 26 min) — L5
5. 14:52 (in 33 min) — L3

ℹ️ Planned schedules. Real times may vary.
```

**Exit criteria**: Bot responds to `/salida Xàtiva Colón` with correct, formatted departure information. `/paradas` and `/help` work. Error messages are clear and friendly.

---

### Phase 7 — Event Bus & Analytics

Wire up domain events and start collecting search analytics.

- [ ] `InMemoryEventBus.ts` — simple sync event bus implementing `EventBus` port
- [ ] `AnalyticsRepository` — port interface in `core/domain/shared/` (not aggregate-bound): `saveSearchLog(event)`, `getMostSearchedRoutes()`, `getPopularStations()`
- [ ] `AnalyticsRepositoryDrizzle.ts` — implements `AnalyticsRepository` port, persists to `search_logs`
- [ ] `RecordDepartureSearch.ts` use case — subscribes to `DepartureSearched`, calls `AnalyticsRepository`
- [ ] Wire event subscriptions in `container.ts`
- [ ] Verify events flow correctly in integration test
- [ ] Add admin command or script to query analytics (most searched routes, popular stations)

**Exit criteria**: Every departure search creates a record in `search_logs`. Analytics queries return meaningful data.

---

### Phase 8 — Automatic GTFS Download & Version Detection

Automate the full data pipeline: detect new GTFS versions, download, import, notify.

#### 8A — NAP Client

- [ ] `NapClient.ts` — HTTP client for NAP portal:
  - `login(username, password)` — POST to login endpoint, get session cookie
  - `downloadZip(sessionCookie)` — GET download endpoint, save to disk
- [ ] Tests with mocked HTTP

#### 8B — Version Checker

- [ ] `GtfsVersionChecker.ts` — fetch public NAP page, extract metadata (publication date, validity, file size)
- [ ] `DatasetVersionRepository` — port interface in `core/domain/shared/`: `findLatest()`, `save(version)`
- [ ] `DatasetVersionRepositoryDrizzle.ts` — implements `DatasetVersionRepository` port, persists to `dataset_versions`
- [ ] `CheckDatasetVersion.ts` use case — compare metadata with `DatasetVersionRepository`, trigger import if new

#### 8C — Cron Job

- [ ] `config/cron.ts` — daily job (overnight) that runs `CheckDatasetVersion`
- [ ] Full automated flow: detect → download → import → notify admin
- [ ] `TelegramNotifier.ts` — notify admin of success/failure via Telegram

**Exit criteria**: System automatically detects new GTFS versions, downloads, imports, and notifies admin. Manual intervention only needed if something fails.

---

### Phase 9 — Polish & Hardening

- [ ] Fuzzy station search with `pg_trgm` (Postgres trigram extension) or `fuse.js` in-memory
- [ ] Better error messages (station suggestions on typos, "did you mean...?")
- [ ] Rate limiting (grammY built-in throttling)
- [ ] Logging (structured logs, differentiate local/dev/prod)
- [ ] Health check endpoint (for Railway monitoring)
- [ ] README.md for the repository (public-facing)

---

## Future Phases (Post-MVP)

These are not prioritized yet. They represent growth directions.

### Multi-Transport

- Add tram, bus, bike-sharing data sources
- New aggregates: `BusStop`, `TramLine`, or generalize `Station` with `TransportType`
- New adapters for additional GTFS feeds or other data formats

### Frontend

- Web interface (React/Next.js) for departure search
- Monorepo split: `packages/backend`, `packages/frontend`, `packages/shared`
- REST or tRPC API in `adapters/in/http/`

### Advanced Features

- Interactive station selection (Telegram inline keyboards)
- Favorite routes per user
- Push notifications for service disruptions
- Multi-language support (Spanish, Valencian, English)
- Optimal route planning with transfers
- GTFS-Realtime integration (if MetroValencia provides it)

### CQRS

- Separate read models for analytics and departure queries
- If write load and read load have different scaling needs

---

## Key Technical Decisions

1. **Domain-driven, not GTFS-driven**: The domain models stations, lines, schedules, and trips as business concepts. GTFS is just one import format handled by an adapter.
2. **Co-located tests**: TS best practice. Tests live next to their source files, not in a separate tree.
3. **Manual DI over framework DI**: A simple factory function in `container.ts` is sufficient. No `@Injectable()` decorators coupling domain to frameworks.
4. **TypeScript for ETL**: GTFS parsing is simple CSV → domain mapping. Keeping it in TS avoids a Python/TS interop boundary and shares domain types.
5. **Sync events (MVP)**: `InMemoryEventBus` is sufficient for analytics. Async event bus (RabbitMQ/Redis) only if needed for performance or multi-service communication.
6. **No cache initially**: ~200K rows in Postgres is fast enough for schedule queries. Add caching only if there's a measured performance problem.
7. **ESLint enforced architecture**: `eslint-plugin-hexagonal-architecture` prevents accidental dependency rule violations at lint time, not just by convention.
8. **Early CI/CD**: CI and deployment set up in Phase 2, before database work. Ensures quality gates are in place from the start and deployment is never a bottleneck.

---

## Risks and Mitigations

| Risk                                         | Mitigation                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| MetroValencia GTFS unavailable or incomplete | Verify data source before starting Phase 4. Have sample fixtures for testing. |
| Schedules don't match reality                | Disclaimer in bot: "Planned schedules. Real times may vary."                  |
| Ambiguous station names                      | Fuzzy search with confirmation. "Did you mean Xàtiva?"                        |
| NAP portal login changes                     | Admin notification on failure. Manual import as fallback.                     |
| GTFS times > 24:00:00                        | Handle in `TimeOfDay` VO (wrap to next day).                                  |
| Telegram rate limiting                       | grammY built-in throttling middleware.                                        |
