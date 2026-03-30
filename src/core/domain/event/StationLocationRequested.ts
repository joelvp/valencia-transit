import { AnalyticsEvent } from "./AnalyticsEvent";
import { AnalyticsEventType } from "./AnalyticsEventType";

export class StationLocationRequested extends AnalyticsEvent {
  readonly eventName = AnalyticsEventType.STATION_LOCATION_REQUESTED;

  constructor(readonly stationId: string) {
    super(stationId, "station");
  }
}
