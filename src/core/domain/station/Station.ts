import { StationId } from "./StationId.ts";
import { StationName } from "./StationName.ts";
import type { StationLocation } from "./StationLocation.ts";
import type { TransportType } from "../shared/TransportType.ts";

export class Station {
  constructor(
    readonly id: StationId,
    readonly name: StationName,
    readonly location: StationLocation,
    readonly transportType: TransportType,
  ) {}

  static create(
    id: string,
    name: string,
    location: StationLocation,
    transportType: TransportType,
  ): Station {
    return new Station(new StationId(id), new StationName(name), location, transportType);
  }

  equals(other: Station): boolean {
    return this.id.equals(other.id);
  }
}
