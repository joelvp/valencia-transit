import { AnalyticsEvent } from "./AnalyticsEvent.ts";
import { AnalyticsEventType } from "./AnalyticsEventType.ts";

export class LinesBrowsed extends AnalyticsEvent {
  readonly eventName = AnalyticsEventType.LINES_BROWSED;

  constructor(userId?: string, traceId?: string) {
    super(userId, traceId);
  }
}
