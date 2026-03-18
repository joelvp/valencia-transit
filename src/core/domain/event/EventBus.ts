import type { DomainEvent } from "./DomainEvent.ts";

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
}
