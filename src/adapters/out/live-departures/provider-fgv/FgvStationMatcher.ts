import type { Station } from "@/core/domain/station/Station";
import { StationLocation } from "@/core/domain/station/StationLocation";
import type { FgvStation } from "./FgvApiClient";
import type { FgvStationIdMapping } from "./FgvStationIdStore";

// Confidently-matched pairs (same normalized name) sit a few meters apart in practice — this only
// guards against a coincidental name collision pointing at the wrong physical station.
export const MAX_MATCH_DISTANCE_METERS = 500;

export interface FgvStationMatchResult {
  mappings: FgvStationIdMapping[];
  unmatched: string[];
  lowConfidence: string[];
}

/** Pure matching of our stations to FGV's by normalized name + coordinate proximity. */
export class FgvStationMatcher {
  match(ourStations: Station[], fgvStations: FgvStation[]): FgvStationMatchResult {
    const byNormalizedName = new Map<string, Station[]>();
    for (const station of ourStations) {
      const key = normalize(station.name.value);
      const bucket = byNormalizedName.get(key) ?? [];
      bucket.push(station);
      byNormalizedName.set(key, bucket);
    }

    const mappings: FgvStationIdMapping[] = [];
    const unmatched: string[] = [];
    const lowConfidence: string[] = [];

    for (const fgv of fgvStations) {
      const candidates = byNormalizedName.get(normalize(fgv.nombre)) ?? [];

      if (candidates.length === 0) {
        unmatched.push(fgv.nombre);
        continue;
      }

      const fgvLocation = toLocation(fgv);
      if (!fgvLocation) {
        lowConfidence.push(`${fgv.nombre} (fgv_id=${fgv.estacion_id_FGV}) — invalid coordinates`);
        continue;
      }

      const closest = candidates.reduce(
        (best, candidate) => {
          const distance = fgvLocation.distanceTo(candidate.location);
          return distance < best.distance ? { candidate, distance } : best;
        },
        { candidate: candidates[0]!, distance: Infinity },
      );

      if (closest.distance > MAX_MATCH_DISTANCE_METERS) {
        lowConfidence.push(
          `${fgv.nombre} (fgv_id=${fgv.estacion_id_FGV}) — closest name match "${closest.candidate.name.value}" is ${closest.distance.toFixed(0)}m away`,
        );
        continue;
      }

      mappings.push({ stationId: closest.candidate.id, fgvStationId: fgv.estacion_id_FGV });
    }

    return { mappings, unmatched, lowConfidence };
  }
}

function toLocation(fgv: FgvStation): StationLocation | null {
  try {
    return new StationLocation(fgv.latitud, fgv.longitud);
  } catch {
    return null;
  }
}

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ·'.]/g, "")
    .toLowerCase()
    .trim();
}
