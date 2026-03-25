import type { Station } from "./Station.ts";
import type { StationId } from "./StationId.ts";
import type { TransportType } from "../shared/TransportType.ts";

export interface StationRepository {
  findById(id: StationId): Promise<Station | null>;
  findByName(name: string): Promise<Station | null>;
  searchByName(query: string): Promise<Station[]>;
  findAll(): Promise<Station[]>;
  save(station: Station, feedId: string): Promise<void>;
  saveAll(stations: Station[], feedId: string): Promise<void>;
  deleteByFeedId(feedId: string): Promise<void>;
  updateTransportTypes(
    transportTypesByStation: Map<string, TransportType[]>,
    feedId: string,
  ): Promise<void>;
}
