import type { Line } from "./Line";
import type { StationId } from "@/core/domain/station/StationId";

export interface LineRepository {
  saveMany(lines: Line[], feedId: string): Promise<void>;
  findAll(): Promise<Line[]>;
  findByStationIds(originId: StationId, destinationId: StationId): Promise<Line[]>;
  deleteByFeedId(feedId: string): Promise<void>;
}
