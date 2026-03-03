import { StationId } from "./StationId.ts";
import { StationName } from "./StationName.ts";
import type { StationLocation } from "./StationLocation.ts";

export class Station {
  constructor(
    readonly id: StationId,
    readonly name: StationName,
    readonly location: StationLocation,
  ) {}

  static create(id: string, name: string, location: StationLocation): Station {
    return new Station(new StationId(id), new StationName(name), location);
  }

  equals(other: Station): boolean {
    return this.id.equals(other.id);
  }
}
