import { DomainError } from "./DomainError.ts";

export class StationNotFoundError extends DomainError {
  readonly code = "STATION_NOT_FOUND";

  constructor(station: string) {
    super(`Station not found: "${station}"`);
  }
}
