import type { StationId } from "../station/StationId.ts";

export class LineStop {
  constructor(
    readonly stationId: StationId,
    readonly sequence: number,
  ) {}

  equals(other: LineStop): boolean {
    return this.stationId.equals(other.stationId) && this.sequence === other.sequence;
  }
}
