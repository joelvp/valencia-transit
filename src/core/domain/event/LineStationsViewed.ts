import { DomainEvent } from "./DomainEvent";
import { DomainEventType } from "./DomainEventType";

export class LineStationsViewed extends DomainEvent {
  readonly eventName = DomainEventType.LINE_STATIONS_VIEWED;

  constructor(readonly lineId: string) {
    super(lineId, "line");
  }
}
