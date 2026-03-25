import type { Line } from "./Line.ts";
import type { StationId } from "../station/StationId.ts";

export interface LineRepository {
  saveMany(lines: Line[], feedId: string): Promise<void>;
  findAll(): Promise<Line[]>;
  findByStationIds(originId: StationId, destinationId: StationId): Promise<Line[]>;
  deleteByFeedId(feedId: string): Promise<void>;
}
