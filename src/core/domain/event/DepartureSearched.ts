import { DomainEvent } from "./DomainEvent.ts";
import { DomainEventType } from "./DomainEventType.ts";

export class DepartureSearched extends DomainEvent {
  readonly eventName = DomainEventType.DEPARTURE_SEARCHED;

  constructor(
    readonly originStationId: string,
    readonly destinationStationId: string,
    readonly resultsCount: number,
  ) {
    super(`${originStationId}-${destinationStationId}`, "route");
  }
}
