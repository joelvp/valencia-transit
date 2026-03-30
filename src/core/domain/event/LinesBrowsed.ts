import { AnalyticsEvent } from "./AnalyticsEvent";
import { AnalyticsEventType } from "./AnalyticsEventType";

export class LinesBrowsed extends AnalyticsEvent {
  readonly eventName = AnalyticsEventType.LINES_BROWSED;

  constructor() {
    super();
  }
}
