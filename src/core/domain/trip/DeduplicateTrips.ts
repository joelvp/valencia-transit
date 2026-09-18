import type { Trip } from "./Trip";

export class DeduplicateTrips {
  /**
   * Drops every trip that is a truncated copy of a longer one, keeping the one
   * that reaches the real terminus — see {@link Trip.isTruncatedCopyOf} for
   * what makes a trip a copy.
   *
   * Only trips sharing a service day and a first stop can be copies of each
   * other, so they are grouped by that before comparing.
   */
  static removeTruncatedCopies(trips: Trip[]): Trip[] {
    const groups = new Map<string, Trip[]>();
    for (const trip of trips) {
      const first = trip.firstStop();
      if (!first) continue;
      const key = `${trip.scheduleId.value}|${first.stationId.value}@${first.departureTime.value}`;
      const existing = groups.get(key);
      if (existing) {
        existing.push(trip);
      } else {
        groups.set(key, [trip]);
      }
    }

    const truncatedIds = new Set<string>();
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      for (const candidate of group) {
        const hasFullVersion = group.some(
          (other) => !other.equals(candidate) && candidate.isTruncatedCopyOf(other),
        );
        if (hasFullVersion) {
          truncatedIds.add(candidate.id.value);
        }
      }
    }

    return trips.filter((trip) => !truncatedIds.has(trip.id.value));
  }
}
