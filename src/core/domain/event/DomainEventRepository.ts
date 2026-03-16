import type { DomainEvent } from "./DomainEvent.ts";
import type { DomainEventType } from "./DomainEventType.ts";
import type { StoredDomainEvent } from "./StoredDomainEvent.ts";

export interface DomainEventRepository {
  save(event: DomainEvent): Promise<void>;
  findAll(): Promise<StoredDomainEvent[]>;
  findByType(type: DomainEventType): Promise<StoredDomainEvent[]>;
  findByAggregateId(aggregateId: string): Promise<StoredDomainEvent[]>;
}
