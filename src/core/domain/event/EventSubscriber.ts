import type { DomainEvent } from "./DomainEvent.ts";

export interface EventSubscriber {
  handle(event: DomainEvent, traceId?: string): Promise<void>;
}
