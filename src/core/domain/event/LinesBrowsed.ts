import { DomainEvent } from "./DomainEvent.ts";
import { DomainEventType } from "./DomainEventType.ts";

export class LinesBrowsed extends DomainEvent {
  readonly eventName = DomainEventType.LINES_BROWSED;

  constructor() {
    super();
  }
}
