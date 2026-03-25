import type { DomainEventRepository } from "@/core/domain/event/DomainEventRepository.ts";
import type { EventSubscriber } from "@/core/domain/event/EventSubscriber.ts";
import type { DomainEvent } from "@/core/domain/event/DomainEvent.ts";

export class PersistAllEventsSubscriber implements EventSubscriber {
  constructor(private readonly repository: DomainEventRepository) {}

  async handle(event: DomainEvent, traceId?: string): Promise<void> {
    await this.repository.save(event, traceId);
  }
}
