import { DomainEvent } from "./DomainEvent";
import { DomainEventType } from "./DomainEventType";

export class HelpRequested extends DomainEvent {
  readonly eventName = DomainEventType.HELP_REQUESTED;

  constructor() {
    super();
  }
}
