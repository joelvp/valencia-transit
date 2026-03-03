import { DomainEvent } from "./DomainEvent.ts";

export class DepartureSearched extends DomainEvent {
  readonly eventName = "departure.searched";

  constructor(
    readonly originStationId: string,
    readonly destinationStationId: string,
    readonly resultsCount: number,
  ) {
    super();
  }
}
