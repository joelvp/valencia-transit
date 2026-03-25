import type { StationId } from "../station/StationId.ts";

export class RouteStation {
  constructor(readonly stationId: StationId) {}

  equals(other: RouteStation): boolean {
    return this.stationId.equals(other.stationId);
  }
}
