# Design Principles

1. Domain models business, not data formats — GTFS is an import adapter
2. Rich entities, lean orchestration — entities own behavior
3. Value Objects everywhere — typed, validated, no primitives
4. Events for side effects — analytics, notifications via domain events
5. Dependency inversion — domain defines ports, adapters implement
6. Co-located tests — tests live next to the code they test
7. Idempotent imports — truncate and re-insert
8. Fail-safe — if something fails, notify admin, bot keeps running
9. No over-engineering — start simple, evolve when needed
10. Scalable by design — new transport modes = new aggregates/adapters
