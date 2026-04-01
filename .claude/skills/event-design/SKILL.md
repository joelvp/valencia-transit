---
name: event-design
description: Design and wire domain events and analytics events with subscribers following the project event-driven pattern
user-invocable: false
---

**MANDATORY FIRST STEP — run this before anything else:**
```bash
bun ./.claude/hooks/echo_skill_start.ts event-design
```

# Event Design

Design and wire events with subscribers. There are two event types — choose the right one:

| Type | Base class | Use when |
|------|-----------|----------|
| **Domain event** | `DomainEvent` | Something changed the state of an aggregate (e.g., language changed, dataset imported) |
| **Analytics event** | `AnalyticsEvent` | A user action was observed but no state changed (e.g., departure searched, lines browsed) |

This skill is used by the domain-expert agent when designing event-driven flows.

## Steps

### 1. Create event class: `src/core/domain/event/<EventName>.ts`

#### Domain event (state change)

```typescript
import { DomainEventType } from "@/core/domain/event/DomainEventType";
import { DomainEvent } from "@/core/domain/event/DomainEvent";

export class <EventName> extends DomainEvent {
  override readonly eventName = DomainEventType.<ENUM_VALUE>;

  constructor(
    readonly relevantField: string,
    // aggregateId = the UUID of the affected aggregate root
    // aggregateType = the aggregate name (e.g., "user", "feed")
    aggregateId: string,
    aggregateType: string,
  ) {
    super(aggregateId, aggregateType);
  }
}
```

#### Analytics event (user behaviour, no state change)

```typescript
import { AnalyticsEventType } from "@/core/domain/event/AnalyticsEventType";
import { AnalyticsEvent } from "@/core/domain/event/AnalyticsEvent";

export class <EventName> extends AnalyticsEvent {
  override readonly eventName = AnalyticsEventType.<ENUM_VALUE>;

  constructor(
    readonly relevantField: string,
    // ... only primitive types (events must be serializable)
    userId?: string,   // optional — pass ctx.userId || undefined from handler
    traceId?: string,  // optional — pass ctx.requestId from handler
  ) {
    super(userId, traceId);
  }
}
```

Rules:
- Domain events: `eventName` must be a `DomainEventType` enum value; `aggregateId`/`aggregateType` required
- Analytics events: `eventName` must be an `AnalyticsEventType` enum value; no `aggregateId`/`aggregateType`; `userId` and `traceId` are optional last params
- Domain events also accept optional `traceId` as last constructor param: `super(aggregateId, aggregateType, traceId)`
- All properties `readonly`; only primitives (serializable); never mutate after construction

### 2. Create subscriber: `src/core/application/<context>/<SubscriberName>.ts`

The subscriber is a use case that reacts to the event:
```typescript
import type { EventSubscriber } from "@/core/domain/event/EventSubscriber";
import type { DomainEvent } from "@/core/domain/event/DomainEvent";
import type { <EventName> } from "@/core/domain/event/<EventName>";

export class <SubscriberName> implements EventSubscriber {
  constructor(private readonly repo: SomeRepository) {}

  async handle(event: DomainEvent): Promise<void> {
    const typedEvent = event as <EventName>;
    // React to the event (e.g., persist analytics, send notification)
  }
}
```

### 3. Wire in `src/adapters/container.ts`

### 4. Emit from aggregate root

The aggregate root records the event, and the use case publishes it:
```typescript
// In the aggregate root entity:
class SomeAggregate {
  private domainEvents: DomainEvent[] = [];

  doSomething(): void {
    // ... business logic ...
    this.domainEvents.push(new <EventName>(/* ... */));
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }
}

// In the use case:
const events = aggregate.pullDomainEvents();
for (const event of events) {
  await this.eventBus.publish(event);
}
```

## Event Flow Summary

```
Use case calls aggregate method
  -> Aggregate records DomainEvent
  -> Use case pulls events from aggregate
  -> Use case publishes via EventBus port
  -> EventBus dispatches to registered subscribers
  -> Subscribers execute their logic
```

MVP implementation: `InMemoryEventBus` (sync, in-process).

## Analytics via Analytics Events

Every user action emits an `AnalyticsEvent` subclass (e.g., `DepartureSearched`, `LinesBrowsed`). A dedicated subscriber persists it to the `analytics_events` table. This enables analytics: most searched routes, peak times, per-station popularity.

Analytics events carry `userId?` (the internal UUID from `users` table) and `traceId?` (the request correlation UUID generated per Telegram update). These are passed from the handler context (`ctx.userId`, `ctx.requestId`) through the use case `execute()` signature.

Pattern: one event → one subscriber → one persistence call. Keep subscribers focused.

## DI Wiring for Events

Events are wired inside `createContainer()` in `src/adapters/container.ts`:

```typescript
export function createContainer(): Container {
  const env = loadSecrets();
  const sql = createSqlConnection(env.DATABASE_URL);
  const db = createDatabase(sql);

  // 1. Driven adapters
  const stationRepo = new StationRepositoryDrizzle(db);
  const domainEventRepo = new DomainEventRepositoryDrizzle(db);

  // 2. Subscribers (created BEFORE EventBus)
  const persistDomainEvents = new PersistDomainEventsSubscriber(domainEventRepo);
  const persistAnalyticsEvents = new PersistAnalyticsEventsSubscriber(analyticsEventRepo);
  const eventBus = new InMemoryEventBus([persistDomainEvents, persistAnalyticsEvents]);

  // 3. Use cases
  const searchNextDepartures = new SearchNextDepartures(stationRepo, eventBus);

  return { stationRepo, eventBus, db, dispose: () => sql.end() };
}
```

> Note: No `.subscribe()` method exists on `EventBus` or `InMemoryEventBus`. Two subscribers are registered at startup: `PersistDomainEventsSubscriber` (persists to `domain_events`) and `PersistAnalyticsEventsSubscriber` (persists to `analytics_events`). Each subscriber checks the event type and ignores events that don't concern it.

The `EventBus` port is defined in `core/domain/` and implemented in `adapters/out/`. Use cases receive it via constructor injection.
