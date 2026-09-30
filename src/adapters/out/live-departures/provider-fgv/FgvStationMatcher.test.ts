import { describe, it, expect } from "bun:test";
import { Station } from "@/core/domain/station/Station";
import { StationLocation } from "@/core/domain/station/StationLocation";
import type { FgvStation } from "./FgvApiClient";
import { FgvStationMatcher } from "./FgvStationMatcher";

const LAT = 39.47;
const LON = -0.37;

function ours(id: string, name: string, lat = LAT, lon = LON): Station {
  return Station.create(id, name, new StationLocation(lat, lon));
}

function fgv(id: number, nombre: string, latitud = LAT, longitud = LON): FgvStation {
  return { estacion_id_FGV: id, nombre, latitud, longitud };
}

describe("FgvStationMatcher", () => {
  const matcher = new FgvStationMatcher();

  it("should map a station with the same name within the distance limit", () => {
    const result = matcher.match([ours("s1", "Colón")], [fgv(10, "Colón", LAT + 0.0005)]);

    expect(result.mappings).toHaveLength(1);
    expect(result.mappings[0]!.stationId.value).toBe("s1");
    expect(result.mappings[0]!.fgvStationId).toBe(10);
    expect(result.unmatched).toEqual([]);
    expect(result.lowConfidence).toEqual([]);
  });

  it("should match names ignoring accents and case", () => {
    const result = matcher.match([ours("s1", "Xàtiva")], [fgv(1, "XATIVA")]);

    expect(result.mappings.map((m) => m.fgvStationId)).toEqual([1]);
  });

  it("should match names ignoring punctuation", () => {
    const result = matcher.match([ours("s1", "Sant Isidre")], [fgv(2, "Sant Isidre.")]);

    expect(result.mappings.map((m) => m.fgvStationId)).toEqual([2]);
  });

  it("should pick the closest station when several share the same normalized name", () => {
    const near = ours("near", "Alboraya", LAT + 0.001);
    const far = ours("far", "ALBORAYA", LAT + 0.003);

    const result = matcher.match([far, near], [fgv(3, "Alboraya")]);

    expect(result.mappings).toHaveLength(1);
    expect(result.mappings[0]!.stationId.value).toBe("near");
  });

  it("should flag low confidence and not map when the name matches but is too far", () => {
    const result = matcher.match([ours("s1", "Colón")], [fgv(4, "Colón", LAT + 0.01)]);

    expect(result.mappings).toEqual([]);
    expect(result.lowConfidence).toHaveLength(1);
    expect(result.lowConfidence[0]).toContain("Colón");
  });

  it("should report unmatched when no station has the name", () => {
    const result = matcher.match([ours("s1", "Colón")], [fgv(5, "Nowhere")]);

    expect(result.mappings).toEqual([]);
    expect(result.unmatched).toEqual(["Nowhere"]);
  });

  it("should flag low confidence without throwing on invalid FGV coordinates", () => {
    const result = matcher.match([ours("s1", "Colón")], [fgv(6, "Colón", 999)]);

    expect(result.mappings).toEqual([]);
    expect(result.lowConfidence).toHaveLength(1);
    expect(result.lowConfidence[0]).toContain("invalid coordinates");
  });

  it("should return empty results for empty inputs", () => {
    expect(matcher.match([], [])).toEqual({ mappings: [], unmatched: [], lowConfidence: [] });
  });
});
