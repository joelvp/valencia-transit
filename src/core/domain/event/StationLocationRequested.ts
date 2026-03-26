import { DomainEvent } from "./DomainEvent";
import { DomainEventType } from "./DomainEventType";

export class StationLocationRequested extends DomainEvent {
  readonly eventName = DomainEventType.STATION_LOCATION_REQUESTED;

  constructor(readonly stationId: string) {
    super(stationId, "station");
  }
}
