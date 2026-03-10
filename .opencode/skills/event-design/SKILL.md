---
name: event-design
description: Design and wire domain events with subscribers following the project event-driven pattern
---

# Event Design

Design and wire a domain event with its subscriber. This skill is used by the domain-expert agent when designing event-driven flows.

## Steps

### 1. Create event class: `src/core/domain/event/<EventName>.ts`

```typescript
import { DomainEvent } from "@/core/domain/event/DomainEvent";

export class <EventName> extends DomainEvent {
  readonly eventName = "<aggregate>.<past-tense-verb>";

  constructor(
    readonly relevantField1: string,
    readonly relevantField2: number,
    // ... only primitive types in events (serializable)
  ) {
    super();
  }
}
```

Rules:

- Event name format: `<aggregate>.<past-tense-verb>` (e.g., `departure.searched`, `dataset.imported`)
- Extend `DomainEvent` base class (provides `occurredOn`, `eventId`)
- Use only primitive types in constructor (events must be serializable)
- Events are immutable — all `readonly` properties

### 2. Create subscriber: `src/core/application/<context>/<SubscriberName>.ts`

The subscriber is a use case that reacts to the event:

```typescript
export class <SubscriberName> {
  constructor(private readonly repo: SomeRepository) {}

  async execute(event: <EventName>): Promise<void> {
    // React to the event (e.g., persist analytics, send notification)
  }
}
```

### 3. Wire in `src/config/container.ts`

```typescript
// In the event wiring section (step 3):
eventBus.subscribe("<aggregate>.<past-tense-verb>", new <SubscriberName>(repo));
```

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
