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

## Testing Strategy

```
Entry point    Use case    Adapters    Infra
(Telegram)  →  (Search)  →  (Repos)  →  (DB)
    │              │            │          │
    │              │            └──────────┘  ← Integration
    │              └──────────────────────┘  ← Component
    └─────────────────────────────────────┘  ← E2E
```

| Type            | Location                 | What it tests                                           | Mocking                                      |
| --------------- | ------------------------ | ------------------------------------------------------- | -------------------------------------------- |
| **Unit**        | Co-located (`*.test.ts`) | Domain logic, use case orchestration, mappers, adapters | Ports (for use cases), nothing (for domain)  |
| **Integration** | Co-located (`*.test.ts`) | One adapter against its real infra                      | Nothing — real DB/filesystem                 |
| **Component**   | `tests/component/`       | Use case + real adapters + real DB, no entry point      | Nothing — real everything except entry point |
| **E2E**         | `tests/e2e/`             | Full flow from entry point to response                  | Nothing — real everything                    |

### Testing Patterns

- **Unit tests**: Domain (pure logic, no mocks) + application (mock all ports) + mappers
- **Integration tests**: One adapter against real infra (repo ↔ DB, parser ↔ fixture files)
- **Component tests**: Use case with all real adapters, no entry point
  - Happy path + unhappy paths (validation errors, domain rule violations, not found)
- **E2E tests**: Full flow — e.g., Telegram command → handler → use case → DB → response

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
  tests/
    component/      # use case + real adapters + real DB
    e2e/            # full flow from entry point to response
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
- [x] `EventBus` — `publish(event: DomainEvent): Promise<void>` (subscribe wired via constructor injection — see Phase 4B)

#### 1D — Domain Events ✅

- [x] `DomainEvent` — abstract base: `occurredOn`, `eventName: DomainEventType`, optional `aggregateId`/`aggregateType` (no `eventId` — relies on DB serial)
- [x] `DomainEventType` — enum: `DATASET_IMPORTED`, `DEPARTURE_SEARCHED`
- [x] `DepartureSearched` — origin, destination, resultsCount, searchedAt
- [x] `DatasetImported` — stationsCount, linesCount, tripsCount, importedAt

**Exit criteria**: ✅ All domain code compiles with zero infrastructure imports. All entity/VO tests pass. Domain layer is a self-contained, testable unit.

---

### Phase 2 — CI/CD & Railway Deployment

Set up continuous integration with GitHub Actions and continuous deployment to Railway via Dockerfile. At this stage there's no database — CI runs lint, format check, typecheck, and unit tests. Railway deploys the app container (which just prints "Starting...").

#### 2A — GitHub Actions CI

- [x] `.github/workflows/ci.yml` — runs on push + PRs to `dev` and `main`:
  - `bun install --frozen-lockfile`
  - `bun run format:check`
  - `bun run lint`
  - `bun x tsc --noEmit`
  - `bun test`
- [x] Bun version pinned to `1.3.9` in CI
- [x] Dependency caching with `actions/cache` (~15-30s faster)
- [x] `.github/dependabot.yml` — weekly auto-updates for npm + GitHub Actions
- [x] Branch protection on `dev` and `main` (require CI green to merge)

#### 2B — Dockerfile & Docker Compose

- [x] `Dockerfile` — portable app container (Bun 1.3.9 pinned)
  - Works on Railway, VPS, Fly.io, any Docker host
- [x] `.dockerignore` — exclude node_modules, .env, data, etc.
- [x] `docker-compose.yml` updated with `app` service
  - `docker-compose up` starts app + postgres locally
  - App depends on postgres healthcheck

#### 2C — Railway Deployment

- [x] Create Railway project with 2 environments: `staging` (branch `dev`), `production` (branch `main`)
- [x] Configure env var: `APP_ENV` (`staging` / `production`)
- [x] Verify: push to `dev` → Railway builds Dockerfile and deploys

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

#### 3A — Schema & Migrations ✅

- [x] `config/database.ts` — raw postgres client from `DATABASE_URL`
- [x] `config/env.ts` — validate all env vars, export typed config
- [x] `adapters/out/persistence/drizzle/schema.ts` — all tables:
  - `stations` (id, feed_id, name, latitude, longitude, transport_type)
  - `lines` (id, feed_id, name, short_name, transport_type)
  - `line_stations` (line_id, station_id, feed_id, sequence, direction) — composite PK
  - `schedules` (id, feed_id, monday..sunday booleans, start_date, end_date)
  - `schedule_exceptions` (schedule_id, feed_id, date, is_active) — composite PK
  - `trips` (id, feed_id, line_id, schedule_id, direction, headsign) — FKs
  - `passing_times` (trip_id, station_id, feed_id, arrival_time, departure_time, sequence) — composite PK
  - `dataset_versions` (id serial, feed_id, detected_at, validity_start, validity_end, status, error_message)
  - `domain_events` (id serial PK, type text, occurred_on timestamp, body JSONB, aggregate_id text, aggregate_type text, trace_id text) — Event Store (migrated in Phase 4B)
- [x] `adapters/out/persistence/drizzle/db.ts` — create Drizzle instance with schema
- [x] `drizzle.config.ts` pointing to schema
- [x] Generate initial migration: `bun run db:generate` → `drizzle/0000_normal_swarm.sql`
- [x] Apply migration: `bun run db:migrate` (requires live DB — manual step)
- [x] Verify tables in Drizzle Studio

#### 3B — Mappers

- [x] `StationMapper` — `toDomain(row)` / `toPersistence(entity)`
- [x] `LineMapper` — `toDomain(row, lineStationRows)` / `toPersistence(entity)`
- [x] `ScheduleMapper` — `toDomain(row, exceptionRows)` / `toPersistence(entity)`
- [x] `TripMapper` — `toDomain(row, passingTimeRows)` / `toPersistence(entity)`
- [x] Unit tests for mappers (both directions + round-trip) — 128 tests pass

#### 3C — Repository Implementations

- [x] `StationRepositoryDrizzle` — implements `StationRepository` port
- [x] `LineRepositoryDrizzle` — implements `LineRepository` (includes JOIN with `line_stations`)
- [x] `ScheduleRepositoryDrizzle` — implements `ScheduleRepository` (includes JOIN with `schedule_exceptions`)
- [x] `TripRepositoryDrizzle` — implements `TripRepository` (includes JOIN with `passing_times`)
- [x] Integration tests for each repository (real DB, Docker Compose)

#### 3D — Expand CI with Postgres

- [x] Add Postgres service container to GitHub Actions CI
- [x] Run `bun run db:migrate` before tests
- [x] Integration tests execute against CI Postgres

#### 3E — Railway Database Setup

- [x] Add Postgres addon in Railway environments (`staging`, `production`)
- [x] Verify `DATABASE_URL` is automatically added to Railway variables
- [x] Run remote migrations against Railway Postgres

**Exit criteria**: All tables created in Postgres. Repositories pass integration tests with real data. Mappers correctly translate between domain and persistence. CI includes database tests. App deploys successfully to Railway with working database connection.

---

### Phase 4 — GTFS Import Pipeline

Download GTFS data from the NAP portal and import it into the database. This is the data ingestion layer.

#### 4A — GTFS Parser (Adapter) ✅

- [x] `GtfsParser.ts` — Extract ZIP, validate required CSVs exist, validate headers
- [x] Parse `stops.txt` → `Station` creation args
- [x] Parse `routes.txt` → `Line` creation args
- [x] Parse `trips.txt` + `stop_times.txt` → `Trip` creation args with `PassingTime[]`
- [x] Parse `calendar.txt` + `calendar_dates.txt` → `Schedule` creation args with `ScheduleException[]`
- [x] Handle GTFS edge cases: times > 24:00:00 (next-day trips), missing optional fields
- [x] Unit tests with sample GTFS data (small fixture files)

#### 4B — Domain Event Restructure ✅

- [x] `DomainEventType` enum — type-safe event names
- [x] `EventSubscriber` interface — `handle(event)` pattern
- [x] `DomainEvent` base class — remove `eventId`, add `aggregateId`/`aggregateType`, typed `eventName`
- [x] `DatasetImported` / `DepartureSearched` — use `DomainEventType` enum
- [x] `EventBus` port simplified — only `publish()`, no `subscribe()`
- [x] `StoredDomainEvent` entity — persisted event with metadata
- [x] `DomainEventRepository` port — Event Store abstraction

#### 4C — Event Persistence & Subscribers ✅

- [x] `DomainEventMapper` — domain ↔ persistence translation
- [x] `DomainEventRepositoryDrizzle` — Drizzle Event Store implementation
- [x] `domain_events` schema migration — `type`, `body JSONB`, `aggregate_id`, `aggregate_type`, `trace_id`
- [x] `InMemoryEventBus` refactored — constructor injection of `EventSubscriber[]`
- [x] `PersistAllEventsSubscriber` use case — persists all published events
- [x] Container wiring updated — subscribers injected into EventBus constructor

**Exit criteria**: ✅ All domain events persisted automatically. EventBus distributes to subscribers. Subscriber pattern extendable without touching EventBus.

#### 4D — ImportTransitData Use Case ✅

- [x] `ImportTransitData.ts` — orchestrate:
  1. Receive parsed data (from adapter)
  2. Validate business rules
  3. Truncate existing data (within transaction)
  4. Bulk insert via repositories
  5. Verify record counts
  6. Publish `DatasetImported` event
  7. Return import summary
- [x] **Unit test** — mock repos, test orchestration
- [x] **Component test** — real adapters + real DB, test happy + unhappy paths (empty data, re-import idempotency, etc.)

#### 4E — Manual Import Script ✅

- [x] `scripts/import-gtfs.ts` — CLI script:
  1. Read local GTFS ZIP path from args
  2. Parse with `GtfsParser`
  3. Run `ImportTransitData` use case
  4. Log summary
- [x] **Component test** (`tests/component/import-transit-data.test.ts`) — parser → use case → real repos → real DB
- [x] Add `import:gtfs` script to `package.json`

#### 4F — Full Import Pipeline Validation ✅

- [x] Run `bun run import:gtfs data/gtfs/metrovalencia.zip` with real MetroValencia GTFS file — passes
- [x] Structural validation already covered: parser throws on missing CSVs, VOs throw on malformed data
- [x] No automated E2E test needed — departures query will be validated in Phase 5 with real imported data

> Anomaly detection (dataset shrinks suspiciously, lines disappear, schedules don't cover today) is **Phase 8** responsibility — `CheckDatasetVersion` will compare incoming dataset against existing DB before committing the import.

**Exit criteria**: ✅ Manual run succeeds. Structural errors already caught by parser + VOs. Anomaly detection deferred to Phase 8.

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
- [ ] **Component test** with mocked repos (various scenarios: normal, no service, no connection, fuzzy match)
- [ ] **E2E test** with real DB and imported GTFS data (real departure query)
- [ ] `SearchStations.ts` use case — fuzzy search by name, returns matching stations (for autocomplete and typo tolerance)
  - Component test with mocked `StationRepository`
- [ ] `ListAllStations.ts` use case — returns all stations, optionally grouped by line
  - Component test with mocked `StationRepository`

**Exit criteria**: `SearchNextDepartures.execute("Xàtiva", "Colón")` returns correct departures matching the real MetroValencia schedule. All tests pass.

---

### Phase 6 — Telegram Bot

Wire the Telegram bot to the use cases. Users can search departures and list stations.

#### 6A — Bot Setup ✅

- [x] `TelegramBot.ts` — grammY bot wrapper: receives token + use cases via constructor, registers handlers and error middleware in `start()`, validates `BOT_TOKEN` at start time (not construction)
- [x] `main.ts` — entry point: `createContainer()` → instantiate use cases with repos → create `TelegramBot` → `bot.start()`
- [x] Container unchanged — only exposes infra (repos, db, eventBus, secrets). Use cases instantiated in entry points (`main.ts`, scripts), not in the container.
- [x] Configure Telegram env vars in Railway: `BOT_TOKEN`, `ADMIN_CHAT_ID`

#### 6B — Handlers & Response Format ✅

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

---

### Phase 7 — Event Bus & Event Store ✅ (completed in Phases 4B-4C)

All items below were implemented as part of Phase 4B and 4C:

- [x] `InMemoryEventBus.ts` — sync event bus, constructor-injected subscribers (4C)
- [x] `DomainEventRepository` port — `save`, `findAll`, `findByType`, `findByAggregateId` (4B)
- [x] `DomainEventRepositoryDrizzle.ts` — persists to `domain_events` Event Store (4C)
- [x] `PersistAllEventsSubscriber` use case — generic event persistence subscriber (4C)
- [x] Event wiring in `src/adapters/container.ts` (4C)

Analytics queries (JSONB-based) deferred to Phase 9 or post-MVP.

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
- [ ] **Anomaly detection** — before committing import, compare incoming counts against current DB (stations, lines, schedules). If any drops below a threshold (e.g. <50% of current), abort and notify admin instead of replacing good data with a truncated dataset.

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
3. **Manual DI over framework DI**: A simple factory function in `src/adapters/container.ts` is sufficient. No `@Injectable()` decorators coupling domain to frameworks.
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
