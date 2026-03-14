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

## Import Strategy
- **Idempotent**: truncate target tables, then re-insert all data
- **Why**: GTFS datasets are full snapshots, not incremental updates
- **Order matters**: respect FK constraints (stations before lines, lines before trips)

## Key Components
- `src/adapters/out/http/NapClient.ts` — HTTP client for GTFS ZIP download
- `src/adapters/out/persistence/gtfs/GtfsParser.ts` — CSV parsing to domain entities
- `src/core/application/import/ImportTransitData.ts` — Orchestrator use case
- Repository `saveMany()` methods — Bulk persistence

## Data Flow
1. Download ZIP from NAP endpoint
2. Extract CSV files (stops.txt, routes.txt, trips.txt, stop_times.txt, calendar.txt)
3. Parse each CSV into domain entities using GtfsParser
4. Truncate existing data (within transaction)
5. Bulk insert new data via repositories
6. Commit transaction

## Why TypeScript for ETL
- Same language as the rest of the app
- Domain entities are reused (no separate data models)
- Type safety from CSV to DB
