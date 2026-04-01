import { AnalyticsEvent } from "./AnalyticsEvent.ts";
import { AnalyticsEventType } from "./AnalyticsEventType.ts";

export class HelpRequested extends AnalyticsEvent {
  readonly eventName = AnalyticsEventType.HELP_REQUESTED;

  constructor(userId?: string, traceId?: string) {
    super(userId, traceId);
  }
}
