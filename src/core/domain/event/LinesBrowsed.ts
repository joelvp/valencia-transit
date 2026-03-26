import { DomainEvent } from "./DomainEvent";
import { DomainEventType } from "./DomainEventType";

export class LinesBrowsed extends DomainEvent {
  readonly eventName = DomainEventType.LINES_BROWSED;

  constructor() {
    super();
  }
}
