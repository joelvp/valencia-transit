import type { StationId } from "@/core/domain/station/StationId";
import type { LiveArrival } from "@/core/domain/shared/LiveArrival";

/** Optional real-time data source. GTFS-static stays the source of truth for line/direction; this only supplies fresher minutes-remaining. */
export interface LiveDepartureProvider {
  findLiveArrivals(stationId: StationId, now: Date): Promise<LiveArrival[]>;
}
