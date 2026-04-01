import type { AnalyticsEvent } from "./AnalyticsEvent.ts";
import type { AnalyticsEventType } from "./AnalyticsEventType.ts";
import type { StoredAnalyticsEvent } from "./StoredAnalyticsEvent.ts";

export interface AnalyticsEventRepository {
  save(event: AnalyticsEvent): Promise<void>;
  findAll(): Promise<StoredAnalyticsEvent[]>;
  findByType(type: AnalyticsEventType): Promise<StoredAnalyticsEvent[]>;
  findByUserId(userId: string): Promise<StoredAnalyticsEvent[]>;
}
