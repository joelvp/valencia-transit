import type { StationId } from "@/core/domain/station/StationId";

/** Adapter-internal mapping between our station ids and FGV's own numeric estacion_id. */
export interface FgvStationIdMapping {
  stationId: StationId;
  fgvStationId: number;
}

/** Port owned by the FGV adapters; persistence implements it. */
export interface FgvStationIdStore {
  findFgvStationId(stationId: StationId, feedId: string): Promise<number | null>;
  saveAll(mappings: FgvStationIdMapping[], feedId: string): Promise<void>;
}
