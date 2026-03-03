import { InvalidArgumentError } from "../error/InvalidArgumentError.ts";

export class StationLocation {
  constructor(
    readonly latitude: number,
    readonly longitude: number,
  ) {
    if (latitude < -90 || latitude > 90) {
      throw new InvalidArgumentError(`Latitude must be between -90 and 90, got ${latitude}`);
    }
    if (longitude < -180 || longitude > 180) {
      throw new InvalidArgumentError(`Longitude must be between -180 and 180, got ${longitude}`);
    }
  }

  equals(other: StationLocation): boolean {
    return this.latitude === other.latitude && this.longitude === other.longitude;
  }
}
