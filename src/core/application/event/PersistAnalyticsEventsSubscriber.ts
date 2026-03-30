import type { AnalyticsEventRepository } from "@/core/domain/event/AnalyticsEventRepository.ts";
import type { EventSubscriber } from "@/core/domain/event/EventSubscriber.ts";
import { AnalyticsEvent } from "@/core/domain/event/AnalyticsEvent.ts";
import type { DomainEvent } from "@/core/domain/event/DomainEvent.ts";

export class PersistAnalyticsEventsSubscriber implements EventSubscriber {
  constructor(private readonly repository: AnalyticsEventRepository) {}

  async handle(event: DomainEvent | AnalyticsEvent): Promise<void> {
    if (!(event instanceof AnalyticsEvent)) return;
    await this.repository.save(event);
  }
}
