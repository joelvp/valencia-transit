import type { StationId } from "@/core/domain/station/StationId";

export class RouteStation {
  constructor(readonly stationId: StationId) {}

  equals(other: RouteStation): boolean {
    return this.stationId.equals(other.stationId);
  }
}
