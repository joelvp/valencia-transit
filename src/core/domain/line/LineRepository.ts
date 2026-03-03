import type { Line } from "./Line.ts";
import type { LineId } from "./LineId.ts";
import type { StationId } from "../station/StationId.ts";

export interface LineRepository {
  findById(id: LineId): Promise<Line | null>;
  findByStations(origin: StationId, destination: StationId): Promise<Line[]>;
  findAll(): Promise<Line[]>;
}
