import type { AnalyticsEventType } from "./AnalyticsEventType.ts";

export class StoredAnalyticsEvent {
  constructor(
    readonly id: number,
    readonly type: AnalyticsEventType,
    readonly occurredOn: Date,
    readonly body: Record<string, unknown>,
    readonly userId: string | null,
    readonly traceId: string | null,
  ) {}
}
