import { InvalidArgumentError } from "../error/InvalidArgumentError.ts";

const TIME_PATTERN = /^(\d{1,2}):(\d{2}):(\d{2})$/;

export class TimeOfDay {
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;

  constructor(readonly value: string) {
    const match = TIME_PATTERN.exec(value);
    if (!match) {
      throw new InvalidArgumentError(`TimeOfDay must be in HH:MM:SS format, got "${value}"`);
    }

    this.hours = parseInt(match[1]!, 10);
    this.minutes = parseInt(match[2]!, 10);
    this.seconds = parseInt(match[3]!, 10);

    if (this.minutes < 0 || this.minutes > 59) {
      throw new InvalidArgumentError(`Minutes must be 0-59, got ${this.minutes}`);
    }
    if (this.seconds < 0 || this.seconds > 59) {
      throw new InvalidArgumentError(`Seconds must be 0-59, got ${this.seconds}`);
    }
    // Hours can be > 23 for GTFS next-day trips (e.g., 25:30:00)
    if (this.hours < 0) {
      throw new InvalidArgumentError(`Hours cannot be negative, got ${this.hours}`);
    }
  }

  private toTotalSeconds(): number {
    return this.hours * 3600 + this.minutes * 60 + this.seconds;
  }

  isAfter(other: TimeOfDay): boolean {
    return this.toTotalSeconds() > other.toTotalSeconds();
  }

  isBefore(other: TimeOfDay): boolean {
    return this.toTotalSeconds() < other.toTotalSeconds();
  }

  minutesUntilFrom(from: TimeOfDay): number {
    const diffSeconds = this.toTotalSeconds() - from.toTotalSeconds();
    return Math.floor(diffSeconds / 60);
  }

  equals(other: TimeOfDay): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
