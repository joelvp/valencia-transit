import type { LiveStationCatalog } from "@/core/domain/shared/LiveStationCatalog";
import { LiveStation } from "@/core/domain/shared/LiveStation";
import { StationLocation } from "@/core/domain/station/StationLocation";
import type { FgvApiClient } from "./FgvApiClient";

/** Pure translation of FGV's station catalogue into domain LiveStations. */
export class FgvLiveStationCatalog implements LiveStationCatalog {
  constructor(private readonly client: Pick<FgvApiClient, "fetchStations">) {}

  async fetchAll(): Promise<LiveStation[]> {
    const stations = await this.client.fetchStations();
    return stations.map(
      (s) => new LiveStation(String(s.estacion_id_FGV), s.nombre, this.toLocation(s)),
    );
  }

  private toLocation(s: { latitud: number; longitud: number }): StationLocation | null {
    try {
      return new StationLocation(s.latitud, s.longitud);
    } catch {
      return null;
    }
  }
}
