import { AnalyticsEvent } from "./AnalyticsEvent.ts";
import { AnalyticsEventType } from "./AnalyticsEventType.ts";

export class DepartureSearched extends AnalyticsEvent {
  readonly eventName = AnalyticsEventType.DEPARTURE_SEARCHED;

  constructor(
    readonly originStationId: string,
    readonly destinationStationId: string,
    readonly resultsCount: number,
    userId?: string,
    traceId?: string,
  ) {
    super(userId, traceId);
  }
}
