import type { AnalyticsEventType } from "./AnalyticsEventType.ts";

export abstract class AnalyticsEvent {
  readonly occurredOn: Date;
  abstract readonly eventName: AnalyticsEventType;
  readonly userId?: string;
  traceId?: string;

  constructor(userId?: string) {
    this.occurredOn = new Date();
    this.userId = userId;
  }
}
