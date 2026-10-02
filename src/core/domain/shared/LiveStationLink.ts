import { InvalidArgumentError } from "@/core/domain/error/InvalidArgumentError";
import type { StationId } from "@/core/domain/station/StationId";

export class LiveStationLink {
  constructor(
    readonly stationId: StationId,
    readonly liveId: string,
  ) {
    if (liveId.trim() === "") throw new InvalidArgumentError("LiveStationLink liveId is empty");
  }
}
