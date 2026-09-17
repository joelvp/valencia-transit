# Phase 4 — GTFS Import Pipeline ✅

Download GTFS data from the NAP portal and import it into the database. This is the data ingestion layer.

## 4A — GTFS Parser (Adapter) ✅

- [x] `GtfsParser.ts` — Extract ZIP, validate required CSVs exist, validate headers
- [x] Parse `stops.txt` → `Station` creation args
- [x] Parse `routes.txt` → `Line` creation args
- [x] Parse `trips.txt` + `stop_times.txt` → `Trip` creation args with `PassingTime[]`
- [x] Parse `calendar.txt` + `calendar_dates.txt` → `Schedule` creation args with `ScheduleException[]`
- [x] Handle GTFS edge cases: times > 24:00:00 (next-day trips), missing optional fields
- [x] Unit tests with sample GTFS data (small fixture files)

## 4B — Domain Event Restructure ✅

- [x] `DomainEventType` enum — type-safe event names
- [x] `EventSubscriber` interface — `handle(event)` pattern
- [x] `DomainEvent` base class — remove `eventId`, add `aggregateId`/`aggregateType`, typed `eventName`
- [x] `DatasetImported` / `DepartureSearched` — use `DomainEventType` enum
- [x] `EventBus` port simplified — only `publish()`, no `subscribe()`
- [x] `StoredDomainEvent` entity — persisted event with metadata
- [x] `DomainEventRepository` port — Event Store abstraction

## 4C — Event Persistence & Subscribers ✅

- [x] `DomainEventMapper` — domain ↔ persistence translation
- [x] `DomainEventRepositoryDrizzle` — Drizzle Event Store implementation
- [x] `domain_events` schema migration — `type`, `body JSONB`, `aggregate_id`, `aggregate_type`, `trace_id`
- [x] `InMemoryEventBus` refactored — constructor injection of `EventSubscriber[]`
- [x] `PersistAllEventsSubscriber` use case — persists all published events
- [x] Container wiring updated — subscribers injected into EventBus constructor

**Exit criteria**: ✅ All domain events persisted automatically. EventBus distributes to subscribers. Subscriber pattern extendable without touching EventBus.

## 4D — ImportTransitData Use Case ✅

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

## 4E — Manual Import Script ✅

- [x] `scripts/import-gtfs.ts` — CLI script:
  1. Read local GTFS ZIP path from args
  2. Parse with `GtfsParser`
  3. Run `ImportTransitData` use case
  4. Log summary
- [x] **Component test** (`tests/component/import-transit-data.test.ts`) — parser → use case → real repos → real DB
- [x] Add `import:gtfs` script to `package.json`

## 4F — Full Import Pipeline Validation ✅

- [x] Run `bun run import:gtfs data/gtfs/metrovalencia.zip` with real MetroValencia GTFS file — passes
- [x] Structural validation already covered: parser throws on missing CSVs, VOs throw on malformed data
- [x] No automated E2E test needed — departures query will be validated in Phase 5 with real imported data

> Anomaly detection (dataset shrinks suspiciously, lines disappear, schedules don't cover today) is **Phase 10** responsibility — `CheckDatasetVersion` will compare incoming dataset against existing DB before committing the import.

**Exit criteria**: ✅ Manual run succeeds. Structural errors already caught by parser + VOs. Anomaly detection deferred to Phase 10.
