# Phase 7 — Event Bus & Event Store ✅ (completed in Phases 4B-4C)

All items below were implemented as part of Phase 4B and 4C:

- [x] `InMemoryEventBus.ts` — sync event bus, constructor-injected subscribers (4C)
- [x] `DomainEventRepository` port — `save`, `findAll`, `findByType`, `findByAggregateId` (4B)
- [x] `DomainEventRepositoryDrizzle.ts` — persists to `domain_events` Event Store (4C)
- [x] `AnalyticsEventRepository` port — `save`, `findByUserId`, `findByType`
- [x] `AnalyticsEventRepositoryDrizzle.ts` — persists to `analytics_events` table
- [x] `PersistDomainEventsSubscriber` — persists domain events (DatasetImported, LanguageChanged)
- [x] `PersistAnalyticsEventsSubscriber` — persists analytics events (DepartureSearched, LinesBrowsed, etc.)
- [x] Event wiring in `src/adapters/container.ts` (4C)

Analytics queries via JSONB operators on `analytics_events.body`.
