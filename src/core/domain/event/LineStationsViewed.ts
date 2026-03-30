import { AnalyticsEvent } from "./AnalyticsEvent";
import { AnalyticsEventType } from "./AnalyticsEventType";

export class LineStationsViewed extends AnalyticsEvent {
  readonly eventName = AnalyticsEventType.LINE_STATIONS_VIEWED;

  constructor(readonly lineId: string) {
    super(lineId, "line");
  }
}
