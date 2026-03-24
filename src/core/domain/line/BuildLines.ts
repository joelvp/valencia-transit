import type { Route } from "../route/Route.ts";
import type { Trip } from "../trip/Trip.ts";
import type { StationId } from "../station/StationId.ts";
import { Line } from "./Line.ts";
import { LineId } from "./LineId.ts";
import { LineName } from "./LineName.ts";
import { LineStop } from "./LineStop.ts";
import { LineColor } from "./LineColor.ts";
import { TransportType } from "../shared/TransportType.ts";

export class BuildLines {
  private static readonly LINE_COLORS: Record<string, string> = {
    "1": "FEC601",
    "2": "E60096",
    "3": "DD052C",
    "4": "014A99",
    "5": "008F71",
    "6": "8884BF",
    "7": "F28D01",
    "8": "82CEE6",
    "9": "B8804F",
    "10": "B7DD79",
  };

  static fromRoutesAndTrips(routes: Route[], trips: Trip[]): Line[] {
    // Step 1: Group routes by lineId
    const routesByLine = new Map<string, Route[]>();
    for (const route of routes) {
      const key = route.lineId.value;
      const existing = routesByLine.get(key);
      if (existing) {
        existing.push(route);
      } else {
        routesByLine.set(key, [route]);
      }
    }

    const lines: Line[] = [];

    for (const [lineIdValue, lineRoutes] of routesByLine) {
      // Step 2: Collect all trips for this line
      const routeIdSet = new Set(lineRoutes.map((r) => r.id.value));
      const lineTrips = trips.filter((t) => routeIdSet.has(t.routeId.value));

      if (lineTrips.length === 0) {
        continue;
      }

      // Step 3: Station coverage filter (≥15%)
      const stationTripCount = new Map<string, number>();
      for (const trip of lineTrips) {
        for (const pt of trip.passingTimes) {
          const sid = pt.stationId.value;
          stationTripCount.set(sid, (stationTripCount.get(sid) ?? 0) + 1);
        }
      }
      const threshold = lineTrips.length * 0.15;
      const coveredStationIds = new Set<string>(
        [...stationTripCount.entries()]
          .filter(([, count]) => count >= threshold)
          .map(([sid]) => sid),
      );

      // Step 4: Reference trip — longest (most passingTimes)
      const referenceTrip = lineTrips.reduce((best, trip) =>
        trip.passingTimes.length > best.passingTimes.length ? trip : best,
      );

      // Step 5: Build initial sequence from reference trip, filtered to covered stations
      const sequence: StationId[] = referenceTrip.passingTimes
        .slice()
        .sort((a, b) => a.sequence - b.sequence)
        .filter((pt) => coveredStationIds.has(pt.stationId.value))
        .map((pt) => pt.stationId);

      // Step 6: Insert branch stations (covered but not in reference trip)
      const sequenceIdSet = new Set(sequence.map((s) => s.value));
      const branchStations = [...coveredStationIds].filter((sid) => !sequenceIdSet.has(sid));

      for (const missingSid of branchStations) {
        let bestInsertAfter = -1;

        for (const trip of lineTrips) {
          const tripPts = trip.passingTimes.slice().sort((a, b) => a.sequence - b.sequence);
          const missingIdx = tripPts.findIndex((pt) => pt.stationId.value === missingSid);
          if (missingIdx === -1) continue;

          // Find closest station before the missing station that exists in sequence
          let prevIdx = -1;
          for (let i = missingIdx - 1; i >= 0; i--) {
            const idx = sequence.findIndex((s) => s.value === tripPts[i]!.stationId.value);
            if (idx !== -1) {
              prevIdx = idx;
              break;
            }
          }

          // Find closest station after the missing station that exists in sequence
          let nextIdx = -1;
          for (let i = missingIdx + 1; i < tripPts.length; i++) {
            const idx = sequence.findIndex((s) => s.value === tripPts[i]!.stationId.value);
            if (idx !== -1) {
              nextIdx = idx;
              break;
            }
          }

          let insertAfter: number;
          if (prevIdx !== -1 && nextIdx !== -1) {
            insertAfter = Math.min(prevIdx, nextIdx);
          } else if (prevIdx !== -1) {
            insertAfter = prevIdx;
          } else if (nextIdx !== -1) {
            insertAfter = nextIdx - 1;
          } else {
            continue;
          }

          if (insertAfter > bestInsertAfter) {
            bestInsertAfter = insertAfter;
          }
        }

        if (bestInsertAfter >= -1) {
          // Find the actual StationId object from any trip
          let stationIdObj: StationId | undefined;
          for (const trip of lineTrips) {
            const pt = trip.passingTimes.find((p) => p.stationId.value === missingSid);
            if (pt) {
              stationIdObj = pt.stationId;
              break;
            }
          }
          if (stationIdObj) {
            sequence.splice(bestInsertAfter + 1, 0, stationIdObj);
          }
        }
      }

      // Step 7: Create Line entity
      const lineStops = sequence.map((stationId, idx) => new LineStop(stationId, idx + 1));
      const lineId = new LineId(lineIdValue);
      const lineName = new LineName(`Línia ${lineIdValue}`);
      const colorHex = BuildLines.LINE_COLORS[lineIdValue];
      const lineColor = colorHex ? new LineColor(colorHex) : null;
      const transportType = lineRoutes[0]?.transportType ?? TransportType.METRO;

      lines.push(new Line(lineId, lineName, lineStops, lineColor, transportType));
    }

    return lines;
  }
}
