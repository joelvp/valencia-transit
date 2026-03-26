import type { StationId } from "@/core/domain/station/StationId";

export class LineStop {
  constructor(
    readonly stationId: StationId,
    readonly sequence: number,
  ) {}

  equals(other: LineStop): boolean {
    return this.stationId.equals(other.stationId) && this.sequence === other.sequence;
  }
}
