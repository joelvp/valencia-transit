import type { Station } from "@/core/domain/station/Station";
import { LiveStationLink } from "./LiveStationLink";
import type { LiveStation } from "./LiveStation";
import { UnmatchedLiveStation } from "./UnmatchedLiveStation";
import { UnmatchedLiveStationReason } from "./UnmatchedLiveStationReason";

// Same-name pairs sit a few meters apart in practice — this only guards against name collisions.
export const MAX_MATCH_DISTANCE_METERS = 500;

export interface LiveStationMatchResult {
  links: LiveStationLink[];
  unmatchedLiveStations: UnmatchedLiveStation[];
}

interface Claim {
  link: LiveStationLink;
  live: LiveStation;
  distance: number;
}

/** Matches our stations to a provider's by normalized name + coordinate proximity. */
export class MatchLiveStations {
  static match(stations: Station[], liveStations: LiveStation[]): LiveStationMatchResult {
    const byNormalizedName = new Map<string, Station[]>();
    for (const station of stations) {
      const key = normalize(station.name.value);
      const bucket = byNormalizedName.get(key) ?? [];
      bucket.push(station);
      byNormalizedName.set(key, bucket);
    }

    // One claim per our station: when two live stations resolve to it, the closer one wins.
    const claims = new Map<string, Claim>();
    const unmatchedLiveStations: UnmatchedLiveStation[] = [];
    const reject = (live: LiveStation, reason: UnmatchedLiveStationReason) =>
      unmatchedLiveStations.push(new UnmatchedLiveStation(live.name, live.liveId, reason));

    for (const live of liveStations) {
      const candidates = byNormalizedName.get(normalize(live.name)) ?? [];

      if (candidates.length === 0) {
        reject(live, UnmatchedLiveStationReason.NO_NAME_MATCH);
        continue;
      }

      const liveLocation = live.location;
      if (!liveLocation) {
        reject(live, UnmatchedLiveStationReason.INVALID_COORDINATES);
        continue;
      }

      const closest = candidates.reduce(
        (best, candidate) => {
          const distance = liveLocation.distanceTo(candidate.location);
          return distance < best.distance ? { candidate, distance } : best;
        },
        { candidate: candidates[0]!, distance: Infinity },
      );

      if (closest.distance > MAX_MATCH_DISTANCE_METERS) {
        reject(live, UnmatchedLiveStationReason.TOO_FAR);
        continue;
      }

      const key = closest.candidate.id.value;
      const claim: Claim = {
        link: new LiveStationLink(closest.candidate.id, live.liveId),
        live,
        distance: closest.distance,
      };
      const existing = claims.get(key);
      if (!existing) {
        claims.set(key, claim);
      } else if (claim.distance < existing.distance) {
        reject(existing.live, UnmatchedLiveStationReason.DUPLICATE);
        claims.set(key, claim);
      } else {
        reject(live, UnmatchedLiveStationReason.DUPLICATE);
      }
    }

    return { links: [...claims.values()].map((c) => c.link), unmatchedLiveStations };
  }
}

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ·'.]/g, "")
    .toLowerCase()
    .trim();
}
