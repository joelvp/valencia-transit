import type { AnalyticsEventType } from "./AnalyticsEventType";

export abstract class AnalyticsEvent {
  readonly occurredOn: Date;
  abstract readonly eventName: AnalyticsEventType;
  readonly aggregateId?: string;
  readonly aggregateType?: string;
  traceId?: string;

  constructor(aggregateId?: string, aggregateType?: string) {
    this.occurredOn = new Date();
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
  }
}
