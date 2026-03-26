import type { LineId } from "./LineId";
import type { LineName } from "./LineName";
import type { LineStop } from "./LineStop";
import type { LineColor } from "./LineColor";
import type { StationId } from "@/core/domain/station/StationId";
import { TransportType } from "@/core/domain/shared/TransportType";

export class Line {
  constructor(
    readonly id: LineId,
    readonly name: LineName,
    readonly stops: LineStop[],
    readonly color: LineColor | null = null,
    readonly transportType: TransportType = TransportType.METRO,
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
