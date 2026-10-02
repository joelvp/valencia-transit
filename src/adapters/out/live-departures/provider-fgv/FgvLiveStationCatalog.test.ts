import { describe, it, expect } from "bun:test";
import { FgvLiveStationCatalog } from "./FgvLiveStationCatalog";
import type { FgvStation } from "./FgvApiClient";

function makeCatalog(stations: FgvStation[]) {
  return new FgvLiveStationCatalog({ fetchStations: () => Promise.resolve(stations) });
}

describe("FgvLiveStationCatalog", () => {
  it("should map FGV stations to LiveStations with string ids and locations", async () => {
    const catalog = makeCatalog([
      { estacion_id_FGV: 51, nombre: "Colón", latitud: 39.47, longitud: -0.37 },
    ]);

    const result = await catalog.fetchAll();

    expect(result).toHaveLength(1);
    expect(result[0]!.liveId).toBe("51");
    expect(result[0]!.name).toBe("Colón");
    expect(result[0]!.location?.latitude).toBe(39.47);
    expect(result[0]!.location?.longitude).toBe(-0.37);
  });

  it("should use a null location when coordinates are invalid", async () => {
    const catalog = makeCatalog([
      { estacion_id_FGV: 7, nombre: "Rota", latitud: 999, longitud: -0.37 },
    ]);

    const result = await catalog.fetchAll();

    expect(result[0]!.location).toBeNull();
  });

  it("should return [] when FGV returns no stations", async () => {
    expect(await makeCatalog([]).fetchAll()).toEqual([]);
  });
});
