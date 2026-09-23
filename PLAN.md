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
| Deployment    | Hetzner VPS + Coolify                           | Self-managed, git-based deploy via Dockerfile (see Phase 10)               |
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

**Patterns**: Unit tests cover domain (no mocks) + application (mock all ports) + mappers. Integration tests hit one adapter against real infra. Component tests run a use case with all real adapters, no entry point. E2E tests exercise the full flow (e.g. Telegram command → handler → use case → DB → response).

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

Detailed checklists live in [`docs/plan/`](./docs/plan/), one file per phase — read only the one you need instead of this whole document.

| Phase | Title                                                  | Status                             | File                                                                               |
| ----- | ------------------------------------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------- |
| 0     | Project Scaffold & Tooling                             | ✅ Done                            | [phase-0-scaffold.md](./docs/plan/phase-0-scaffold.md)                             |
| 1     | Domain Model (Entities + VOs + Tests)                  | ✅ Done                            | [phase-1-domain-model.md](./docs/plan/phase-1-domain-model.md)                     |
| 2     | CI/CD & Railway Deployment                             | ✅ Historical                      | [phase-2-cicd-railway.md](./docs/plan/phase-2-cicd-railway.md)                     |
| 3     | Database Schema & Persistence Adapters                 | ✅ Done                            | [phase-3-database-persistence.md](./docs/plan/phase-3-database-persistence.md)     |
| 4     | GTFS Import Pipeline                                   | ✅ Done                            | [phase-4-gtfs-import.md](./docs/plan/phase-4-gtfs-import.md)                       |
| 5     | Departure Calculation & Station Queries                | ✅ Done                            | [phase-5-departure-calculation.md](./docs/plan/phase-5-departure-calculation.md)   |
| 6     | Telegram Bot                                           | ✅ Done                            | [phase-6-telegram-bot.md](./docs/plan/phase-6-telegram-bot.md)                     |
| 7     | Event Bus & Event Store                                | ✅ Done                            | [phase-7-event-bus.md](./docs/plan/phase-7-event-bus.md)                           |
| 8     | UX & Usability                                         | ✅ Done                            | [phase-8-ux-usability.md](./docs/plan/phase-8-ux-usability.md)                     |
| 9     | **Live Departures (FGV real-time provider)**           | 🔵 **Not started — current focus** | [phase-9-live-departures-fgv.md](./docs/plan/phase-9-live-departures-fgv.md)       |
| 10    | Migrate Deployment: Northflank → Hetzner VPS + Coolify | ⏸️ Postponed (after Phase 9)       | [phase-10-vps-coolify-migration.md](./docs/plan/phase-10-vps-coolify-migration.md) |
| 11    | Automatic GTFS Download & Version Detection            | ⏸️ Postponed (after Phase 10)      | [phase-11-gtfs-auto-download.md](./docs/plan/phase-11-gtfs-auto-download.md)       |
| 12    | Hardening                                              | ⬜ Not started                     | [phase-12-hardening.md](./docs/plan/phase-12-hardening.md)                         |

---

## Future Phases (Post-MVP)

Not prioritized yet — growth directions.

- **Multi-Transport**: tram, bus, bike-sharing data sources; new aggregates (`BusStop`, `TramLine`, or generalize `Station` with `TransportType`); new adapters for additional GTFS feeds.
- **Frontend**: web interface (React/Next.js); monorepo split (`packages/backend`, `packages/frontend`, `packages/shared`); REST or tRPC API in `adapters/in/http/`.
- **Advanced Features**: favorite routes per user, push notifications for service disruptions, multi-language support (Spanish, Valencian, English), optimal route planning with transfers. (Live departures moved to [Phase 9](./docs/plan/phase-9-live-departures-fgv.md) — FGV publishes no GTFS-Realtime feed, only an undocumented proprietary endpoint.)
- **CQRS**: separate read models for analytics vs. departure queries, if write/read load ever need different scaling.

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
