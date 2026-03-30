import type { AnalyticsEvent } from "./AnalyticsEvent";
import type { AnalyticsEventType } from "./AnalyticsEventType";
import type { StoredAnalyticsEvent } from "./StoredAnalyticsEvent";

export interface AnalyticsEventRepository {
  save(event: AnalyticsEvent): Promise<void>;
  findAll(): Promise<StoredAnalyticsEvent[]>;
  findByType(type: AnalyticsEventType): Promise<StoredAnalyticsEvent[]>;
  findByAggregateId(aggregateId: string): Promise<StoredAnalyticsEvent[]>;
}
