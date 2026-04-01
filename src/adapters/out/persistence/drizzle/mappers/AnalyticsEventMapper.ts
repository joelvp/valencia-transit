import type { AnalyticsEvent } from "@/core/domain/event/AnalyticsEvent";
import type { AnalyticsEventType } from "@/core/domain/event/AnalyticsEventType";
import { StoredAnalyticsEvent } from "@/core/domain/event/StoredAnalyticsEvent";

type AnalyticsEventRow = {
  id: number;
  type: string;
  occurredOn: Date;
  body: unknown;
  aggregateId: string | null;
  aggregateType: string | null;
  traceId: string | null;
};

type AnalyticsEventInsert = {
  type: string;
  occurredOn: Date;
  body: Record<string, unknown>;
  aggregateId: string | null;
  aggregateType: string | null;
  traceId: string | null;
};

export const AnalyticsEventMapper = {
  toDomain(row: AnalyticsEventRow): StoredAnalyticsEvent {
    return new StoredAnalyticsEvent(
      row.id,
      row.type as AnalyticsEventType,
      row.occurredOn,
      row.body as Record<string, unknown>,
      row.aggregateId,
      row.traceId,
    );
  },

  toPersistence(event: AnalyticsEvent): AnalyticsEventInsert {
    return {
      type: event.eventName,
      occurredOn: event.occurredOn,
      body: { ...event } as Record<string, unknown>,
      aggregateId: event.userId ?? null,
      aggregateType: null,
      traceId: event.traceId ?? null,
    };
  },
};
