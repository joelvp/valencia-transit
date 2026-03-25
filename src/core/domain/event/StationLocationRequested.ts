import { DomainEvent } from "./DomainEvent.ts";
import { DomainEventType } from "./DomainEventType.ts";

export class StationLocationRequested extends DomainEvent {
  readonly eventName = DomainEventType.STATION_LOCATION_REQUESTED;

  constructor(
    readonly latitude: number,
    readonly longitude: number,
  ) {
    super();
  }
}
