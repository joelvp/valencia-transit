import type { DomainEventType } from "./DomainEventType";

export abstract class DomainEvent {
  readonly occurredOn: Date;
  abstract readonly eventName: DomainEventType;
  readonly aggregateId?: string;
  readonly aggregateType?: string;
  traceId?: string;

  constructor(aggregateId?: string, aggregateType?: string) {
    this.occurredOn = new Date();
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
  }
}
