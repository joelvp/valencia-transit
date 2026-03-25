import type { DomainEvent } from "@/core/domain/event/DomainEvent";
import { DomainEventType } from "@/core/domain/event/DomainEventType";
import { StoredDomainEvent } from "@/core/domain/event/StoredDomainEvent";

type DomainEventRow = {
  id: number;
  type: string;
  occurredOn: Date;
  body: unknown;
  aggregateId: string | null;
  aggregateType: string | null;
  traceId: string | null;
};

type DomainEventInsert = {
  type: string;
  occurredOn: Date;
  body: Record<string, unknown>;
  aggregateId: string | null;
  aggregateType: string | null;
  traceId: string | null;
};

export const DomainEventMapper = {
  toDomain(row: DomainEventRow): StoredDomainEvent {
    return new StoredDomainEvent(
      row.id,
      row.type as DomainEventType,
      row.occurredOn,
      row.body as Record<string, unknown>,
      row.aggregateId,
      row.aggregateType,
      row.traceId,
    );
  },

  toPersistence(event: DomainEvent, traceId?: string): DomainEventInsert {
    return {
      type: event.eventName,
      occurredOn: event.occurredOn,
      body: { ...event } as Record<string, unknown>,
      aggregateId: event.aggregateId ?? null,
      aggregateType: event.aggregateType ?? null,
      traceId: traceId ?? null,
    };
  },
};
