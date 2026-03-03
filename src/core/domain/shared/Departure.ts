import type { LineDirection } from "../line/LineDirection.ts";
import type { TimeOfDay } from "./TimeOfDay.ts";

export class Departure {
  readonly minutesRemaining: number;

  constructor(
    readonly departureTime: TimeOfDay,
    readonly lineName: string,
    readonly direction: LineDirection,
    readonly currentTime: TimeOfDay,
  ) {
    this.minutesRemaining = departureTime.minutesUntilFrom(currentTime);
  }

  equals(other: Departure): boolean {
    return (
      this.departureTime.equals(other.departureTime) &&
      this.lineName === other.lineName &&
      this.direction === other.direction
    );
  }
}
