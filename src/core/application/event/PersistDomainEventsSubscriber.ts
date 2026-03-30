import type { DomainEventRepository } from "@/core/domain/event/DomainEventRepository.ts";
import type { EventSubscriber } from "@/core/domain/event/EventSubscriber.ts";
import { DomainEvent } from "@/core/domain/event/DomainEvent.ts";
import type { AnalyticsEvent } from "@/core/domain/event/AnalyticsEvent.ts";

export class PersistDomainEventsSubscriber implements EventSubscriber {
  constructor(private readonly repository: DomainEventRepository) {}

  async handle(event: DomainEvent | AnalyticsEvent): Promise<void> {
    if (!(event instanceof DomainEvent)) return;
    await this.repository.save(event);
  }
}
