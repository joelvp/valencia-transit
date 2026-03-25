import { DomainEvent } from "./DomainEvent.ts";
import { DomainEventType } from "./DomainEventType.ts";

export class LineStationsViewed extends DomainEvent {
  readonly eventName = DomainEventType.LINE_STATIONS_VIEWED;

  constructor(readonly lineId: string) {
    super();
  }
}
