import type { DomainEvent } from "./DomainEvent";
import type { DomainEventType } from "./DomainEventType";
import type { StoredDomainEvent } from "./StoredDomainEvent";

export interface DomainEventRepository {
  save(event: DomainEvent): Promise<void>;
  findAll(): Promise<StoredDomainEvent[]>;
  findByType(type: DomainEventType): Promise<StoredDomainEvent[]>;
  findByAggregateId(aggregateId: string): Promise<StoredDomainEvent[]>;
}
