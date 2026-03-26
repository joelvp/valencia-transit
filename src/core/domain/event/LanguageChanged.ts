import { DomainEvent } from "./DomainEvent";
import { DomainEventType } from "./DomainEventType";

export class LanguageChanged extends DomainEvent {
  readonly eventName = DomainEventType.LANGUAGE_CHANGED;

  constructor(
    readonly lang: string,
    readonly chatId: string,
  ) {
    super(chatId, "user");
  }
}
