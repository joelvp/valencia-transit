import { UnmatchedLiveStation } from "@/core/domain/shared/UnmatchedLiveStation";
import { UnmatchedLiveStationReason } from "@/core/domain/shared/UnmatchedLiveStationReason";
import type { Station } from "@/core/domain/station/Station";
import { StationLocation } from "@/core/domain/station/StationLocation";
import type { FgvStation } from "./FgvApiClient";
import type { FgvStationIdMapping } from "./FgvStationIdStore";

// Confidently-matched pairs (same normalized name) sit a few meters apart in practice — this only
// guards against a coincidental name collision pointing at the wrong physical station.
export const MAX_MATCH_DISTANCE_METERS = 500;

export interface FgvStationMatchResult {
  mappings: FgvStationIdMapping[];
  unmatchedLiveStations: UnmatchedLiveStation[];
}

interface Claim {
  mapping: FgvStationIdMapping;
  fgv: FgvStation;
  distance: number;
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

    // One claim per our station: when two FGV stations resolve to it, the closer one wins.
    const claims = new Map<string, Claim>();
    const unmatchedLiveStations: UnmatchedLiveStation[] = [];
    const reject = (fgv: FgvStation, reason: UnmatchedLiveStationReason) =>
      unmatchedLiveStations.push(
        new UnmatchedLiveStation(fgv.nombre, String(fgv.estacion_id_FGV), reason),
      );

    for (const fgv of fgvStations) {
      const candidates = byNormalizedName.get(normalize(fgv.nombre)) ?? [];

      if (candidates.length === 0) {
        reject(fgv, UnmatchedLiveStationReason.NO_NAME_MATCH);
        continue;
      }

      const fgvLocation = toLocation(fgv);
      if (!fgvLocation) {
        reject(fgv, UnmatchedLiveStationReason.INVALID_COORDINATES);
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
        reject(fgv, UnmatchedLiveStationReason.TOO_FAR);
        continue;
      }

      const key = closest.candidate.id.value;
      const claim: Claim = {
        mapping: { stationId: closest.candidate.id, fgvStationId: fgv.estacion_id_FGV },
        fgv,
        distance: closest.distance,
      };
      const existing = claims.get(key);
      if (!existing) {
        claims.set(key, claim);
      } else if (claim.distance < existing.distance) {
        reject(existing.fgv, UnmatchedLiveStationReason.DUPLICATE);
        claims.set(key, claim);
      } else {
        reject(fgv, UnmatchedLiveStationReason.DUPLICATE);
      }
    }

    return { mappings: [...claims.values()].map((c) => c.mapping), unmatchedLiveStations };
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
