import type { DomainEvent } from "./DomainEvent";
import type { AnalyticsEvent } from "./AnalyticsEvent";

export interface EventSubscriber {
  handle(event: DomainEvent | AnalyticsEvent): Promise<void>;
}
