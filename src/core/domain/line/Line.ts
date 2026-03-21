import type { LineId } from "./LineId.ts";
import type { LineName } from "./LineName.ts";
import type { LineStop } from "./LineStop.ts";
import type { LineColor } from "./LineColor.ts";
import type { StationId } from "../station/StationId.ts";

export class Line {
  constructor(
    readonly id: LineId,
    readonly name: LineName,
    readonly stops: LineStop[],
    readonly color: LineColor | null = null,
  ) {}

  getSequence(stationId: StationId): number | undefined {
    const stop = this.stops.find((s) => s.stationId.equals(stationId));
    return stop?.sequence;
  }

  stopsAfter(stationId: StationId): LineStop[] {
    const seq = this.getSequence(stationId);
    if (seq === undefined) {
      return [];
    }
    return this.stops.filter((s) => s.sequence > seq).sort((a, b) => a.sequence - b.sequence);
  }

  equals(other: Line): boolean {
    return this.id.equals(other.id);
  }
}
