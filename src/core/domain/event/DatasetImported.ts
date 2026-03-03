import { DomainEvent } from "./DomainEvent.ts";

export class DatasetImported extends DomainEvent {
  readonly eventName = "dataset.imported";

  constructor(
    readonly stationsCount: number,
    readonly linesCount: number,
    readonly tripsCount: number,
  ) {
    super();
  }
}
