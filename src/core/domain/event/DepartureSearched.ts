import { AnalyticsEvent } from "./AnalyticsEvent";
import { AnalyticsEventType } from "./AnalyticsEventType";

export class DepartureSearched extends AnalyticsEvent {
  readonly eventName = AnalyticsEventType.DEPARTURE_SEARCHED;

  constructor(
    readonly originStationId: string,
    readonly destinationStationId: string,
    readonly resultsCount: number,
  ) {
    super(`${originStationId}-${destinationStationId}`, "route");
  }
}
