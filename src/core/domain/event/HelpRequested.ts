import { AnalyticsEvent } from "./AnalyticsEvent";
import { AnalyticsEventType } from "./AnalyticsEventType";

export class HelpRequested extends AnalyticsEvent {
  readonly eventName = AnalyticsEventType.HELP_REQUESTED;

  constructor() {
    super();
  }
}
