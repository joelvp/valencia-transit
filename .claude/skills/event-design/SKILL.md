---
name: event-design
description: Design and wire domain events with subscribers following the project event-driven pattern
user-invocable: false
---

**MANDATORY FIRST STEP — run this before anything else:**
```bash
bun ./.claude/hooks/echo_skill_start.ts event-design
```

# Event Design

Design and wire a domain event with its subscriber. This skill is used by the domain-expert agent when designing event-driven flows.

## Steps

### 1. Create event class: `src/core/domain/event/<EventName>.ts`

```typescript
import { DomainEventType } from "@/core/domain/event/DomainEventType";
import { DomainEvent } from "@/core/domain/event/DomainEvent";

export class <EventName> extends DomainEvent {
  override readonly eventName = DomainEventType.<ENUM_VALUE>;

  constructor(
    readonly relevantField1: string,
    readonly relevantField2: number,
    // ... only primitive types (events must be serializable)
    override readonly aggregateId?: string,
    override readonly aggregateType?: string,
  ) {
    super();
  }
}
```

Rules:
- `eventName` must be a `DomainEventType` enum value (e.g., `DomainEventType.DATASET_IMPORTED`)
- Extend `DomainEvent` base class — provides `occurredOn` timestamp only (no `eventId`)
- Optionally set `aggregateId` / `aggregateType` for traceability
- All properties `readonly`; only primitives (serializable)

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

## Analytics via Domain Events

Every departure search emits `DepartureSearched`. A subscriber persists it to the `domain_events` Event Store table. This enables analytics: most searched routes, peak times, per-station popularity.

Pattern: one event -> one subscriber -> one persistence call. Keep subscribers focused.

## DI Wiring for Events

Events are wired in `src/adapters/container.ts` after use cases are instantiated:

```typescript
// 1. Driven adapters
const stationRepo = new StationRepositoryDrizzle(db);
const domainEventRepo = new DomainEventRepositoryDrizzle(db);

// 2. Subscribers (created BEFORE EventBus)
const subscribers: EventSubscriber[] = [
  new PersistAllEventsSubscriber(domainEventRepo),
  // add domain-specific subscribers here
];
const eventBus = new InMemoryEventBus(subscribers);

// 3. Use cases
const searchNextDepartures = new SearchNextDepartures(stationRepo, eventBus);

return { searchNextDepartures };
```

> Note: No `.subscribe()` method exists on `EventBus` or `InMemoryEventBus`. `PersistAllEventsSubscriber` (already in container) persists all events automatically.

The `EventBus` port is defined in `core/domain/` and implemented in `adapters/out/`. Use cases receive it via constructor injection.
