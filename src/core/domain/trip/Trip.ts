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

  /**
   * True when this trip is the same run as `other`, published truncated at an
   * earlier station: same service day, and every stop and departure time
   * matches `other` up to where this one ends. FGV publishes these when a run
   * matches two official route patterns; their journey planner resolves the
   * full run, so the truncated copy is not a separate departure.
   */
  isTruncatedCopyOf(other: Trip): boolean {
    if (!this.scheduleId.equals(other.scheduleId)) return false;

    const own = this.stopsInSequence();
    const theirs = other.stopsInSequence();
    if (own.length >= theirs.length) return false;

    return own.every((stop, index) => {
      const counterpart = theirs[index]!;
      return (
        stop.stationId.equals(counterpart.stationId) &&
        stop.departureTime.equals(counterpart.departureTime)
      );
    });
  }

  firstStop(): PassingTime | undefined {
    return this.stopsInSequence()[0];
  }

  private stopsInSequence(): PassingTime[] {
    return [...this.passingTimes].sort((a, b) => a.sequence - b.sequence);
  }

  equals(other: Trip): boolean {
    return this.id.equals(other.id);
  }
}
