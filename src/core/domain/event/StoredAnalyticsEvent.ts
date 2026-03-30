import type { AnalyticsEventType } from "./AnalyticsEventType";

export class StoredAnalyticsEvent {
  constructor(
    readonly id: number,
    readonly type: AnalyticsEventType,
    readonly occurredOn: Date,
    readonly body: Record<string, unknown>,
    readonly aggregateId: string | null,
    readonly aggregateType: string | null,
    readonly traceId: string | null,
  ) {}
}
