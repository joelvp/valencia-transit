import type { DomainEvent } from "./DomainEvent";

export interface EventSubscriber {
  handle(event: DomainEvent): Promise<void>;
}
