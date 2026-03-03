import type { DomainEvent } from "./DomainEvent.ts";

export type EventHandler = (event: DomainEvent) => void | Promise<void>;

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventName: string, handler: EventHandler): void;
}
