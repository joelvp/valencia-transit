import type { TripId } from "./TripId.ts";
import type { LineId } from "../line/LineId.ts";
import type { ScheduleId } from "../schedule/ScheduleId.ts";
import type { LineDirection } from "../line/LineDirection.ts";
import type { PassingTime } from "./PassingTime.ts";
import type { StationId } from "../station/StationId.ts";
import type { TimeOfDay } from "../shared/TimeOfDay.ts";

export class Trip {
  constructor(
    readonly id: TripId,
    readonly lineId: LineId,
    readonly scheduleId: ScheduleId,
    readonly direction: LineDirection,
    readonly passingTimes: PassingTime[],
  ) {}

  getDepartureTimeAt(stationId: StationId): TimeOfDay | undefined {
    const pt = this.passingTimes.find((p) => p.stationId.equals(stationId));
    return pt?.departureTime;
  }

  passesThrough(stationId: StationId): boolean {
    return this.passingTimes.some((p) => p.stationId.equals(stationId));
  }

  stopsInOrder(origin: StationId, destination: StationId): boolean {
    const originPt = this.passingTimes.find((p) => p.stationId.equals(origin));
    const destPt = this.passingTimes.find((p) => p.stationId.equals(destination));
    if (!originPt || !destPt) {
      return false;
    }
    return originPt.sequence < destPt.sequence;
  }

  equals(other: Trip): boolean {
    return this.id.equals(other.id);
  }
}
