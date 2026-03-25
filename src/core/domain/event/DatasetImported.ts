import { DomainEvent } from "./DomainEvent.ts";
import { DomainEventType } from "./DomainEventType.ts";

export class DatasetImported extends DomainEvent {
  readonly eventName = DomainEventType.DATASET_IMPORTED;

  constructor(
    readonly feedId: string,
    readonly stationsCount: number,
    readonly linesCount: number,
    readonly schedulesCount: number,
    readonly tripsCount: number,
  ) {
    super(feedId, "feed");
  }
}
