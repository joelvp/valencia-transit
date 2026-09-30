import { InvalidArgumentError } from "@/core/domain/error/InvalidArgumentError";

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

  /** Great-circle distance in meters (haversine). */
  distanceTo(other: StationLocation): number {
    const toRad = (deg: number): number => (deg * Math.PI) / 180;
    const dLat = toRad(other.latitude - this.latitude);
    const dLon = toRad(other.longitude - this.longitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(this.latitude)) * Math.cos(toRad(other.latitude)) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(a));
  }
}
