import type { DomainEvent } from "./DomainEvent";
import type { AnalyticsEvent } from "./AnalyticsEvent";

export interface EventBus {
  publish(event: DomainEvent | AnalyticsEvent): Promise<void>;
}
