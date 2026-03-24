---
name: gtfs-import
description: "GTFS data import pipeline: download, parse CSV to domain entities, and bulk persist. Use when implementing or modifying the transit data ETL from Valencia's NAP."
user-invocable: false
---

**MANDATORY FIRST STEP — run this before anything else:**
```bash
bun ./.claude/hooks/echo_skill_start.ts gtfs-import
```

# GTFS Import

ETL pipeline for importing transit data from Valencia's NAP (National Access Point).

## Architecture

```
NapClient (HTTP)
  → downloads GTFS ZIP
  → GtfsParser (CSV → domain entities)
    → ImportTransitData (use case, orchestrates)
      → Repositories (bulk insert to DB)
```

## Domain Model

Two distinct concepts derived from GTFS:

- **`Route`** — operational unit. Maps to GTFS `route_id` (e.g. `"V4-114-98"`). Has an unordered set of stations (all stops from all its trips). No color. Persisted in `routes` + `route_stations`.
- **`Line`** — commercial line the traveler sees (e.g. `"4"`). Keyed by `route_short_name`. Has a canonical ordered stop sequence built with the **station coverage filter** (see below). Color hardcoded. Persisted in `lines` + `line_stations`.

## Station Coverage Filter (for line_stations)
1. Group routes by `route_short_name`
2. Keep **canonical routes**: those with ≥ 15% of the max trip count in the group (filters depot runs and short turns)
3. Count total trips across all canonical routes for this line
4. For each station: keep if it appears in ≥ 15% of those trips (filters shared-track minority stops like Machado/Benimaclet on L5)
5. Order using the longest canonical trip as sequence reference

## Hardcoded Line Colors (MetroValencia)

| Line | Color (hex) |
|------|------------|
| 1    | FEC601     |
| 2    | E60096     |
| 3    | DD052C     |
| 4    | 014A99     |
| 5    | 008F71     |
| 6    | 8884BF     |
| 7    | F28D01     |
| 8    | 82CEE6     |
| 9    | B8804F     |
| 10   | B7DD79     |

## Import Strategy
- **Idempotent**: truncate target tables, then re-insert all data
- **Why**: GTFS datasets are full snapshots, not incremental updates
- **Order matters**: respect FK constraints (see Data Flow below)

## Key Components
- `src/adapters/out/http/NapClient.ts` — HTTP client for GTFS ZIP download
- `src/adapters/out/transit-data/GtfsParser.ts` — CSV parsing to domain entities
- `src/core/application/import/ImportTransitData.ts` — Orchestrator use case
- Repository `saveMany()` methods — Bulk persistence

## Data Flow
1. Download ZIP from NAP endpoint
2. Extract CSV files (stops.txt, routes.txt, trips.txt, stop_times.txt, calendar.txt, calendar_dates.txt)
3. Parse each CSV into domain entities using GtfsParser:
   - `stations` from stops.txt
   - `routes` from routes.txt (one per route_id)
   - `lines` from routes.txt grouped by route_short_name (canonical stop sequence from best trip)
   - `schedules` + exceptions from calendar.txt + calendar_dates.txt
   - `trips` from trips.txt (ALL trips, no canonical filter)
4. Truncate existing data in FK-safe reverse order:
   `passing_times → line_stations → trips → route_stations → routes → lines → schedule_exceptions → schedules → stations`
5. Bulk insert new data in FK-safe order:
   `stations → schedules + exceptions → lines → routes → route_stations → trips → passing_times → line_stations`
6. Publish `DatasetImported` event with record counts
7. Return import summary

## Why TypeScript for ETL
- Same language as the rest of the app
- Domain entities are reused (no separate data models)
- Type safety from CSV to DB
