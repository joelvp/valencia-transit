import type { Station } from "@/core/domain/station/Station";
import type { StationId } from "@/core/domain/station/StationId";
import type { UnmatchedLiveStation } from "./UnmatchedLiveStation";

export class LiveStationMappingReport {
  constructor(
    readonly mappedStationIds: readonly StationId[],
    readonly unmatchedLiveStations: readonly UnmatchedLiveStation[],
    readonly unmatchedStations: readonly Station[] = [],
  ) {}

  get mappedCount(): number {
    return this.mappedStationIds.length;
  }

  get hasIssues(): boolean {
    return this.unmatchedLiveStations.length > 0 || this.unmatchedStations.length > 0;
  }

  // Every station we own should get a live id; reports those that did not.
  withCoverageOf(stations: Station[]): LiveStationMappingReport {
    const missing = stations.filter((s) => !this.mappedStationIds.some((id) => id.equals(s.id)));
    return new LiveStationMappingReport(this.mappedStationIds, this.unmatchedLiveStations, missing);
  }
}
