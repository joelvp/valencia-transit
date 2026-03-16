import type { DomainEventType } from "./DomainEventType.ts";

export abstract class DomainEvent {
  readonly occurredOn: Date;
  abstract readonly eventName: DomainEventType;
  readonly aggregateId?: string;
  readonly aggregateType?: string;

  constructor() {
    this.occurredOn = new Date();
  }
}
