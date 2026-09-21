# Phase 3 — Database Schema & Persistence Adapters ✅

Define the Drizzle schema, generate migrations, and implement repository adapters. This is where domain meets infrastructure.

## 3A — Schema & Migrations ✅

- [x] `config/database.ts` — raw postgres client from `DATABASE_URL`
- [x] `config/env.ts` — validate all env vars, export typed config
- [x] `adapters/out/persistence/drizzle/schema.ts` — all tables:
  - `stations` (id+feed_id PK, name, latitude, longitude, transport_types)
  - `lines` (id+feed_id PK, name, color, transport_type)
  - `line_stations` (line_id+station_id+feed_id PK, sequence) — composite PK
  - `routes` (id+feed_id PK, transport_type, line_id)
  - `route_stations` (route_id+station_id+feed_id PK)
  - `schedules` (id+feed_id PK, monday..sunday booleans, start_date, end_date)
  - `schedule_exceptions` (schedule_id+date+feed_id PK, is_active)
  - `trips` (id+feed_id PK, route_id, schedule_id, headsign)
  - `passing_times` (trip_id+station_id+sequence+feed_id PK, arrival_time, departure_time)
  - `dataset_versions` (id serial PK, feed_id, detected_at, validity_start, validity_end, status, error_message)
  - `users` (id UUID PK, language, first_seen_at, last_seen_at) — provider-agnostic identity
  - `user_identities` (provider+provider_id PK, user_id FK→users, metadata jsonb) — maps Telegram/web IDs to internal UUID
  - `domain_events` (id serial PK, type, occurred_on, body JSONB, aggregate_id, aggregate_type, trace_id) — append-only event store
  - `analytics_events` (id serial PK, type, occurred_on, body JSONB, user_id nullable, trace_id) — behavioral tracking
- [x] `adapters/out/persistence/drizzle/db.ts` — create Drizzle instance with schema
- [x] `drizzle.config.ts` pointing to schema
- [x] Generate initial migration: `bun run db:generate` → `drizzle/0000_normal_swarm.sql`
- [x] Apply migration: `bun run db:migrate` (requires live DB — manual step)
- [x] Verify tables in Drizzle Studio

## 3B — Mappers

- [x] `StationMapper` — `toDomain(row)` / `toPersistence(entity)`
- [x] `LineMapper` — `toDomain(row, lineStationRows)` / `toPersistence(entity)`
- [x] `ScheduleMapper` — `toDomain(row, exceptionRows)` / `toPersistence(entity)`
- [x] `TripMapper` — `toDomain(row, passingTimeRows)` / `toPersistence(entity)`
- [x] Unit tests for mappers (both directions + round-trip) — 128 tests pass

## 3C — Repository Implementations

- [x] `StationRepositoryDrizzle` — implements `StationRepository` port
- [x] `LineRepositoryDrizzle` — implements `LineRepository` (includes JOIN with `line_stations`)
- [x] `ScheduleRepositoryDrizzle` — implements `ScheduleRepository` (includes JOIN with `schedule_exceptions`)
- [x] `TripRepositoryDrizzle` — implements `TripRepository` (includes JOIN with `passing_times`)
- [x] Integration tests for each repository (real DB, Docker Compose)

## 3D — Expand CI with Postgres

- [x] Add Postgres service container to GitHub Actions CI
- [x] Run `bun run db:migrate` before tests
- [x] Integration tests execute against CI Postgres

## 3E — Railway Database Setup (historical)

- [x] Add Postgres addon in Railway environments (`staging`, `production`)
- [x] Verify `DATABASE_URL` is automatically added to Railway variables
- [x] Run remote migrations against Railway Postgres

**Exit criteria**: All tables created in Postgres. Repositories pass integration tests with real data. Mappers correctly translate between domain and persistence. CI includes database tests. App deploys successfully with a working database connection.
