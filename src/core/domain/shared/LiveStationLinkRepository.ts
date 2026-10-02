import type { StationId } from "@/core/domain/station/StationId";
import type { LiveStationLink } from "./LiveStationLink";

export interface LiveStationLinkRepository {
  replaceAll(links: LiveStationLink[]): Promise<void>;
  findLiveId(stationId: StationId): Promise<string | null>;
}
