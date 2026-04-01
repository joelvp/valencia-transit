import { DomainEvent } from "./DomainEvent";
import { DomainEventType } from "./DomainEventType";

export class DatasetImported extends DomainEvent {
  readonly eventName = DomainEventType.DATASET_IMPORTED;

  constructor(
    readonly feedId: string,
    readonly stationsCount: number,
    readonly linesCount: number,
    readonly schedulesCount: number,
    readonly tripsCount: number,
    traceId?: string,
  ) {
    super(feedId, "feed", traceId);
  }
}
