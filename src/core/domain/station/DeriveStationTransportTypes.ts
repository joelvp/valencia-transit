import type { Line } from "@/core/domain/line/Line";
import type { TransportType } from "@/core/domain/shared/TransportType";

export class DeriveStationTransportTypes {
  static fromLines(lines: Line[]): Map<string, TransportType[]> {
    const result = new Map<string, TransportType[]>();
    for (const line of lines) {
      for (const stop of line.stops) {
        const sid = stop.stationId.value;
        let types = result.get(sid);
        if (!types) {
          types = [];
          result.set(sid, types);
        }
        if (!types.some((t) => t.equals(line.transportType))) {
          types.push(line.transportType);
        }
      }
    }
    return result;
  }
}
