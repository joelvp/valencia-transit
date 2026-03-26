import type { StationId } from "@/core/domain/station/StationId";
import type { TimeOfDay } from "@/core/domain/shared/TimeOfDay";

export class PassingTime {
  constructor(
    readonly stationId: StationId,
    readonly arrivalTime: TimeOfDay,
    readonly departureTime: TimeOfDay,
    readonly sequence: number,
  ) {}

  equals(other: PassingTime): boolean {
    return (
      this.stationId.equals(other.stationId) &&
      this.arrivalTime.equals(other.arrivalTime) &&
      this.departureTime.equals(other.departureTime) &&
      this.sequence === other.sequence
    );
  }
}
