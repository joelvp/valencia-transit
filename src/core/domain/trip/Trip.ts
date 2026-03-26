import type { TripId } from "./TripId";
import type { RouteId } from "@/core/domain/route/RouteId";
import type { ScheduleId } from "@/core/domain/schedule/ScheduleId";
import type { PassingTime } from "./PassingTime";
import type { StationId } from "@/core/domain/station/StationId";
import type { TimeOfDay } from "@/core/domain/shared/TimeOfDay";

export class Trip {
  constructor(
    readonly id: TripId,
    readonly routeId: RouteId,
    readonly scheduleId: ScheduleId,
    readonly passingTimes: PassingTime[],
    readonly headsign: string | null = null,
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
