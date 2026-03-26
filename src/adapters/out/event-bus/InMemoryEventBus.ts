import type { DomainEvent } from "@/core/domain/event/DomainEvent";
import type { EventBus } from "@/core/domain/event/EventBus";
import type { EventSubscriber } from "@/core/domain/event/EventSubscriber";
import { logger } from "@/config/logger";

export class InMemoryEventBus implements EventBus {
  constructor(private readonly subscribers: EventSubscriber[]) {}

  async publish(event: DomainEvent): Promise<void> {
    for (const subscriber of this.subscribers) {
      await subscriber
        .handle(event)
        .catch((err) => logger.error({ event: event.eventName, err }, "Event subscriber failed"));
    }
  }
}
