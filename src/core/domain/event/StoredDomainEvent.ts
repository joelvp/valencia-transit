import type { DomainEventType } from "./DomainEventType";

export class StoredDomainEvent {
  constructor(
    readonly id: number,
    readonly type: DomainEventType,
    readonly occurredOn: Date,
    readonly body: Record<string, unknown>,
    readonly aggregateId: string | null,
    readonly aggregateType: string | null,
    readonly traceId: string | null,
  ) {}
}
