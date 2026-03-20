import type { Line } from "./Line.ts";
import type { LineId } from "./LineId.ts";
import type { StationId } from "../station/StationId.ts";

export interface LineRepository {
  findById(id: LineId): Promise<Line | null>;
  findByStations(origin: StationId, destination: StationId): Promise<Line[]>;
  findByStationId(stationId: StationId): Promise<Line[]>;
  findAll(): Promise<Line[]>;
  save(line: Line, feedId: string): Promise<void>;
  deleteByFeedId(feedId: string): Promise<void>;
}
