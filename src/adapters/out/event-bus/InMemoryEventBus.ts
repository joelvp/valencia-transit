import type { DomainEvent } from "@/core/domain/event/DomainEvent";
import type { EventBus } from "@/core/domain/event/EventBus";
import type { EventSubscriber } from "@/core/domain/event/EventSubscriber";

export class InMemoryEventBus implements EventBus {
  constructor(private readonly subscribers: EventSubscriber[]) {}

  async publish(event: DomainEvent, traceId?: string): Promise<void> {
    for (const subscriber of this.subscribers) {
      await subscriber.handle(event, traceId);
    }
  }
}
