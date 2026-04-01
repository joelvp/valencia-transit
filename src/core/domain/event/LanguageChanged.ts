import { DomainEvent } from "./DomainEvent.ts";
import { DomainEventType } from "./DomainEventType.ts";

export class LanguageChanged extends DomainEvent {
  readonly eventName = DomainEventType.LANGUAGE_CHANGED;

  constructor(
    readonly lang: string,
    readonly userId: string,
    traceId?: string,
  ) {
    super(userId, "user", traceId);
  }
}
