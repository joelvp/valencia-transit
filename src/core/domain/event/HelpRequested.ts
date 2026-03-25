import { DomainEvent } from "./DomainEvent.ts";
import { DomainEventType } from "./DomainEventType.ts";

export class HelpRequested extends DomainEvent {
  readonly eventName = DomainEventType.HELP_REQUESTED;

  constructor() {
    super();
  }
}
