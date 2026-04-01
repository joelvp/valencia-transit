import { AnalyticsEvent } from "./AnalyticsEvent.ts";
import { AnalyticsEventType } from "./AnalyticsEventType.ts";

export class StationLocationRequested extends AnalyticsEvent {
  readonly eventName = AnalyticsEventType.STATION_LOCATION_REQUESTED;

  constructor(
    readonly stationId: string,
    userId?: string,
  ) {
    super(userId);
  }
}
