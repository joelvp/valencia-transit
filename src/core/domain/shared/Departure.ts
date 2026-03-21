import type { TimeOfDay } from "./TimeOfDay.ts";

export class Departure {
  readonly minutesRemaining: number;

  constructor(
    readonly departureTime: TimeOfDay,
    readonly lineName: string,
    readonly headsign: string | null,
    readonly currentTime: TimeOfDay,
    readonly lineColor: string | null = null,
    readonly durationMinutes: number | null = null,
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
