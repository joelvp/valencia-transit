import { AnalyticsEvent } from "./AnalyticsEvent.ts";
import { AnalyticsEventType } from "./AnalyticsEventType.ts";

export class LineStationsViewed extends AnalyticsEvent {
  readonly eventName = AnalyticsEventType.LINE_STATIONS_VIEWED;

  constructor(
    readonly lineId: string,
    userId?: string,
    traceId?: string,
  ) {
    super(userId, traceId);
  }
}
