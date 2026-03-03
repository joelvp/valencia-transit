import type { Station } from "./Station.ts";
import type { StationId } from "./StationId.ts";

export interface StationRepository {
  findById(id: StationId): Promise<Station | null>;
  findByName(name: string): Promise<Station | null>;
  searchByName(query: string): Promise<Station[]>;
  findAll(): Promise<Station[]>;
}
