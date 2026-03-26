import { StationId } from "./StationId";
import { StationName } from "./StationName";
import type { StationLocation } from "./StationLocation";
import type { TransportType } from "@/core/domain/shared/TransportType";

export class Station {
  constructor(
    readonly id: StationId,
    readonly name: StationName,
    readonly location: StationLocation,
    readonly transportTypes: TransportType[] = [],
  ) {}

  static create(
    id: string,
    name: string,
    location: StationLocation,
    transportTypes: TransportType[] = [],
  ): Station {
    return new Station(new StationId(id), new StationName(name), location, transportTypes);
  }

  equals(other: Station): boolean {
    return this.id.equals(other.id);
  }
}
