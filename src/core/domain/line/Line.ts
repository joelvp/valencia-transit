import type { LineId } from "./LineId.ts";
import type { LineName } from "./LineName.ts";
import type { LineDirection } from "./LineDirection.ts";
import type { LineStop } from "./LineStop.ts";
import type { StationId } from "../station/StationId.ts";

export class Line {
  constructor(
    readonly id: LineId,
    readonly name: LineName,
    readonly direction: LineDirection,
    readonly stops: LineStop[],
  ) {}

  connectsInOrder(origin: StationId, destination: StationId): boolean {
    const originSeq = this.getSequence(origin);
    const destSeq = this.getSequence(destination);
    if (originSeq === undefined || destSeq === undefined) {
      return false;
    }
    return originSeq < destSeq;
  }

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
