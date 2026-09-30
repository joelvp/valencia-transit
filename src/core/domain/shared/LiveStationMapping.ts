import type { Station } from "@/core/domain/station/Station";
import type { LiveStationMappingReport } from "./LiveStationMappingReport";

/** Keeps a live-data provider's own station ids aligned with our stations. */
export interface LiveStationMapping {
  sync(stations: Station[]): Promise<LiveStationMappingReport>;
}
