import type { TimeOfDay } from "./TimeOfDay";

/** Provenance of a Departure: fetched from a real-time provider, or derived from GTFS-static schedule. */
export type DepartureSource = "live" | "scheduled";

export class Departure {
  readonly minutesRemaining: number;

  constructor(
    readonly departureTime: TimeOfDay,
    readonly lineName: string | null,
    readonly headsign: string | null,
    readonly currentTime: TimeOfDay,
    readonly lineColor: string | null = null,
    readonly durationMinutes: number | null = null,
    readonly source: DepartureSource = "scheduled",
  ) {
    this.minutesRemaining = departureTime.minutesUntilFrom(currentTime);
  }

  equals(other: Departure): boolean {
    return (
      this.departureTime.equals(other.departureTime) &&
      this.lineName === other.lineName &&
      this.headsign === other.headsign
    );
  }
}
